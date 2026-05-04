import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  site_name: string | null;
  fetched_at: string;
}

const URL_REGEX = /\bhttps?:\/\/[^\s<>"')]+/i;

export function extractFirstUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(URL_REGEX);
  return m ? m[0].replace(/[.,;:!?)]+$/, "") : null;
}

export function useLinkPreview(url: string | null) {
  return useQuery({
    queryKey: ["link-preview", url],
    queryFn: async (): Promise<LinkPreview | null> => {
      if (!url) return null;
      // Try cache first
      const { data: cached } = await supabase
        .from("link_previews")
        .select("*")
        .eq("url", url)
        .maybeSingle();
      if (cached) {
        const fresh =
          Date.now() - new Date(cached.fetched_at).getTime() <
          24 * 60 * 60 * 1000;
        if (fresh) return cached as LinkPreview;
      }
      // Fall back to edge function
      const { data, error } = await supabase.functions.invoke(
        "fetch-og-metadata",
        { body: { url } },
      );
      if (error) return cached as LinkPreview | null;
      return data as LinkPreview;
    },
    enabled: !!url,
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}