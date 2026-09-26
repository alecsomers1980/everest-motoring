import { cn } from "@/utils/cn";

// Minimal trend line: no axes, no grid, no markers. It carries shape, not values —
// the exact numbers live in the stat tile's headline and delta.
// 2px stroke per the dataviz mark spec.
export default function Sparkline({ values, className, width = 96, height = 28 }) {
    if (!values || values.length < 2) return null;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const step = width / (values.length - 1);

    // Inset by the stroke half-width so the line never clips at the edges.
    const pad = 1;
    const points = values
        .map((v, i) => {
            const x = i * step;
            const y = pad + (1 - (v - min) / span) * (height - pad * 2);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={cn("overflow-visible", className)}
            aria-hidden="true"
            focusable="false"
        >
            <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
