/**
 * Spoken-duration estimator for walkaround voiceover lines.
 *
 * Word count is a bad proxy for how long a line takes to say. Vehicle trim
 * designations are the reason: TTS spells them out letter by letter, so
 * "2.0TDi" is one "word" but reads as "two point zero T D I" — six syllables.
 * A 15-word line naming a "T6 2.0TDi Transporter DSG Trendline" runs ~11
 * seconds against an 8-second clip and gets truncated mid-sentence.
 *
 * We therefore budget in syllables. The estimate is deliberately slightly
 * pessimistic — over-estimating costs us a few words of copy, under-estimating
 * costs a clipped line that can only be fixed by hand.
 */

// Clip length every scene is rendered at.
export const CLIP_DURATION_MS = 8000;

// Target for a generated line. The ~1s of headroom absorbs estimator error and
// the natural decay on the final word, so the line lands inside the clip.
export const VOICEOVER_BUDGET_MS = 7000;

// eleven_multilingual_v2 at stability 0.6 / style 0.15 reads at a calm,
// unhurried pace — measured across the existing fleet at roughly this rate.
const SYLLABLES_PER_SECOND = 3.5;

// Count syllables in an ordinary pronounceable word via vowel groups.
function syllablesInWord(word) {
    const w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    const groups = w.match(/[aeiouy]+/g);
    let n = groups ? groups.length : 1;
    // Silent trailing "e" ("Trendline", "Dashline") — but not "-ee"/"-ie".
    if (w.length > 2 && w.endsWith('e') && !/[aeiouy]e$/.test(w)) n -= 1;
    return Math.max(1, n);
}

// Short runs that TTS reads letter by letter: DSG, TDi, GLX, AWD, SD, V.
// The tell is capitalisation, not vowel count — "This" and "kept" also have one
// vowel in four letters, so a vowel-density rule misreads them as acronyms.
// All-caps ("DSG") or an internal capital ("TDi") marks a spec code; a single
// leading capital is just sentence case ("This", "The").
function isSpelledOut(run) {
    if (run.length > 4) return false;
    return run === run.toUpperCase() || /[A-Z]/.test(run.slice(1));
}

// Digits are read as number words ("2022" -> "twenty twenty-two"). Averages out
// near 1.4 syllables per digit across years, engine sizes and mileages.
function syllablesInDigits(digits) {
    return Math.max(1, Math.round(digits.length * 1.4));
}

/**
 * Estimate how long `text` takes to speak, in milliseconds.
 */
export function estimateSpokenMs(text) {
    if (!text || !String(text).trim()) return 0;
    let syllables = 0;
    for (const run of String(text).match(/\d+|[A-Za-z]+/g) || []) {
        if (/^\d+$/.test(run)) syllables += syllablesInDigits(run);
        else if (isSpelledOut(run)) syllables += run.length;
        else syllables += syllablesInWord(run);
    }
    return Math.round((syllables / SYLLABLES_PER_SECOND) * 1000);
}

/**
 * Scenes whose voiceover_text is estimated to overrun `budgetMs`.
 * Returns [{ scene, estimatedMs, text }] — empty when every line fits.
 */
export function findOverBudgetScenes(script, budgetMs = VOICEOVER_BUDGET_MS) {
    if (!Array.isArray(script)) return [];
    return script
        .map((s, i) => ({
            scene: s?.scene ?? i + 1,
            text: s?.voiceover_text || '',
            estimatedMs: estimateSpokenMs(s?.voiceover_text),
        }))
        .filter((s) => s.estimatedMs > budgetMs);
}
