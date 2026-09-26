"use client";

import { motion, useReducedMotion } from "framer-motion";

// Restrained scroll reveal: a short fade and a small rise, once, on enter.
// Motion should be felt, not noticed — hence 16px and 0.5s, not 60px and 1.2s.
// Honours prefers-reduced-motion by rendering the content statically.
export default function Reveal({ children, delay = 0, className }) {
    const reduce = useReducedMotion();

    if (reduce) return <div className={className}>{children}</div>;

    return (
        <motion.div
            // The initial state ships in the SSR HTML as opacity:0, so a <noscript>
            // rule in the root layout targets this attribute to force the content
            // visible when JavaScript never runs.
            data-reveal=""
            className={className}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}
