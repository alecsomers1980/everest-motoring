const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY="(.*?)"/);

// Bypassing RLS with the Service Role Key
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function populateData() {
    console.log("Fetching the original affiliate profile...");
    const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'affiliate')
        // Get the first created affiliate account
        .order('created_at', { ascending: true })
        .limit(1);

    if (profileErr || !profiles || profiles.length === 0) {
        console.error("Could not find an affiliate profile:", profileErr);
        return;
    }

    const affiliateUser = profiles[0];
    console.log(`Using affiliate: ${affiliateUser.first_name} ${affiliateUser.last_name || ''} (${affiliateUser.id})`);

    console.log("Fetching an available car...");
    const { data: cars, error: carErr } = await supabase
        .from('cars')
        .select('id, make, model')
        .limit(1);

    let carId = null;
    if (cars && cars.length > 0) {
        carId = cars[0].id;
        console.log(`Found car: ${cars[0].make} ${cars[0].model} (${carId})`);
    } else {
        console.log("No cars found in DB. Will insert leads without a car link.");
    }

    const newLeads = [
        {
            client_name: 'John Doe',
            client_email: 'john.doe@example.com',
            client_phone: '0821234567',
            status: 'new',
            affiliate_id: affiliateUser.id,
            car_id: carId
        },
        {
            client_name: 'Sarah Smith',
            client_email: 'sarah.s@example.com',
            client_phone: '0831234567',
            status: 'finance_pending',
            affiliate_id: affiliateUser.id,
            car_id: carId
        },
        {
            client_name: 'Michael Johnson',
            client_email: 'michael.j@example.com',
            client_phone: '0841234567',
            status: 'closed_won',
            affiliate_id: affiliateUser.id,
            car_id: carId
        }
    ];

    console.log("Inserting mock leads...");
    const { error: insertErr } = await supabase
        .from('leads')
        .insert(newLeads);

    if (insertErr) {
        console.error("Failed to insert leads:", insertErr);
    } else {
        console.log("Successfully populated 3 mock leads (Call Back Request, Financing, Completed)!");
    }
}

populateData();
