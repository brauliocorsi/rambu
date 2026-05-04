import { useRef, useState, useCallback } from "react";

const TRIGGER_PX = 70;
const MAX_PX = 100;

/**
 * Touch swipe-to-reply gesture for message bubbles.
 * Detects predominantly horizontal swipes (LTR) and calls onReply on release if past threshold.
 */
export function useSwipeToReply(onReply?: () => void) {
  const [offset, setOffset] = useState(0);
  const [active, setActive] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<"x" | "y" | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !onReply) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
    setActive(true);
  }, [onReply]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!active || !onReply) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (locked.current === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (locked.current !== "x") return;
    if (dx <= 0) {
      setOffset(0);
      return;
    }
    const eased = Math.min(MAX_PX, dx * 0.6);
    setOffset(eased);
  }, [active, onReply]);

  const reset = useCallback(() => {
    if (offset >= TRIGGER_PX) {
      onReply?.();
      try {
        (navigator as any).vibrate?.(15);
      } catch { /* noop */ }
    }
    setOffset(0);
    setActive(false);
    locked.current = null;
  }, [offset, onReply]);

  return {
    offset,
    triggered: offset >= TRIGGER_PX,
    bind: {
      onTouchStart,
      onTouchMove,
      onTouchEnd: reset,
      onTouchCancel: reset,
    },
  };
}