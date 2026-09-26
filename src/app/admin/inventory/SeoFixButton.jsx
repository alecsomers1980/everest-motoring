"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import IconButton from "@/components/ui/IconButton";
import { autoFixSeoForCar } from "./seo_actions";

export default function SeoFixButton({ car }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [isPending, startTransition] = useTransition();

    const hasSeo = !!car.seo_updated_at;
    const pending = busy || isPending;

    async function handleClick() {
        if (pending) return;
        const msg = hasSeo
            ? `Re-generate SEO title, description, and image alts for ${car.year} ${car.make} ${car.model}? This replaces existing values.`
            : `Generate SEO title, description, and image alts for ${car.year} ${car.make} ${car.model}?`;
        if (!confirm(msg)) return;

        setBusy(true);
        try {
            const result = await autoFixSeoForCar(car.id);
            if (!result?.success) {
                alert(result?.error || "SEO fix failed");
            } else {
                startTransition(() => router.refresh());
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <IconButton
            onClick={handleClick}
            disabled={pending}
            busy={pending}
            tone="accent"
            active={hasSeo}
            aria-label={pending
                ? "Generating SEO"
                : hasSeo
                    ? "Re-generate SEO (title and alts)"
                    : "Auto-fix SEO (title and alts)"}
            title={pending
                ? "Generating SEO..."
                : hasSeo
                    ? "Re-generate SEO (title + alts)"
                    : "Auto-Fix SEO (title + alts)"}
        >
            {pending ? <Loader2 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        </IconButton>
    );
}
