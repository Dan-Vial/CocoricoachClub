// Lovable : Fallbacks robustes pour éviter un crash runtime si l'env build n'injecte pas les vars

import { loadEnv } from "vite";

const FALLBACK_VARS: Record<string, string> = {
  "VITE_SUPABASE_PROJECT_ID": "mbloebaovvvgfwxsdzgo",
  "VITE_SUPABASE_PUBLISHABLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ibG9lYmFvdnZ2Z2Z3eHNkemdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMTc0NzksImV4cCI6MjA3ODU5MzQ3OX0.o2SMHIz5Vg34bhLErBlMT1Ign6enDcHTzhbIzMIkJLE",
  "VITE_SUPABASE_URL": "https://mbloebaovvvgfwxsdzgo.supabase.co",
  "VITE_ONE_SIGNAL_APP_ID": "3f2d5f09-1f41-47af-ae1d-66deb5be52a5",
  "VITE_WEBSITE_URL": "https://cocoricoachclub.com",
}

export const defineFallbackEnv = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), "");
  const definitions: Record<string, string> = {};

  for (const [key, fallbackValue] of Object.entries(FALLBACK_VARS)) {
    // Utiliser la valeur réelle ou le fallback
    const value = env[key] || fallbackValue;
    definitions[`import.meta.env.${key}`] = JSON.stringify(value);

    if (!env[key]) {
      console.warn(`⚠️ ${key} non trouvé, fallback utilisé`);
    }
  }

  return definitions;
}
