import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <motion.div
        className={cn("rounded-full border-2 border-primary border-t-transparent", sizeClasses[size])}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="h-16 w-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
          <span className="text-3xl">💬</span>
        </div>
        <h1 className="text-2xl font-bold gradient-text">ChatFlow</h1>
        <LoadingSpinner />
      </motion.div>
    </div>
  );
}
