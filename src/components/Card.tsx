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
      className={`bg-white dark:bg-dark-card p-6 rounded-2xl border-[0.5px] border-gray-300/20 dark:border-white/10 dark:shadow-none shadow-[0_0_20px_rgba(70,70,70,0.15)] transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};

export default Card;
