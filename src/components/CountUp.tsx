import React, { useEffect, useMemo, memo } from 'react';
import { motion, useTransform, useMotionValue, animate } from 'framer-motion';

interface CountUpProps {
    value: number | string;
    duration?: number;
    className?: string;
    prefix?: string;
    prefixClassName?: string;
    prefixStyle?: React.CSSProperties;
    currency?: boolean;
}

const CountUp = memo(({ 
    value, 
    duration = 0.75, 
    className, 
    prefix, 
    prefixClassName, 
    prefixStyle, 
    currency = true 
}: CountUpProps) => {
    const count = useMotionValue(0);
    const spanRef = React.useRef<HTMLSpanElement>(null);

    const formatIndianNumber = useMemo(() => {
        return (num: number) => {
            const x = Math.floor(num).toString();
            if (x.length <= 3) return x;
            let lastThree = x.substring(x.length - 3);
            const otherNumbers = x.substring(0, x.length - 3);
            if (otherNumbers !== '') {
                lastThree = ',' + lastThree;
            }
            const res = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
            return currency ? `₹${res}` : res;
        };
    }, [currency]);

    useEffect(() => {
        const finalValue = Number(value) || 0;
        const controls = animate(count, finalValue, {
            duration: duration,
            ease: "easeOut",
            onUpdate: (latest: number) => {
                if (spanRef.current) {
                    // Manual string formatting is 100x faster than Intl.NumberFormat in a rAF loop
                    spanRef.current.textContent = formatIndianNumber(latest);
                }
            }
        });

        return controls.stop;
    }, [value, duration, count, formatIndianNumber]);

    if (prefix !== undefined) {
        return (
            <>
                <span className={prefixClassName} style={prefixStyle}>{prefix}</span>
                <span ref={spanRef} className={className} />
            </>
        );
    }

    return <span ref={spanRef} className={className} />;
});

CountUp.displayName = "CountUp";

export default CountUp;

