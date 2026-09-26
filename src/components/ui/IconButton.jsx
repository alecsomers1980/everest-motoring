"use client";

import { cn } from "@/utils/cn";

// Square icon control shared by the admin row actions.
//
// Motion is deliberately small: a tint and a 1px lift on hover, a press on
// active. Anything larger reads as noisy at six buttons per row. Transforms are
// disabled under prefers-reduced-motion by the global rule in globals.css.
const TONES = {
    default: "hover:bg-slate-100 hover:text-slate-900",
    positive: "hover:bg-emerald-50 hover:text-emerald-700",
    info: "hover:bg-blue-50 hover:text-blue-700",
    accent: "hover:bg-violet-50 hover:text-violet-700",
    danger: "hover:bg-red-50 hover:text-red-700",
};

export default function IconButton({
    as: Tag = "button",
    tone = "default",
    active = false,
    busy = false,
    className,
    children,
    ...props
}) {
    return (
        <Tag
            className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                "text-slate-400 transition-all duration-200 ease-out",
                "hover:-translate-y-px active:translate-y-0 active:scale-95",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 focus-visible:ring-offset-1",
                "disabled:pointer-events-none disabled:opacity-40",
                TONES[tone] ?? TONES.default,
                active && "text-slate-900",
                busy && "pointer-events-none opacity-60",
                className
            )}
            {...(Tag === "button" ? { type: props.type || "button" } : {})}
            {...props}
        >
            <span className={cn("inline-flex", busy && "animate-spin")}>{children}</span>
        </Tag>
    );
}
