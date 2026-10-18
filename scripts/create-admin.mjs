// Creates (or promotes) the dashboard admin. Public sign-up is disabled, so this is the only way in.
// Usage: node --env-file=.dev.vars scripts/create-admin.mjs
// Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD (15+ chars) in the environment.
// TOTP is enrolled on first sign-in at /admin/mfa/.
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD })) {
  if (!v || v.startsWith('<')) throw new Error(`${k} is not set`);
}
if (ADMIN_PASSWORD.length < 15) throw new Error('ADMIN_PASSWORD must be at least 15 characters');

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let userId;
const { data: created, error } = await db.auth.admin.createUser({
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
  email_confirm: true,
});
if (error) {
  if (!/already/i.test(error.message)) throw error;
  const { data: list, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  userId = list.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase())?.id;
  if (!userId) throw new Error('User exists but could not be found');
  console.log('admin: user already existed, ensuring admin role');
} else {
  userId = created.user.id;
  console.log('admin: user created');
}

const { error: profileError } = await db
  .from('profiles')
  .upsert({ user_id: userId, display_name: 'Admin', role: 'admin' }, { onConflict: 'user_id' });
if (profileError) throw profileError;
console.log(`admin: ${ADMIN_EMAIL} is an admin. Sign in at /admin/login/ and set up your authenticator app.`);
