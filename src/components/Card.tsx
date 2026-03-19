import { motion } from "framer-motion";
import { useMemo, ElementType, ReactNode, ComponentProps } from "react";

interface CardProps extends ComponentProps<typeof motion.div> {
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
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`glass-card p-6 rounded-3xl shadow-sm ${className}`}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};

export default Card;
