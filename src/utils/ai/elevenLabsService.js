/**
 * ElevenLabs TTS wrapper for the Seedance walkaround voiceover.
 *
 * Generates a single voiceover line per scene using a fixed voice_id
 * (the same one for every scene of every car), guaranteeing deterministic
 * voice consistency across all 4 clips — the core reason we decoupled
 * voice from the video model.
 *
 * The resulting mp3 is uploaded to Supabase storage so it can be fetched
 * by the Fal FFmpeg compose endpoint during the audio-mux step.
 */

import { createAdminClient } from '@/utils/supabase/server';
import { SILENCE_MP3_BASE64 } from './silenceAsset';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';

// `eleven_multilingual_v2` is the safest choice for South African English
// — it preserves the trained accent of the locked voice (whether you use a
// stock SA voice or a Professional Voice Clone) and is supported on every
// paid tier including Starter.
const DEFAULT_MODEL = 'eleven_multilingual_v2';

// Voice tuning. Higher stability keeps the accent and cadence locked across
// scenes (important — we don't want a more "expressive" read in scene 2 to
// drift the timbre). Lower style values keep the read calm and neutral,
// matching the "calm and unhurried" brief baked into the script prompt.
const DEFAULT_VOICE_SETTINGS = {
    stability: 0.6,
    similarity_boost: 0.75,
    style: 0.15,
    use_speaker_boost: true,
};

const STORAGE_BUCKET = 'vehicles';

// MPEG1 Layer III @ 44.1 kHz = 1152 samples per frame.
const MS_PER_FRAME = (1152 / 44100) * 1000; // ≈ 26.122 ms

// Parse a CBR mp3 buffer into whole frames (skipping any ID3v2 tag).
function parseMp3Frames(buf) {
    const frames = [];
    let i = 0;
    if (buf.slice(0, 3).toString() === 'ID3') {
        const sz = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
        i = 10 + sz;
    }
    while (i + 4 <= buf.length) {
        if (buf[i] !== 0xFF || (buf[i + 1] & 0xE0) !== 0xE0) { i++; continue; }
        const padding = (buf[i + 2] & 0x02) >> 1;
        const frameLen = Math.floor((144 * 128000) / 44100) + padding; // 417 or 418 bytes
        if (i + frameLen > buf.length) break;
        frames.push(buf.slice(i, i + frameLen));
        i += frameLen;
    }
    return frames;
}

let _silenceFrames = null;
function getSilenceFrames() {
    if (!_silenceFrames) _silenceFrames = parseMp3Frames(Buffer.from(SILENCE_MP3_BASE64, 'base64'));
    return _silenceFrames;
}

// Append CBR mp3 silence frames so the voiceover lasts just past the clip
// length. Fal's compose LOOPS audio shorter than the clip (the "stuck /
// repeating voice that drags into the next scene" artefact) and plays longer
// audio once — so padding to just over the clip length guarantees the muxed
// scene ends on clean silence. Frames are appended whole (no mid-frame cut)
// and cycled if more silence is needed than the bundled asset holds.
function padWithSilence(voiceBuf, targetMs) {
    const voiceMs = (voiceBuf.length / 16000) * 1000;
    const needMs = targetMs - voiceMs;
    if (needMs <= 0) return voiceBuf;
    const frames = getSilenceFrames();
    if (frames.length === 0) return voiceBuf;
    const needFrames = Math.ceil(needMs / MS_PER_FRAME);
    const parts = [voiceBuf];
    for (let k = 0; k < needFrames; k++) parts.push(frames[k % frames.length]);
    return Buffer.concat(parts);
}

function requireEnv() {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY env var.');
    if (!voiceId) throw new Error('Missing ELEVENLABS_VOICE_ID env var.');
    return { apiKey, voiceId };
}

/**
 * Synthesize a voiceover line and return a publicly fetchable mp3 URL.
 *
 * `carId` and `sceneNum` are used only for the storage filename — they
 * make it possible to inspect/debug per-car audio in the Supabase UI.
 */
export async function synthesizeVoiceover({ text, carId, sceneNum, clipDurationMs = 8000 }) {
    if (!text || !String(text).trim()) {
        throw new Error('synthesizeVoiceover requires a non-empty text line.');
    }

    const { apiKey, voiceId } = requireEnv();

    // Send the script line as CLEAN text — no trailing ellipsis, no SSML
    // <break> tag. Both make eleven_multilingual_v2 improvise non-verbal
    // sounds after the line: it reads a trailing "..." as "trailing off" and a
    // standalone <break> as dead air to fill, and in either case hallucinates
    // phantom audio — mumbling, breaths, or "ha ha" laughter (the "babble at
    // the end" artefact). We strip any trailing ellipsis/dots and ensure the
    // line ends on sentence-final punctuation so the last word still gets a
    // natural decay (no clipping). Trailing silence to fill the 8s clip is
    // handled downstream: the mux step (videoAudioMuxer) plays the real
    // measured duration and leaves the rest of the clip as true silence.
    const trimmed = String(text).trim().replace(/\s*(?:\.{2,}|…)\s*$/u, '').trim();
    const speakText = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;

    console.log(`[ElevenLabs] Synthesizing scene ${sceneNum} voiceover (${speakText.length} chars, clean text): "${speakText.slice(0, 60)}${speakText.length > 60 ? '…' : ''}"`);

    const ttsRes = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
            text: speakText,
            model_id: process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL,
            voice_settings: DEFAULT_VOICE_SETTINGS,
        }),
    });

    if (!ttsRes.ok) {
        const errText = await ttsRes.text().catch(() => '');
        throw new Error(`ElevenLabs TTS failed: HTTP ${ttsRes.status} ${errText.slice(0, 300)}`);
    }

    const arrayBuf = await ttsRes.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuf);

    if (audioBuffer.length < 1000) {
        throw new Error(`ElevenLabs returned a suspiciously small mp3 (${audioBuffer.length} bytes) — likely an API error masquerading as audio.`);
    }

    // Pad the voiceover with real trailing silence to just past the clip
    // length. Fal's compose loops audio shorter than the clip (the "stuck /
    // repeating voice" artefact); padding past the clip makes the muxed scene
    // end on clean silence. +250ms keeps us safely over the clip so Fal never
    // loops; the tiny overshoot is trimmed/frozen harmlessly at stitch time.
    const finalBuffer = padWithSilence(audioBuffer, clipDurationMs + 250);

    // Upload to Supabase storage and return its public URL so Fal's
    // FFmpeg compose endpoint can fetch it during the mux step.
    const supabase = await createAdminClient();
    const safeCarId = String(carId || 'unknown').replace(/[^a-z0-9-]/gi, '_').slice(0, 40);
    const fileName = `ai-audio/${safeCarId}/scene-${sceneNum}-${Date.now()}.mp3`;

    const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(fileName, finalBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
        });

    if (uploadError) {
        throw new Error(`Supabase audio upload failed: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    const audioUrl = data.publicUrl;

    // Estimate mp3 duration from byte length (CBR 128 kbps mp3 => bytes/16000 ≈
    // seconds). This is the silence-padded length (~clip length).
    const durationMs = Math.round((finalBuffer.length / 16000) * 1000);

    console.log(`[ElevenLabs] Scene ${sceneNum} audio stored: ${audioUrl} (voice ${audioBuffer.length}B -> padded ${finalBuffer.length}B, ~${durationMs}ms)`);
    return { audioUrl, bytes: finalBuffer.length, durationMs };
}
