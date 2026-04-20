import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AthleteInvitationRequest {
  athleteName: string;
  athleteFirstName?: string;
  email: string;
  phone?: string;
  clubName: string;
  categoryName: string;
  invitationLink: string;
  channels: ("email" | "sms")[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!authHeader || !supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const {
      athleteName,
      athleteFirstName,
      email,
      phone,
      clubName,
      categoryName,
      invitationLink,
      channels,
    }: AthleteInvitationRequest = await req.json();

    const displayName = athleteFirstName
      ? `${athleteFirstName} ${athleteName}`
      : athleteName;

    const results: { email?: any; sms?: any } = {};

    // Auto-subscribe email to OneSignal before sending
    if (channels.includes("email") && email) {
      try {
        await fetch(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            subscriptions: [{
              type: "Email",
              token: email,
            }],
          }),
        });
      } catch (e) {
        console.log("Email subscription upsert (may already exist):", e);
      }
    }

    // Send Email
    if (channels.includes("email") && email) {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation à rejoindre ${clubName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🏆 Bienvenue dans l'équipe !</h1>
            </div>
            <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <p style="font-size: 18px; color: #18181b; margin-bottom: 20px;">
                Bonjour <strong>${displayName}</strong>,
              </p>
              <p style="font-size: 16px; color: #52525b; line-height: 1.6;">
                Tu as été invité(e) à rejoindre <strong>${clubName}</strong> dans la catégorie <strong>${categoryName}</strong>.
              </p>
              <p style="font-size: 16px; color: #52525b; line-height: 1.6;">
                Clique sur le bouton ci-dessous pour créer ton compte et accéder à ton espace athlète :
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Rejoindre l'équipe
                </a>
              </div>
              <p style="font-size: 14px; color: #71717a; margin-top: 24px;">
                Ce lien est valable pendant 7 jours et ne peut être utilisé qu'une seule fois.
              </p>
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              <p style="font-size: 12px; color: #a1a1aa; text-align: center;">
                Si tu n'as pas demandé cette invitation, tu peux ignorer cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailResponse = await fetch(
        "https://api.onesignal.com/notifications",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_email_tokens: [email],
            email_subject: `${clubName} - Invitation à rejoindre l'équipe`,
            email_body: emailHtml,
            email_from_name: clubName,
          }),
        }
      );

      results.email = await emailResponse.json();
      console.log("Email invitation sent:", results.email);
    }

    // Send SMS
    if (channels.includes("sms") && phone) {
      let formattedPhone = phone.replace(/\s+/g, "").replace(/[^\d+]/g, "");

      // Add French country code if missing
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+33" + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+33" + formattedPhone;
      }

      const smsMessage = `🏆 ${displayName}, tu as été invité(e) à rejoindre ${clubName} (${categoryName}). Crée ton compte ici : ${invitationLink}`;

      const smsResponse = await fetch(
        "https://api.onesignal.com/notifications",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_id: ONESIGNAL_APP_ID,
            include_phone_numbers: [formattedPhone],
            sms_from: clubName.substring(0, 11),
            contents: { en: smsMessage },
            name: `Athlete Invitation - ${displayName}`,
          }),
        }
      );

      results.sms = await smsResponse.json();
      console.log("SMS invitation sent:", results.sms);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending athlete invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
