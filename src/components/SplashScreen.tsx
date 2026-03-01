import { motion } from "framer-motion";

const SplashScreen: React.FC = () => {
  return (
    <motion.div
      key="splash"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-body overflow-hidden"
    >
      {/* Logo Animation */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
          duration: 5,
        }}
        className="flex items-center justify-center w-24 h-24 mb-6 bg-accent/10 rounded-[2rem] relative"
      >
        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
        <img
          src="/pwa-192x192.png"
          alt="Logo"
          className="w-12 h-12 relative z-10 object-contain drop-shadow-md"
        />
      </motion.div>

      {/* Text Animation */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Expenses<span className="text-accent">.</span>
        </h1>
        <p className="text-sm font-medium text-tertiary tracking-widest uppercase">
          Where your money makes sense.
        </p>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
