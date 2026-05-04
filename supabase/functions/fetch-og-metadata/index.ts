// Fetch Open Graph metadata for a URL and cache in link_previews table.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function pickMeta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const m = html.match(re);
    if (m?.[1]) return decode(m[1]);
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
      "i",
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return decode(m2[1]);
  }
  return null;
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function pickTitle(html: string) {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decode(m[1].trim()) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache lookup (24h TTL)
    const { data: cached } = await supabase
      .from("link_previews")
      .select("*")
      .eq("url", url)
      .maybeSingle();

    const isFresh =
      cached &&
      Date.now() - new Date(cached.fetched_at).getTime() < 24 * 60 * 60 * 1000;
    if (isFresh) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let html = "";
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; RambuBot/1.0; +https://rambu.lovable.app)",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("text/html")) throw new Error("not html");
      html = (await res.text()).slice(0, 200_000);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: String(e) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const title =
      pickMeta(html, ["og:title", "twitter:title"]) ?? pickTitle(html);
    const description = pickMeta(html, [
      "og:description",
      "twitter:description",
      "description",
    ]);
    const image = pickMeta(html, ["og:image", "twitter:image"]);
    const siteName = pickMeta(html, ["og:site_name"]);

    const row = {
      url,
      title: title?.slice(0, 300) ?? null,
      description: description?.slice(0, 500) ?? null,
      image_url: image?.slice(0, 1000) ?? null,
      site_name: siteName?.slice(0, 200) ?? null,
      fetched_at: new Date().toISOString(),
    };

    await supabase.from("link_previews").upsert(row, { onConflict: "url" });

    return new Response(JSON.stringify(row), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});