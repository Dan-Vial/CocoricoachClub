import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { bodyPart, injuryType, tapingType, phaseDescription, language } = await req.json();

    if (!bodyPart || !tapingType) {
      return new Response(
        JSON.stringify({ error: "bodyPart and tapingType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine language for instructions
    const lang = (language || "fr").toLowerCase();
    const isFrench = lang.startsWith("fr");

    const languageInstruction = isFrench
      ? "IMPORTANT: All text labels, step descriptions, numbered instructions, and any text in the image MUST be written in French."
      : "IMPORTANT: All text labels, step descriptions, numbered instructions, and any text in the image MUST be written in English.";

    const stepLabel = isFrench ? "Étape" : "Step";
    const responseLanguageInstruction = isFrench
      ? `Dans le texte de ta réponse, fournis des consignes de taping numérotées et détaillées en français, sous la forme:\n${stepLabel} 1 : ...\n${stepLabel} 2 : ...\netc.\nChaque étape doit être claire, concise et actionnable pour un praticien.`
      : `In the text of your response, provide numbered, detailed taping instructions in English, in the form:\n${stepLabel} 1: ...\n${stepLabel} 2: ...\netc.\nEach step must be clear, concise and actionable for a practitioner.`;

    const prompt = `Generate a clean, professional medical illustration showing how to apply ${tapingType} taping/strapping on a ${bodyPart} for ${injuryType || "injury rehabilitation"}. 
Phase context: ${phaseDescription || "rehabilitation"}.
The illustration should be:
- A clear anatomical diagram on a clean white background
- Show the tape placement with colored tape strips (blue for kinesiology tape, white for rigid tape)
- Include directional arrows showing application direction
- Show the body part from the most useful angle for tape application
- Professional medical illustration style, not cartoonish
- Include numbered steps if multiple tape strips are needed
- Clean, minimal style suitable for medical/sports rehabilitation documentation
${languageInstruction}

${responseLanguageInstruction}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textContent = data.choices?.[0]?.message?.content || "";

    if (!imageData) {
      throw new Error("No image generated");
    }

    // Upload image to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Decode base64 image
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `taping-diagrams/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("exercise-images")
      .upload(fileName, imageBytes, { contentType: "image/png" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload diagram");
    }

    const { data: publicUrl } = supabase.storage
      .from("exercise-images")
      .getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl.publicUrl,
        instructions: textContent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-taping-diagram error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
