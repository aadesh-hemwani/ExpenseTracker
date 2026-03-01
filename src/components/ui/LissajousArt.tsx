import { useMemo } from "react";
import { CATEGORY_COLORS } from "../../utils/uiUtils";
import { motion } from "framer-motion";

type Props = {
    amount: number;
    hour: number;
    minute: number;
    day: number;
    category: string;
};

export function LissajousArt({
    amount,
    hour,
    minute,
    day,
    category,
}: Props) {
    const size = 300;
    const center = size / 2;
    const primaryColor = CATEGORY_COLORS[category] || "currentColor";
    const uniqueId = useMemo(() => `lissajous-${hour}-${minute}-${day}-${amount}`, [hour, minute, day, amount]);

    // Generate paths
    const { primaryPath } = useMemo(() => {
        const numAmount = Math.floor(amount || 0);

        // Dynamic frequencies based on time & amount
        const a = ((hour + numAmount) % 4) + 2; // X Freq
        const b = ((minute + Math.floor(numAmount / 10)) % 5) + 3; // Y Freq
        const finalB = a === b ? b + 1 : b;

        const delta = ((day + numAmount) % 31 / 31) * Math.PI; // Phase shift

        const amplitude = 120;
        const steps = 400;

        const pts = [];
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI * 2;
            const x = center + amplitude * Math.sin(a * t + delta);
            const y = center + amplitude * Math.sin(finalB * t);
            pts.push(`${x},${y}`);
        }

        const pathString = pts.join(" ");
        return { primaryPath: pathString, bgPath: pathString };
    }, [amount, hour, minute, day, center]);

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] pointer-events-none z-0 mix-blend-multiply dark:mix-blend-screen transition-all duration-700">
            <motion.svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
            >
                <defs>
                    <linearGradient id={`${uniqueId}-glow`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.1" />
                        <stop offset="50%" stopColor={primaryColor} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity="0.1" />
                    </linearGradient>
                    <filter id={`${uniqueId}-blur`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="6" />
                    </filter>
                </defs>

                {/* Primary Animated Core Stroke */}
                <motion.polyline
                    fill="none"
                    stroke={`url(#${uniqueId}-glow)`}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={primaryPath}
                    initial={{ pathLength: 0, pathOffset: 1 }}
                    animate={{
                        pathLength: 1,
                        pathOffset: 0,
                    }}
                    transition={{
                        duration: 2.5,
                        ease: "easeOut",
                    }}
                />
            </motion.svg>
        </div>
    );
}
