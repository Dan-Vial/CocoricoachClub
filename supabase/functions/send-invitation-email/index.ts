import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  invitationType: "club_admin" | "collaborator" | "category_member" | "athlete";
  inviterName?: string;
  clubName?: string;
  categoryName?: string;
  role?: string;
  invitationLink: string;
  athleteName?: string;
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const {
      email,
      invitationType,
      inviterName,
      clubName,
      categoryName,
      role,
      invitationLink,
      athleteName,
    }: InvitationEmailRequest = await req.json();

    if (!email || !invitationType || !invitationLink) {
      throw new Error("Missing required fields: email, invitationType, invitationLink");
    }

    // Build email content based on invitation type
    let subject: string;
    let htmlContent: string;

    const roleLabels: Record<string, string> = {
      admin: "Administrateur",
      coach: "Coach",
      viewer: "Viewer (lecture seule)",
      physio: "Kinésithérapeute",
      doctor: "Médecin",
      mental_coach: "Préparateur Mental",
      prepa_physique: "Préparateur Physique",
      administratif: "Administratif",
    };

    const roleLabel = role ? roleLabels[role] || role : "";

    switch (invitationType) {
      case "club_admin":
        subject = "🏉 Invitation à rejoindre CocoriCoach comme administrateur";
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🏉 CocoriCoach</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">Plateforme de suivi sportif</p>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #1f2937; margin: 0 0 16px 0;">Bienvenue !</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                  ${inviterName ? `<strong>${inviterName}</strong> vous invite à` : "Vous êtes invité(e) à"} rejoindre <strong>CocoriCoach</strong> en tant qu'<strong>Administrateur de Club</strong>.
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                  En acceptant cette invitation, vous pourrez créer et gérer votre club, vos équipes et vos collaborateurs.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Accepter l'invitation
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                  Ce lien n'expire jamais. Si vous n'avez pas demandé cette invitation, ignorez cet email.
                </p>
              </div>
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} CocoriCoach - Tous droits réservés
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "collaborator":
        subject = `🏉 ${inviterName || "Votre club"} vous invite à rejoindre ${clubName || "l'équipe"}`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🏉 CocoriCoach</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${clubName || "Votre club"}</p>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #1f2937; margin: 0 0 16px 0;">Vous êtes invité(e) !</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                  <strong>${inviterName || "L'administrateur"}</strong> vous invite à rejoindre <strong>${clubName || "le club"}</strong> sur CocoriCoach.
                </p>
                ${roleLabel ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #166534; margin: 0; font-size: 14px;">
                    <strong>Votre rôle :</strong> ${roleLabel}
                  </p>
                </div>
                ` : ""}
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                  Cliquez sur le bouton ci-dessous pour créer votre compte et accéder aux données de l'équipe.
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Rejoindre l'équipe
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                  Ce lien n'expire jamais. Si vous n'avez pas demandé cette invitation, ignorez cet email.
                </p>
              </div>
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} CocoriCoach - Tous droits réservés
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "category_member":
        subject = `🏉 Invitation à rejoindre ${categoryName || "une catégorie"} sur CocoriCoach`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🏉 CocoriCoach</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${clubName || "Votre club"}</p>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #1f2937; margin: 0 0 16px 0;">Accès à une nouvelle catégorie</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                  <strong>${inviterName || "L'administrateur"}</strong> vous donne accès à la catégorie <strong>${categoryName || ""}</strong>.
                </p>
                ${roleLabel ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #166534; margin: 0; font-size: 14px;">
                    <strong>Votre rôle :</strong> ${roleLabel}
                  </p>
                </div>
                ` : ""}
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Accéder à la catégorie
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                  Ce lien n'expire jamais.
                </p>
              </div>
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} CocoriCoach - Tous droits réservés
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case "athlete":
        subject = `🏆 ${clubName || "Votre club"} - Crée ton compte athlète !`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🏆 Bienvenue dans l'équipe !</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${clubName || ""}</p>
              </div>
              <div style="padding: 32px;">
                <p style="font-size: 18px; color: #1f2937; margin: 0 0 16px 0;">
                  Bonjour${athleteName ? ` <strong>${athleteName}</strong>` : ""},
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0;">
                  Un compte a été créé pour toi sur <strong>CocoriCoach</strong> en tant qu'<strong>Athlète</strong>${categoryName ? ` dans la catégorie <strong>${categoryName}</strong>` : ""}.
                </p>
                <p style="color: #4b5563; line-height: 1.6; margin: 0 0 24px 0;">
                  Clique sur le bouton ci-dessous pour activer ton compte et accéder à ton espace :
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Activer mon compte
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 24px 0 0 0;">
                  Ce lien est valable 48h. Si tu n'as pas demandé cette invitation, ignore cet email.
                </p>
              </div>
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} CocoriCoach - Tous droits réservés
                </p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      default:
        throw new Error(`Unknown invitation type: ${invitationType}`);
    }

    // Auto-subscribe email to OneSignal before sending
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

    // Send email via OneSignal
    const oneSignalResponse = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_email_tokens: [email],
        email_subject: subject,
        email_body: htmlContent,
        email_from_name: "CocoriCoach",
      }),
    });

    const oneSignalData = await oneSignalResponse.json();

    if (!oneSignalResponse.ok) {
      console.error("OneSignal API error:", oneSignalData);
      throw new Error(`OneSignal API error: ${JSON.stringify(oneSignalData)}`);
    }

    console.log("Email sent successfully via OneSignal:", oneSignalData);

    return new Response(
      JSON.stringify({ success: true, data: oneSignalData }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-invitation-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
