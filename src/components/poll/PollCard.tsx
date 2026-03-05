import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Check, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { usePollByMessageId, useVotePoll } from "@/hooks/usePolls";
import { cn } from "@/lib/utils";

interface Props {
  messageId: string;
}

export function PollCard({ messageId }: Props) {
  const { data: poll, isLoading } = usePollByMessageId(messageId);
  const votePoll = useVotePoll();
  const [justVoted, setJustVoted] = useState<string | null>(null);

  if (isLoading || !poll) return null;

  const handleVote = (optionId: string) => {
    setJustVoted(optionId);
    votePoll.mutate({
      pollOptionId: optionId,
      pollId: poll.id,
      messageId,
      isMultipleChoice: poll.is_multiple_choice,
    });
    setTimeout(() => setJustVoted(null), 600);
  };

  return (
    <div className="mt-2 rounded-xl border border-border bg-card p-3 max-w-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Enquete</span>
        </div>
        <div className="flex items-center gap-1.5">
          {poll.is_multiple_choice && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Múltipla escolha
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            <Users className="h-3 w-3 mr-0.5" />
            {poll.total_votes}
          </Badge>
        </div>
      </div>

      {/* Question */}
      <p className="text-sm font-medium mb-3">{poll.question}</p>

      {/* Options */}
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const percentage = poll.total_votes > 0
            ? Math.round((option.vote_count / poll.total_votes) * 100)
            : 0;

          return (
            <motion.button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={votePoll.isPending}
              layout
              whileTap={{ scale: 0.97 }}
              className={cn(
                "w-full relative rounded-lg border p-2.5 text-left transition-all overflow-hidden",
                option.voted_by_me
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-secondary/30"
              )}
            >
              {/* Progress bar background */}
              <motion.div
                className={cn(
                  "absolute inset-0 rounded-lg",
                  option.voted_by_me ? "bg-primary/10" : "bg-muted/30"
                )}
                initial={false}
                animate={{ width: `${percentage}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />

              {/* Vote flash effect */}
              <AnimatePresence>
                {justVoted === option.id && (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-primary/20"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                  />
                )}
              </AnimatePresence>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <AnimatePresence mode="wait">
                    {option.voted_by_me && (
                      <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      >
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <span className={cn("text-xs", option.voted_by_me && "font-medium")}>
                    {option.option_text}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {/* Voter avatars */}
                  {!poll.is_anonymous && option.voters.length > 0 && (
                    <div className="flex -space-x-1">
                      {option.voters.slice(0, 3).map((voter) => (
                        <Avatar key={voter.id} className="h-4 w-4 border border-background">
                          <AvatarImage src={voter.avatar_url || undefined} />
                          <AvatarFallback className="text-[7px]">
                            {(voter.display_name || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {option.voters.length > 3 && (
                        <span className="text-[9px] text-muted-foreground ml-1">
                          +{option.voters.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  <motion.span
                    key={percentage}
                    initial={{ scale: 1.3, color: "hsl(var(--primary))" }}
                    animate={{ scale: 1, color: "hsl(var(--muted-foreground))" }}
                    transition={{ duration: 0.4 }}
                    className="text-[10px] font-medium"
                  >
                    {percentage}%
                  </motion.span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
