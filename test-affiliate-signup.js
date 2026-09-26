const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL="(.*?)"/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY="(.*?)"/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
    const testEmail = `test_affiliate_${Date.now()}@example.com`;
    const testPassword = 'Password123!';

    console.log("1. Registering new Affiliate:", testEmail);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                first_name: 'Test',
                last_name: 'Affiliate',
                phone: '1234567890',
                role: 'affiliate',
                affiliate_code: 'TESTAF1'
            }
        }
    });

    if (signUpError) {
        console.error("SignUp Error:", signUpError);
        return;
    }
    console.log("-> Registered successfully. User ID:", signUpData.user.id);

    console.log("2. Querying Profile to see what the trigger did...");
    // Since we are now theoretically authenticated (if email confirmation is off), or we might need to sign in.
    // Let's sign in explicitly
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
    });

    if (signInError) {
        console.error("SignIn Error:", signInError);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', signUpData.user.id)
        .single();

    if (profileError) {
        console.error("Profile Query Error:", profileError);
    } else {
        console.log("-> Profile created by trigger:");
        console.log(profile);
    }
}

run();
