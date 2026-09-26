const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/);

const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);

async function checkStatus() {
    console.log("Fetching distinct statuses...");
    // Let's just look at existing leads to see what statuses exist.
    const { data } = await supabaseAdmin.from('leads').select('status');
    if (data) {
        console.log("Used statuses:", [...new Set(data.map(d => d.status))]);
    }
}

checkStatus();
