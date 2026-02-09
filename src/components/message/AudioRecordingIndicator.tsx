import { motion } from "framer-motion";
import { Mic, Square, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRecordingTime } from "@/hooks/useAudioRecorder";
import { cn } from "@/lib/utils";

interface AudioRecordingIndicatorProps {
  recordingTime: number;
  isPaused: boolean;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  className?: string;
}

export function AudioRecordingIndicator({
  recordingTime,
  isPaused,
  onStop,
  onPause,
  onResume,
  onCancel,
  className,
}: AudioRecordingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20",
        className
      )}
    >
      {/* Recording indicator */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={isPaused ? {} : { scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="relative"
        >
          <div className={cn(
            "h-3 w-3 rounded-full",
            isPaused ? "bg-muted-foreground" : "bg-destructive"
          )} />
          {!isPaused && (
            <motion.div
              animate={{ scale: [1, 2], opacity: [0.5, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0 h-3 w-3 rounded-full bg-destructive"
            />
          )}
        </motion.div>
        <span className="text-sm font-medium text-destructive">
          {formatRecordingTime(recordingTime)}
        </span>
      </div>

      {/* Waveform animation */}
      <div className="flex-1 flex items-center justify-center gap-0.5">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={isPaused ? { height: 4 } : {
              height: [4, Math.random() * 16 + 4, 4],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.05,
            }}
            className="w-1 bg-destructive/50 rounded-full"
          />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Pause/Resume */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full"
          onClick={isPaused ? onResume : onPause}
        >
          {isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </Button>

        {/* Cancel */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Stop and send */}
        <Button
          size="icon"
          className="h-8 w-8 rounded-full gradient-primary text-white"
          onClick={onStop}
        >
          <Square className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}
