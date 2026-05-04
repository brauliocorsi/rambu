import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserStats {
  channelMessages: number;
  dmMessages: number;
  groupMessages: number;
  total: number;
  byDay: { date: string; count: number }[];
}

export function useUserStats(days: number = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-stats", user?.id, days],
    queryFn: async (): Promise<UserStats> => {
      if (!user) {
        return { channelMessages: 0, dmMessages: 0, groupMessages: 0, total: 0, byDay: [] };
      }
      const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [c, d, g] = await Promise.all([
        supabase
          .from("messages")
          .select("id, created_at", { count: "exact" })
          .eq("user_id", user.id)
          .gte("created_at", from),
        supabase
          .from("dm_messages")
          .select("id, created_at", { count: "exact" })
          .eq("user_id", user.id)
          .gte("created_at", from),
        supabase
          .from("dm_group_messages")
          .select("id, created_at", { count: "exact" })
          .eq("user_id", user.id)
          .gte("created_at", from),
      ]);

      const byDayMap = new Map<string, number>();
      [...(c.data || []), ...(d.data || []), ...(g.data || [])].forEach((m: any) => {
        const day = new Date(m.created_at).toISOString().slice(0, 10);
        byDayMap.set(day, (byDayMap.get(day) || 0) + 1);
      });

      const byDay = Array.from({ length: days }, (_, i) => {
        const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        return { date: key, count: byDayMap.get(key) || 0 };
      });

      return {
        channelMessages: c.count || 0,
        dmMessages: d.count || 0,
        groupMessages: g.count || 0,
        total: (c.count || 0) + (d.count || 0) + (g.count || 0),
        byDay,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}