const pg = require('c:/Users/ssoom/OneDrive - Cenergistic/Projects/cencore-code-main/server/node_modules/pg');
const c = new pg.Client('postgresql://postgres:pvgYlWTQqHHGqTur@db.ddubqqumbzbnkfliuwpd.supabase.co:5432/postgres');

async function run() {
  await c.connect();

  // Fix is_user_admin() - was checking public.users with role='ADMIN' (Prisma schema)
  // Should check user_roles table with role='admin' (app_role enum)
  await c.query(`
    CREATE OR REPLACE FUNCTION public.is_user_admin()
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'
      );
    $$
  `);
  console.log('OK: fixed is_user_admin()');

  // Fix is_specific_user_admin() - check current signature first
  const fn = await c.query(
    `SELECT pg_get_functiondef(oid) FROM pg_proc
     WHERE proname = 'is_specific_user_admin'
       AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')`
  );
  console.log('Current is_specific_user_admin:', fn.rows[0]?.pg_get_functiondef?.substring(0, 200));

  // Drop and recreate with correct signature (uuid param, checking user_roles)
  await c.query(`DROP FUNCTION IF EXISTS public.is_specific_user_admin(text)`);
  await c.query(`DROP FUNCTION IF EXISTS public.is_specific_user_admin(uuid)`);
  await c.query(`
    CREATE OR REPLACE FUNCTION public.is_specific_user_admin(check_user_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = check_user_id
          AND role = 'admin'
      );
    $$
  `);
  console.log('OK: fixed is_specific_user_admin(uuid)');

  // Test them
  const test1 = await c.query(`SELECT public.is_user_admin() AS result`);
  console.log('is_user_admin() (running as postgres, not auth user):', test1.rows[0].result);

  // Show user_roles to confirm
  const roles = await c.query(`
    SELECT ur.user_id, ur.role, up.email
    FROM public.user_roles ur
    LEFT JOIN public.user_profiles up ON up.id = ur.user_id
  `);
  console.log('user_roles:', roles.rows.map(r => `${r.email} -> ${r.role}`));

  // Show public.users to understand the old state
  const users = await c.query(`SELECT count(*) as cnt FROM public.users`);
  console.log('public.users row count:', users.rows[0].cnt);

  await c.end();
}

run().catch(e => { console.error('ERR:', e.message); process.exit(1); });
