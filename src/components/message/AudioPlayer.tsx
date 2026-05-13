import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AudioPlayerProps {
  url: string;
  compact?: boolean;
  className?: string;
}

export function AudioPlayer({ url, compact = false, className }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoaded(true);
      setHasError(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = () => {
      console.error("Audio playback error:", audio.error);
      setHasError(true);
      setIsLoaded(false);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      setHasError(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const cycleSpeed = () => {
    const order = [1, 1.5, 2];
    const next = order[(order.indexOf(speed) + 1) % order.length] ?? 1;
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = value[0];
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-xl bg-secondary/50",
          compact ? "min-w-[180px]" : "min-w-[220px]",
          className
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground flex-1">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-xs">Formato não suportado</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          onClick={() => window.open(url, '_blank')}
          title="Baixar áudio"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded-xl bg-secondary/50",
        compact ? "min-w-[180px]" : "min-w-[220px]",
        className
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "rounded-full shrink-0",
          compact ? "h-8 w-8" : "h-10 w-10",
          "bg-primary/10 hover:bg-primary/20"
        )}
        onClick={togglePlay}
        disabled={!isLoaded}
      >
        {isPlaying ? (
          <Pause className={cn(compact ? "h-4 w-4" : "h-5 w-5", "text-primary")} />
        ) : (
          <Play className={cn(compact ? "h-4 w-4" : "h-5 w-5", "text-primary", "ml-0.5")} />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1">
        {/* Waveform visualization (simplified as progress bar) */}
        <div className="relative h-6 flex items-center">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
            disabled={!isLoaded}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              disabled={!isLoaded}
              className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium tabular-nums hover:bg-primary/20 transition-colors disabled:opacity-50"
              title="Velocidade de reprodução"
            >
              {speed}x
            </button>
            <div className="flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
