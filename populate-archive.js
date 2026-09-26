const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function populateArchiveData() {
    console.log("Fetching the original affiliate profile...");
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'affiliate')
        .order('created_at', { ascending: true })
        .limit(1);

    if (!profiles || profiles.length === 0) return;

    const affiliateUser = profiles[0];

    // Create a date exactly 2 months ago
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const oldLead = {
        client_name: 'David Archiver',
        client_email: 'david.arch@example.com',
        client_phone: '0851234567',
        status: 'closed_won',
        affiliate_id: affiliateUser.id,
        created_at: twoMonthsAgo.toISOString(),
        // We will insert this without a car just to show it works
    };

    console.log(`Inserting archived lead from ${twoMonthsAgo.toDateString()}...`);
    const { error: insertErr } = await supabase
        .from('leads')
        .insert([oldLead]);

    if (insertErr) console.error("Error inserting archived lead:", insertErr);
    else console.log("Archived lead inserted successfully!");
}

populateArchiveData();
