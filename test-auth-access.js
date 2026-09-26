const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="(.*?)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkAccess() {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'alecsomers1980@gmail.com',
        password: 'password123'
    });

    if (loginError) {
        console.error("Login Error:", loginError);
        return;
    }

    console.log("Logged in user:", loginData.user.id);

    // Now try fetching the profile as this logged in user
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', loginData.user.id)
        .single();

    console.log("Profile Data:", profile);
    console.log("Profile Error:", error);
}

checkAccess();
