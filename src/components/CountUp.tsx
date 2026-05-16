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

    useEffect(() => {
        const finalValue = Number(value) || 0;
        const controls = animate(count, finalValue, {
            duration: duration,
            ease: "easeOut"
        });

        return controls.stop;
    }, [value, duration, count]);

    const formatter = useMemo(() => new Intl.NumberFormat('en-IN', {
        style: currency ? 'currency' : 'decimal',
        currency: 'INR',
        maximumFractionDigits: 0
    }), [currency]);

    const displayValue = useTransform(count, (latest: number) => formatter.format(latest));

    if (prefix !== undefined) {
        return (
            <>
                <span className={prefixClassName} style={prefixStyle}>{prefix}</span>
                <motion.span className={className}>{displayValue}</motion.span>
            </>
        );
    }

    return <motion.span className={className}>{displayValue}</motion.span>;
});

CountUp.displayName = "CountUp";

export default CountUp;

