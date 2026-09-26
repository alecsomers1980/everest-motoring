export async function startVideoGeneration(scriptArray, carPayload) {
    if (!process.env.HEYGEN_API_KEY || !process.env.HEYGEN_AVATAR_ID || !process.env.HEYGEN_VOICE_ID) {
        throw new Error("Missing HeyGen environment variables.");
    }

    try {
        let scripts = Array.isArray(scriptArray) ? scriptArray : [{ location: 'exterior', script: scriptArray }];

        const videoInputs = scripts.map((scene, index) => {
            let backgroundUrl = carPayload.main_image_url;

            // Scene 2 (Index 1): Use the first gallery image if available
            if (index === 1 && carPayload.gallery_urls && carPayload.gallery_urls.length > 0) {
                backgroundUrl = carPayload.gallery_urls[0];
            }

            // Scene 3 (Index 2): Use the second gallery image if available, else fall back to the main image
            if (index === 2 && carPayload.gallery_urls && carPayload.gallery_urls.length > 1) {
                backgroundUrl = carPayload.gallery_urls[1];
            }

            return {
                character: {
                    type: "avatar",
                    avatar_id: process.env.HEYGEN_AVATAR_ID,
                    avatar_style: "normal"
                },
                voice: {
                    type: "text",
                    input_text: scene.script,
                    voice_id: process.env.HEYGEN_VOICE_ID,
                    speed: 1.1
                },
                background: backgroundUrl ? {
                    type: "image",
                    url: backgroundUrl
                } : {
                    type: "color",
                    value: "#0f172a"
                }
            };
        });

        const response = await fetch("https://api.heygen.com/v2/video/generate", {
            method: "POST",
            headers: {
                "X-Api-Key": process.env.HEYGEN_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                video_inputs: videoInputs,
                test: true, // [DEV MODE] Set to true to test without consuming credits during staging
                aspect_ratio: "9:16" // Vertical format for mobile dominance
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("HeyGen API Error:", errText);
            throw new Error(`HeyGen returned status ${response.status}`);
        }

        const data = await response.json();

        // The API responds with data.data.video_id
        if (data.data && data.data.video_id) {
            return data.data.video_id; // Return the ID so the database can track it
        } else {
            console.error("Unexpected HeyGen response:", data);
            throw new Error("HeyGen did not return a valid video_id");
        }

    } catch (error) {
        console.error("Exception in startVideoGeneration:", error);
        throw error;
    }
}
