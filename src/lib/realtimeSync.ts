import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type ProfileLite = { display_name: string | null; avatar_url: string | null };

const profileCache = new Map<string, ProfileLite>();
const inflight = new Map<string, Promise<ProfileLite>>();

/**
 * Fast profile lookup for realtime inserts. Tries in-memory cache, then any
 * profile already known to React Query, before doing a network round-trip.
 * Same userId fetched concurrently is coalesced into a single request.
 */
export async function getProfileCached(
  userId: string,
  queryClient?: QueryClient,
): Promise<ProfileLite> {
  if (!userId) return { display_name: null, avatar_url: null };

  const cached = profileCache.get(userId);
  if (cached) return cached;

  if (queryClient) {
    const fromQueries = queryClient.getQueryData<ProfileLite>(["profile", userId]);
    if (fromQueries && (fromQueries.display_name || fromQueries.avatar_url)) {
      profileCache.set(userId, fromQueries);
      return fromQueries;
    }
  }

  const existing = inflight.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle();
    const result: ProfileLite = data ?? { display_name: null, avatar_url: null };
    profileCache.set(userId, result);
    if (queryClient) queryClient.setQueryData(["profile", userId], result);
    return result;
  })();

  inflight.set(userId, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(userId);
  }
}

/**
 * Backwards-compatible shim: hooks that imported `fetchMessageProfile`
 * keep working but now hit the cached path.
 */
export async function fetchMessageProfile(userId: string): Promise<ProfileLite> {
  return getProfileCached(userId);
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