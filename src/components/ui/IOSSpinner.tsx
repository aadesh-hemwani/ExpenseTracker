import { memo } from "react";

interface IOSSpinnerProps {
  color?: string;
  size?: number;
  className?: string;
}

const IOSSpinner = memo(({
  color = "currentColor",
  size = 24,
  className = "",
}: IOSSpinnerProps) => {
  const petals = Array.from({ length: 12 });

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size, color }}
    >
      {petals.map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-0 w-[8%] h-[28%] bg-current rounded-full origin-[50%_175%] animate-spinner-fade"
          style={{
            transform: `rotate(${i * 30}deg) translateX(-50%)`,
            animationDelay: `${-1.2 + i * 0.1}s`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
});

IOSSpinner.displayName = "IOSSpinner";

export default IOSSpinner;

