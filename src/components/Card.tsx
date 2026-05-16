import React, { memo } from "react";
import { motion } from "framer-motion";

interface CardProps extends React.ComponentPropsWithoutRef<typeof motion.div> {
  children?: React.ReactNode;
  className?: string;
}

const Card = memo(({
  children,
  className = "",
  ...props
}: CardProps) => {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`glass-card p-6 rounded-2xl shadow-sm border-transparent dark:border-none ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});

Card.displayName = "Card";

export default Card;

