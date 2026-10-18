// Admin auth regression test (Phase 1 acceptance). Needs the local Supabase stack and `npm run dev` running.
// Run: npm run test:auth. Reads credentials from .dev.vars and never prints them. Removes its test MFA factor at the end.
import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const BASE = 'http://localhost:4321';
const env = process.env;
let jar = new Map();

async function req(path, { method = 'GET', form } = {}) {
  const headers = { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
  let body;
  if (form) {
    body = new URLSearchParams(form);
    headers['content-type'] = 'application/x-www-form-urlencoded';
    headers.origin = BASE;
  }
  const res = await fetch(BASE + path, { method, headers, body, redirect: 'manual' });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    const name = pair.slice(0, i), value = pair.slice(i + 1);
    if (value === '' || /max-age=0/i.test(c)) jar.delete(name); else jar.set(name, value);
  }
  return { status: res.status, location: res.headers.get('location'), html: await res.text() };
}

function totp(secretB32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of secretB32.replace(/=+$/, '')) bits += alphabet.indexOf(ch).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1] & 0xf;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}

const check = (label, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`); if (!ok) process.exitCode = 1; };

const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: signUpError } = await anonClient.auth.signUp({ email: 'intruder@example.com', password: 'a-long-enough-password-123' });
check('public sign-up is disabled', !!signUpError);

let r = await req('/admin/login/', { method: 'POST', form: { email: env.ADMIN_EMAIL, password: 'wrong-password-123456' } });
check('wrong password shows a generic error', r.status === 200 && r.html.includes('match. Check both'));

r = await req('/admin/login/', { method: 'POST', form: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD } });
check('correct password redirects to MFA', r.status === 303 && r.location === '/admin/mfa/');

r = await req('/admin/');
check('aal1 session cannot open the dashboard', r.status === 303 && r.location === '/admin/mfa/');

r = await req('/admin/mfa/');
const factorId = r.html.match(/name="factorId" value="([^"]*)"/)?.[1];
const secret = r.html.match(/<code[^>]*>([A-Z2-7=]+)<\/code>/)?.[1];
check('first sign-in shows authenticator enrollment with a QR code', !!factorId && !!secret && r.html.includes('data:image/svg+xml'));

r = await req('/admin/mfa/', { method: 'POST', form: { factorId, code: '000000' } });
check('a wrong code is rejected', r.status === 200 && r.html.includes('work. Codes change'));

r = await req('/admin/mfa/', { method: 'POST', form: { factorId, code: totp(secret) } });
check('a valid TOTP code upgrades the session', r.status === 303 && r.location === '/admin/');
if (r.status !== 303) console.log('  detail:', r.status, (r.html.match(/role="alert"[^>]*>([^<]+)/) || [])[1]);

r = await req('/admin/');
check('dashboard loads at aal2 and shows RLS-scoped data', r.status === 200 && /Upcoming bookings<\/dt><dd[^>]*>\d+/.test(r.html));

r = await req('/admin/logout/', { method: 'POST', form: {} });
r = await req('/admin/');
check('sign out ends the session', r.status === 303 && r.location === '/admin/login/');

r = await req('/admin/login/', { method: 'POST', form: { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD } });
r = await req('/admin/mfa/');
check('second sign-in asks for a code instead of re-enrolling', r.html.includes('Enter your code') && !/<code[\s>]/.test(r.html));

// Remove the test factor so the owner can enroll their own authenticator app on first local sign-in.
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: users } = await admin.auth.admin.listUsers();
const user = users.users.find((u) => u.email === env.ADMIN_EMAIL);
const { data: factors } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
for (const f of factors.factors) await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: f.id });
console.log('cleanup: test authenticator factor removed');
