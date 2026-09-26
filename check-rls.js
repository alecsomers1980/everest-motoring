const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkRLS() {
    const { data: policies, error } = await supabase
        .rpc('get_policies_for_table', { table_name: 'leads' }); // Just an attempt to see if there's a stored proc

    // Alternatively, just query pg_policies using custom sql
    const { data: qdata, error: qerr } = await supabase.from('pg_policies').select('*').eq('tablename', 'leads');
    console.log("pg_policies query:", qdata, qerr?.message);
}

// Since accessing pg_policies via client might fail if it's not exposed, 
// let's try direct postgres query via REST if possible, 
// but Supabase REST API doesn't expose system catalogs generally.

checkRLS();
