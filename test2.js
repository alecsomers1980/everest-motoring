const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: tables, error: tableErr } = await supabase.from('pg_tables').select('*');
    // supabase REST doesn't allow 'pg_tables' direct access often. We'll try common table names.
    const checks = ['settings', 'config', 'users', 'profiles', 'integrations'];
    for (let t of checks) {
        const { data, error } = await supabase.from(t).select('*').limit(2);
        if (!error && data) {
            console.log("Found table:", t, "rows:", data);
        }
    }
}
check();
