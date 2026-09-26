import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Merges class names, with later Tailwind utilities correctly overriding earlier
// ones (so a caller's `className` can override a component's defaults).
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
