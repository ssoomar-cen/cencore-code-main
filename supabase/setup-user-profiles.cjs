const { Client } = require('c:/Users/ssoom/OneDrive - Cenergistic/Projects/cencore-code-main/server/node_modules/pg');
const client = new Client('postgresql://postgres:pvgYlWTQqHHGqTur@db.ddubqqumbzbnkfliuwpd.supabase.co:5432/postgres');

async function run() {
  await client.connect();

  const stmts = [
    `CREATE TABLE IF NOT EXISTS public.user_profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email text,
      email_confirmed_at timestamptz,
      last_sign_in_at timestamptz,
      created_at timestamptz,
      updated_at timestamptz DEFAULT now()
    )`,
    `ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY`,
    `CREATE POLICY "Admins can view all profiles" ON public.user_profiles
      FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'))`,
    `CREATE POLICY "Users can view own profile" ON public.user_profiles
      FOR SELECT TO authenticated USING (id = auth.uid())`,
    `CREATE OR REPLACE FUNCTION public.sync_user_profile()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
      BEGIN
        INSERT INTO public.user_profiles (id, email, email_confirmed_at, last_sign_in_at, created_at, updated_at)
        VALUES (NEW.id, NEW.email, NEW.email_confirmed_at, NEW.last_sign_in_at, NEW.created_at, now())
        ON CONFLICT (id) DO UPDATE SET
          email = NEW.email,
          email_confirmed_at = NEW.email_confirmed_at,
          last_sign_in_at = NEW.last_sign_in_at,
          updated_at = now();
        RETURN NEW;
      END;
      $$`,
    `DROP TRIGGER IF EXISTS on_auth_user_sync_profile ON auth.users`,
    `CREATE TRIGGER on_auth_user_sync_profile
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile()`,
    `INSERT INTO public.user_profiles (id, email, email_confirmed_at, last_sign_in_at, created_at)
      SELECT id, email, email_confirmed_at, last_sign_in_at, created_at FROM auth.users
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        email_confirmed_at = EXCLUDED.email_confirmed_at,
        last_sign_in_at = EXCLUDED.last_sign_in_at`,
  ];

  for (const sql of stmts) {
    try {
      const res = await client.query(sql);
      console.log('OK:', sql.trim().split('\n')[0].substring(0, 70));
      if (res.rows && res.rows.length > 0) console.log('  Rows:', res.rows.length);
    } catch (e) {
      const msg = e.message.split('\n')[0];
      if (msg.includes('already exists')) {
        console.log('SKIP (exists):', sql.trim().split('\n')[0].substring(0, 70));
      } else {
        console.log('ERR:', msg);
      }
    }
  }

  // Verify
  const users = await client.query('SELECT id, email FROM public.user_profiles');
  console.log('\nuser_profiles populated:', users.rows.map(r => r.email).join(', '));

  await client.end();
}

run().catch(e => { console.error(e.message); process.exit(1); });
