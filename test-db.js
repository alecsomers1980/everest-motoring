const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="(.*?)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function test() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('id', { ascending: false })
        .limit(10);

    console.log("Recent Profiles Data (id, role, first_name):");
    if (profiles) {
        profiles.forEach(p => console.log(`${p.id} | Role: ${p.role} | Name: ${p.first_name}`));
    }
    if (error) console.log("Profiles Error:", error);
}

test();
