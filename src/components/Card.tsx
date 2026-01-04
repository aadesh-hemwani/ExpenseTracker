import { motion, HTMLMotionProps } from "framer-motion";
import { useMemo, ElementType, ReactNode } from "react";

interface CardProps extends HTMLMotionProps<"div"> {
  children?: ReactNode;
  className?: string;
  as?: ElementType;
}

const Card = ({
  children,
  className = "",
  as: Component = "div",
  ...props
}: CardProps) => {
  // @ts-ignore - Dynamic motion component creation is tricky to type strictly without casting
  const MotionComponent = useMemo(() => motion.create(Component), [Component]);

  return (
    <MotionComponent
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className={`bg-surface p-6 rounded-3xl border border-subtle shadow-sm transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};

export default Card;
