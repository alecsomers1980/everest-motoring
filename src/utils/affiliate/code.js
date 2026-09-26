export function generateAffiliateCode(firstName, userId) {
    const namePart = (firstName || 'AFF').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
    const idPart = userId.replace(/-/g, '').slice(-4).toUpperCase();
    return `${namePart}${idPart}`;
}

export async function ensureAffiliateCode(supabase, profile) {
    if (profile.affiliate_code) {
        return profile.affiliate_code;
    }
    const code = generateAffiliateCode(profile.first_name, profile.id);
    const { error } = await supabase
        .from('profiles')
        .update({ affiliate_code: code })
        .eq('id', profile.id);
    if (error) {
        console.error('Failed to persist affiliate code:', error);
    }
    return code;
}
