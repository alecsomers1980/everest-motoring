"use client";

import { useState } from "react";
import { Share2, CheckCircle2, Loader2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { createSocialPost } from "./socialAction";

function formatSharedDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export default function SocialPostButton({ car }) {
    const alreadyShared = Boolean(car.social_shared_at);
    const [status, setStatus] = useState(alreadyShared ? "shared" : "idle");
    // idle | loading | success | error | shared

    const handlePost = async () => {
        if (status === "loading") return;

        // If already shared, confirm re-share
        if (status === "shared" || status === "success") {
            const ok = confirm(
                `This vehicle was already shared${car.social_shared_at ? ` on ${formatSharedDate(car.social_shared_at)}` : ""}. Share again?`
            );
            if (!ok) return;
        }

        setStatus("loading");
        const result = await createSocialPost(car);
        if (result.success) {
            setStatus("success");
            setTimeout(() => setStatus("shared"), 4000);
        } else {
            setStatus("error");
            alert("Failed to post: " + result.error);
            setTimeout(() => setStatus(alreadyShared ? "shared" : "idle"), 4000);
        }
    };

    const isShared = status === "shared" || status === "success";
    const Glyph =
        status === "loading" ? Loader2 :
        status === "success" ? CheckCircle2 :
        Share2;
    const title =
        status === "loading" ? "Posting..." :
        status === "success" ? "Posted!" :
        status === "shared" ? `Shared${car.social_shared_at ? ` on ${formatSharedDate(car.social_shared_at)}` : ""} — click to re-share` :
        "Post to social";

    return (
        <IconButton
            onClick={handlePost}
            disabled={status === "loading"}
            busy={status === "loading"}
            tone={isShared ? "positive" : "info"}
            active={isShared}
            aria-label={title}
            title={title}
        >
            <Glyph className="h-5 w-5" />
        </IconButton>
    );
}
