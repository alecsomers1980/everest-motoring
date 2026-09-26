const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/);

const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);

async function testUpdate() {
    console.log("Testing update on the first available lead...");

    // Get a lead id to test with
    const { data: leads } = await supabaseAdmin.from('leads').select('id, client_id, status').limit(2);

    if (!leads || leads.length === 0) {
        console.log("No leads to test with.");
        return;
    }

    const testLead = leads[0];
    console.log("Testing with lead ID:", testLead.id, "Client ID:", testLead.client_id || 'null');

    const { data: constraintInfo, error: err2 } = await supabaseAdmin.rpc('get_table_schema', { table_name: 'leads' });
    // We can't easily query pg_constraint without raw sql, but let's query the lead with an allowed status like 'reviewing' just to confirm.
    console.log("Testing with 'reviewing' instead of 'document_collection'");

    const { data, error } = await supabaseAdmin
        .from('leads')
        .update({ status: 'reviewing' })
        .eq('id', testLead.id);

    console.log(error ? error.message : "Success!");
}

testUpdate();
