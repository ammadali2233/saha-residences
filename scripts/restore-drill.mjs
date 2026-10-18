// Backup restore drill (D-004). Proves a data dump restores onto a database rebuilt from our migrations.
//
// Local (default):  node scripts/restore-drill.mjs
//   counts rows -> dumps data -> resets the local DB without seed -> restores -> compares counts.
//   Uses the local Supabase stack, so the sample data is put back exactly as it was.
// CI (monthly):     node scripts/restore-drill.mjs --data restore/data.sql --expected restore/counts.json
//   restores a decrypted production dump into the fresh CI database and compares to counts saved at backup time.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const TABLES = ['bookings', 'payments', 'expenses', 'guests', 'capital_contributions', 'audit_log'];
const CONTAINER = 'supabase_db_saha';
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, a, i, all) => (a.startsWith('--') ? [...pairs, [a.slice(2), all[i + 1]]] : pairs), []),
);

// No shell: arguments go to each program verbatim on every platform.
const run = (cmd, argv) => execFileSync(cmd, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const SUPABASE_CLI = resolve('node_modules/supabase/dist/supabase.js');
const npx = (argv) => run(process.execPath, [SUPABASE_CLI, ...argv]);
const sql = (query) => run('docker', ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-c', query]).trim();

function counts() {
  const q = TABLES.map((t) => `select '${t}' t, count(*) n from public.${t}`).join(' union all ');
  return JSON.parse(sql(`select json_object_agg(t, n) from (${q}) s`));
}

function restore(dataFile) {
  run('docker', ['cp', resolve(dataFile), `${CONTAINER}:/tmp/restore.sql`]);
  // Triggers stay off during the load so restoring rows doesn't write duplicate audit entries.
  run('docker', ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '--single-transaction',
    '-c', 'set session_replication_role = replica', '-f', '/tmp/restore.sql']);
}

let expected;
let dataFile = args.data;
if (dataFile) {
  expected = JSON.parse(readFileSync(args.expected, 'utf8'));
} else {
  expected = counts();
  const dir = mkdtempSync(join(tmpdir(), 'saha-drill-'));
  dataFile = join(dir, 'data.sql');
  console.log('drill: dumping local data');
  // public = business data, auth = logins and MFA factors. Storage files are backed up as files, not rows.
  npx(['db', 'dump', '--local', '--data-only', '--use-copy', '-s', 'public,auth', '-f', dataFile]);
  writeFileSync(join(dir, 'counts.json'), JSON.stringify(expected));
  console.log('drill: rebuilding the database from migrations (no seed)');
  npx(['db', 'reset', '--no-seed']);
}

const empty = counts();
if (Object.values(empty).some((n) => n !== 0)) throw new Error(`drill: database not empty before restore: ${JSON.stringify(empty)}`);

console.log('drill: restoring data');
restore(dataFile);

const actual = counts();
const mismatches = TABLES.filter((t) => Number(actual[t]) !== Number(expected[t]));
for (const t of TABLES) console.log(`drill: ${t.padEnd(22)} expected ${expected[t]}  restored ${actual[t]}`);
if (mismatches.length) {
  console.error(`drill: FAILED for ${mismatches.join(', ')}`);
  process.exit(1);
}
console.log('drill: PASSED, every table restored with matching row counts');
