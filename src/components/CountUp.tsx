import { motion, useTransform, useMotionValue, animate } from 'framer-motion';
import { useEffect } from 'react';

interface CountUpProps {
    value: number | string;
    duration?: number;
    className?: string;
}

const CountUp = ({ value, duration = 1.5, className }: CountUpProps) => {
    // 1. Create a MotionValue for the count
    const count = useMotionValue(0);

    // 2. Create a "spring" version effectively for smooth counting
    // Or just animate the value directly in useEffect.
    // Let's use simple `animate` for linear or ease-out counting

    useEffect(() => {
        // Only valid numbers
        const finalValue = Number(value) || 0;

        // Animate from current to final
        const controls = animate(count, finalValue, {
            duration: duration,
            ease: "easeOut"
        });

        return controls.stop;
    }, [value, duration]);

    // 3. Transform the MotionValue to a string with formatting
    const displayValue = useTransform(count, (latest) => {
        // Format as Indian Currency: ₹1,23,456
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(latest);
    });

    return <motion.span className={className}>{displayValue}</motion.span>;
};

export default CountUp;
