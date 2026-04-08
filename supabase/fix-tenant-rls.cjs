const { Client } = require('c:/Users/ssoom/OneDrive - Cenergistic/Projects/cencore-code-main/server/node_modules/pg');
const client = new Client('postgresql://postgres:pvgYlWTQqHHGqTur@db.ddubqqumbzbnkfliuwpd.supabase.co:5432/postgres');

async function run() {
  await client.connect();

  const stmts = [
    // Drop and recreate the recursive policy using is_tenant_admin() SECURITY DEFINER function
    `DROP POLICY IF EXISTS "Tenant admins can manage their tenant" ON public.tenant_members`,
    `CREATE POLICY "Tenant admins can manage their tenant" ON public.tenant_members
      FOR ALL TO authenticated
      USING (public.is_tenant_admin(auth.uid(), tenant_id))
      WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id))`,

    // Also ensure the is_tenant_admin function exists and is correct
    `CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_user_id uuid, p_tenant_id uuid)
      RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.tenant_members
          WHERE user_id = p_user_id
            AND tenant_id = p_tenant_id
            AND role = 'admin'
            AND is_active = true
        );
      END;
      $$`,

    // Ensure user_has_tenant_access function is correct
    `CREATE OR REPLACE FUNCTION public.user_has_tenant_access(p_user_id uuid, p_tenant_id uuid)
      RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM public.tenant_members
          WHERE user_id = p_user_id
            AND tenant_id = p_tenant_id
            AND is_active = true
        );
      END;
      $$`,

    // Ensure get_user_tenant_ids function is correct
    `CREATE OR REPLACE FUNCTION public.get_user_tenant_ids(p_user_id uuid)
      RETURNS uuid[] LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        RETURN ARRAY(
          SELECT tenant_id FROM public.tenant_members
          WHERE user_id = p_user_id AND is_active = true
        );
      END;
      $$`,
  ];

  for (const sql of stmts) {
    try {
      await client.query(sql);
      console.log('OK:', sql.trim().split('\n')[0].substring(0, 80));
    } catch (e) {
      console.log('ERR:', e.message.split('\n')[0]);
    }
  }

  // Verify the policies on tenant_members
  const policies = await client.query(`
    SELECT policyname, cmd, qual
    FROM pg_policies
    WHERE tablename = 'tenant_members' AND schemaname = 'public'
    ORDER BY policyname
  `);
  console.log('\ntenant_members policies:');
  policies.rows.forEach(p => {
    console.log(`  [${p.cmd}] ${p.policyname}`);
    console.log(`         USING: ${(p.qual || '').substring(0, 100)}`);
  });

  // Test query as the admin user
  const members = await client.query(`
    SELECT tm.user_id, tm.tenant_id, tm.role, tm.is_active, t.name as tenant_name
    FROM public.tenant_members tm
    JOIN public.tenants t ON t.id = tm.tenant_id
    WHERE tm.is_active = true
  `);
  console.log('\nActive tenant members:', members.rows.length);
  members.rows.forEach(r => console.log(`  ${r.role} in "${r.tenant_name}" (user ${r.user_id})`));

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
