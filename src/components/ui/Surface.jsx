import { cn } from "@/utils/cn";

// A panel. Restrained luxury separates surfaces with hairline rules rather than
// shadows, so `flat` (the default) has a border and no shadow.
export function Surface({ className, elevated = false, as: Tag = "div", ...props }) {
    return (
        <Tag
            className={cn(
                "rounded-2xl border border-hairline bg-white",
                elevated && "shadow-soft",
                className
            )}
            {...props}
        />
    );
}

// Small-caps section label. Replaces the `font-black uppercase tracking-[0.3em]`
// pattern that was applied to nearly every admin label.
export function Label({ className, as: Tag = "p", ...props }) {
    return (
        <Tag
            className={cn("text-label font-semibold uppercase text-slate-500", className)}
            {...props}
        />
    );
}

// A thin rule used to anchor headings — the primary accent moment.
export function Rule({ className }) {
    return <div className={cn("h-px w-10 bg-primary", className)} />;
}
