import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchMessageProfile(userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  return data ?? { display_name: null, avatar_url: null };
}

export function scheduleQuerySync(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
  delayMs = 1200,
) {
  setTimeout(() => {
    queryKeys.forEach((queryKey) => {
      void queryClient.invalidateQueries({ queryKey });
    });
  }, delayMs);
}