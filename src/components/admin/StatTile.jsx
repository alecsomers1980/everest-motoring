import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Surface, Label } from "@/components/ui/Surface";
import Sparkline from "./Sparkline";
import { cn } from "@/utils/cn";

// Per the dataviz form heuristic a single headline number is a stat tile, not a
// chart. The delta and sparkline supply the context a bare number lacks.
//
// `delta` and `trend` are optional on purpose: several metrics here have no stored
// history, and inventing a trend line for them would be fabricating data.
export default function StatTile({
    label,
    value,
    unit,
    delta,
    deltaLabel,
    trend,
    className,
}) {
    // Direction is conveyed by icon + text, never by colour alone.
    const dir = delta == null || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
    const DirIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

    const dirTone = {
        up: "text-emerald-700",
        down: "text-red-700",
        flat: "text-slate-500",
    }[dir];

    return (
        <Surface className={cn("p-6 flex flex-col gap-4", className)}>
            <Label>{label}</Label>

            <div className="flex items-end justify-between gap-4">
                <div className="flex items-baseline gap-2">
                    <span className="text-display-sm font-semibold text-slate-900">{value}</span>
                    {unit && <span className="text-sm text-slate-500">{unit}</span>}
                </div>
                {trend && trend.length > 1 && (
                    <Sparkline values={trend} className="text-slate-300 shrink-0" />
                )}
            </div>

            {delta != null ? (
                <p className={cn("flex items-center gap-1.5 text-sm", dirTone)}>
                    <DirIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="font-medium">
                        {delta > 0 ? "+" : ""}
                        {delta}
                    </span>
                    {deltaLabel && <span className="text-slate-500 font-normal">{deltaLabel}</span>}
                </p>
            ) : (
                <p className="text-sm text-slate-400">No prior period to compare</p>
            )}
        </Surface>
    );
}
