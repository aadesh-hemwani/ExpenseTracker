import { useMemo } from "react";
import { CATEGORY_COLORS } from "../../utils/uiUtils";

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

    // Generate Multiple Layers for Depth and Complexity
    const layers = useMemo(() => {
        // Base parameters (Deterministic)
        const a = (hour % 5) + 1;       // Frequency X (1-5)
        const b = (minute % 7) + 1;     // Frequency Y (1-7)
        const delta = (day / 31) * Math.PI; // Phase shift

        // Amplitude scales with amount but stays within bounds
        const baseRadius = 100;
        const amplitude = baseRadius * Math.min(Math.max(amount / 500, 0.7), 1.2);

        const steps = 600; // Resolution
        const layerConfigs = [
            { opacity: 1.0, width: 2, scale: 1.0, phaseOffset: 0 },    // Primary (Brighter)
            { opacity: 0.6, width: 1, scale: 1.1, phaseOffset: 0.2 },  // Echo 1 (More visible)
            { opacity: 0.2, width: 4, scale: 0.9, phaseOffset: -0.2 }  // Glow/Background
        ];

        return layerConfigs.map((config) => {
            const pts = [];
            for (let i = 0; i <= steps; i++) {
                const t = (i / steps) * Math.PI * 2;

                // Add subtle modulation for "fun" detail
                const mod = 1 + 0.05 * Math.sin(t * 10); // Ripple effect

                const x = center + (amplitude * config.scale * mod) * Math.sin(a * t + delta + config.phaseOffset);
                const y = center + (amplitude * config.scale * mod) * Math.sin(b * t);

                pts.push(`${x},${y}`);
            }
            return { path: pts.join(" "), ...config };
        });
    }, [amount, hour, minute, day, center]);

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] pointer-events-none z-0 opacity-60 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen transition-all duration-500">
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id={`${uniqueId}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.1" />
                        <stop offset="50%" stopColor={primaryColor} stopOpacity="1" />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity="0.1" />
                    </linearGradient>
                </defs>

                {layers.map((layer, index) => (
                    <polyline
                        key={index}
                        fill="none"
                        stroke={index === 0 ? `url(#${uniqueId}-gradient)` : primaryColor}
                        strokeWidth={layer.width}
                        strokeOpacity={layer.opacity}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={layer.path}
                    />
                ))}


            </svg>
        </div>
    );
}
