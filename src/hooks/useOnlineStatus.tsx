import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConnectionState = "online" | "offline" | "reconnecting";

/**
 * Tracks browser online status + Supabase realtime connectivity.
 * Returns "reconnecting" briefly on transitions for nicer UX.
 */
export function useOnlineStatus(): ConnectionState {
  const [state, setState] = useState<ConnectionState>(
    typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "online",
  );

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const goOffline = () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      setState("offline");
    };
    const goOnline = () => {
      setState("reconnecting");
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => setState("online"), 1500);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Listen for realtime channel disconnects via heartbeat probe
    const channel = supabase.channel("connection-probe");
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (navigator.onLine) setState("reconnecting");
      } else if (status === "SUBSCRIBED") {
        if (navigator.onLine) {
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => setState("online"), 500);
        }
      }
    });

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  return state;
}