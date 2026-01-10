import React from "react";

interface IOSSpinnerProps {
  color?: string; // Hex, rgb, or tailwind text class (if handled via className)
  size?: number; // Size in pixels
  className?: string;
}

const IOSSpinner: React.FC<IOSSpinnerProps> = ({
  color = "currentColor", // This will be used as inline style color if not a class
  size = 24,
  className = "",
}) => {
  // 12 petals for iOS style
  const petals = Array.from({ length: 12 });

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size, color: color }}
    >
      {petals.map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-0 w-[8%] h-[28%] bg-current rounded-full origin-[50%_175%] animate-spinner-fade"
          style={{
            transform: `rotate(${i * 30}deg) translateX(-50%)`, // Center the petal horizontally, then rotate
            animationDelay: `${-1.2 + i * 0.1}s`,
            opacity: 0, // Starts invisible
          }}
        />
      ))}
    </div>
  );
};

export default IOSSpinner;
