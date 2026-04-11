import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves image URLs for bowling ball catalog entries.
 * Checks both the `image_url` column and falls back to storage files.
 * Returns a Map<ballCatalogId, resolvedImageUrl>.
 */
export async function resolveBallCatalogImages(
  catalogBalls: { id: string; image_url?: string | null }[]
): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  // First, use any existing image_url from catalog
  for (const ball of catalogBalls) {
    if (ball.image_url) {
      imageMap.set(ball.id, ball.image_url);
    }
  }

  // For balls without image_url, check storage
  const missingIds = catalogBalls
    .filter((b) => !imageMap.has(b.id))
    .map((b) => b.id);

  if (missingIds.length === 0) return imageMap;

  try {
    const { data: storageFiles } = await supabase.storage
      .from("bowling-ball-images")
      .list("balls", { limit: 500, sortBy: { column: "name", order: "asc" } });

    if (storageFiles) {
      for (const file of storageFiles) {
        const ballId = file.name.replace(/\.[^.]+$/, "");
        if (missingIds.includes(ballId) && !imageMap.has(ballId)) {
          const { data } = supabase.storage
            .from("bowling-ball-images")
            .getPublicUrl(`balls/${file.name}`);
          if (data?.publicUrl) {
            imageMap.set(ballId, data.publicUrl);
          }
        }
      }
    }
  } catch {
    // Storage not available, continue with what we have
  }

  return imageMap;
}
