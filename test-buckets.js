const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/);

const supabaseAdmin = createClient(urlMatch[1], keyMatch[1]);

async function checkBuckets() {
    const { data, error } = await supabaseAdmin.storage.listBuckets();
    console.log("Buckets:", data);
    console.log("Error:", error);
}

checkBuckets();
