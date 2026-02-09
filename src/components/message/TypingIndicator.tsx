import { motion, AnimatePresence } from "framer-motion";

interface TypingUser {
  userId: string;
  displayName: string;
}

interface TypingIndicatorProps {
  typingUsers?: TypingUser[];
  userName?: string; // Legacy support
}

export function TypingIndicator({ typingUsers = [], userName }: TypingIndicatorProps) {
  // Support both old single user and new multiple users format
  const usersTyping = userName 
    ? [{ userId: 'legacy', displayName: userName }] 
    : typingUsers;

  if (usersTyping.length === 0) return null;

  const getTypingText = () => {
    if (usersTyping.length === 1) {
      return `${usersTyping[0].displayName} está digitando...`;
    } else if (usersTyping.length === 2) {
      return `${usersTyping[0].displayName} e ${usersTyping[1].displayName} estão digitando...`;
    } else {
      return `${usersTyping[0].displayName} e mais ${usersTyping.length - 1} estão digitando...`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
      >
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
        <span>{getTypingText()}</span>
      </motion.div>
    </AnimatePresence>
  );
}
