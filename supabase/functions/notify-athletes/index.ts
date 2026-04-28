import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  filterByPreferences,
  type NotificationCategory,
} from "../_shared/notification-preferences.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotifyAthletesRequest {
  athletes: Array<{
    name: string;
    email?: string;
    phone?: string;
    user_id?: string;
  }>;
  subject: string;
  message: string;
  channels: ("email" | "sms" | "push")[];
  eventType: "session" | "match" | "event" | "custom" | "convocation";
  eventDetails?: {
    date?: string;
    time?: string;
    location?: string;
  };
}

function eventTypeToCategory(t: NotifyAthletesRequest["eventType"]): NotificationCategory {
  switch (t) {
    case "session": return "sessions";
    case "match": return "matches";
    case "convocation": return "convocations";
    default: return "sessions";
  }
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

    const { athletes, subject, message, channels, eventType, eventDetails }: NotifyAthletesRequest = await req.json();

    if (!athletes || athletes.length === 0) {
      throw new Error("No athletes provided");
    }

    if (!channels || channels.length === 0) {
      throw new Error("No notification channels selected");
    }

    const results = {
      emailsSent: 0,
      smsSent: 0,
      pushSent: 0,
      errors: [] as string[],
    };

    // Build HTML email content
    const buildEmailContent = (athleteName: string) => {
      const eventInfo = eventDetails ? `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          ${eventDetails.date ? `<p style="margin: 4px 0;"><strong>📅 Date:</strong> ${eventDetails.date}</p>` : ""}
          ${eventDetails.time ? `<p style="margin: 4px 0;"><strong>🕐 Heure:</strong> ${eventDetails.time}</p>` : ""}
          ${eventDetails.location ? `<p style="margin: 4px 0;"><strong>📍 Lieu:</strong> ${eventDetails.location}</p>` : ""}
        </div>
      ` : "";

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🏉 CocoriCoach</h1>
            </div>
            <div style="padding: 32px;">
              <p style="color: #4b5563; margin: 0 0 8px 0;">Bonjour <strong>${athleteName}</strong>,</p>
              <h2 style="color: #1f2937; margin: 16px 0;">${subject}</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 0 0 16px 0; white-space: pre-wrap;">${message}</p>
              ${eventInfo}
            </div>
            <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} CocoriCoach - Notification automatique
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    };

    // Send notifications for each athlete
    for (const athlete of athletes) {
      // Send email if channel selected and email available
      if (channels.includes("email") && athlete.email) {
        try {
          const emailResponse = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_email_tokens: [athlete.email],
              email_subject: subject,
              email_body: buildEmailContent(athlete.name),
              email_from_name: "CocoriCoach",
            }),
          });

          if (emailResponse.ok) {
            results.emailsSent++;
            console.log(`Email sent to ${athlete.email}`);
          } else {
            const errorData = await emailResponse.json();
            console.error(`Failed to send email to ${athlete.email}:`, errorData);
            results.errors.push(`Email ${athlete.email}: ${JSON.stringify(errorData)}`);
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`Error sending email to ${athlete.email}:`, e);
          results.errors.push(`Email ${athlete.email}: ${errorMessage}`);
        }
      }

      // Send SMS if channel selected and phone available
      if (channels.includes("sms") && athlete.phone) {
        try {
          // Format phone number (ensure it starts with +)
          let formattedPhone = athlete.phone.replace(/\s/g, "");
          if (!formattedPhone.startsWith("+")) {
            // Assume French number if no country code
            if (formattedPhone.startsWith("0")) {
              formattedPhone = "+33" + formattedPhone.substring(1);
            } else {
              formattedPhone = "+" + formattedPhone;
            }
          }

          // Build SMS content (max 160 chars ideally)
          let smsContent = `${subject}\n${message}`;
          if (eventDetails?.date) smsContent += `\n📅 ${eventDetails.date}`;
          if (eventDetails?.time) smsContent += ` à ${eventDetails.time}`;
          if (eventDetails?.location) smsContent += `\n📍 ${eventDetails.location}`;
          
          // Truncate if too long
          if (smsContent.length > 300) {
            smsContent = smsContent.substring(0, 297) + "...";
          }

          const smsResponse = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_phone_numbers: [formattedPhone],
              sms_from: "CocoriCoach",
              contents: { en: smsContent },
              name: `SMS to ${athlete.name}`,
            }),
          });

          if (smsResponse.ok) {
            results.smsSent++;
            console.log(`SMS sent to ${formattedPhone}`);
          } else {
            const errorData = await smsResponse.json();
            console.error(`Failed to send SMS to ${formattedPhone}:`, errorData);
            results.errors.push(`SMS ${athlete.phone}: ${JSON.stringify(errorData)}`);
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`Error sending SMS to ${athlete.phone}:`, e);
          results.errors.push(`SMS ${athlete.phone}: ${errorMessage}`);
        }
      }

      // Send push notification if channel selected
      if (channels.includes("push") && athlete.email) {
        try {
          // Build push content
          let pushMessage = message;
          if (eventDetails?.date) pushMessage += `\n📅 ${eventDetails.date}`;
          if (eventDetails?.time) pushMessage += ` à ${eventDetails.time}`;
          if (eventDetails?.location) pushMessage += `\n📍 ${eventDetails.location}`;

          const pushResponse = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_aliases: {
                external_id: [athlete.email],
              },
              target_channel: "push",
              headings: { en: subject, fr: subject },
              contents: { en: pushMessage, fr: pushMessage },
              name: `Push to ${athlete.name}`,
            }),
          });

          if (pushResponse.ok) {
            results.pushSent++;
            console.log(`Push sent for ${athlete.email}`);
          } else {
            const errorData = await pushResponse.json();
            console.error(`Failed to send push for ${athlete.email}:`, errorData);
            results.errors.push(`Push ${athlete.email}: ${JSON.stringify(errorData)}`);
          }
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`Error sending push for ${athlete.email}:`, e);
          results.errors.push(`Push ${athlete.email}: ${errorMessage}`);
        }
      }
    }

    console.log("Notification results:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        ...results,
        totalAthletes: athletes.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in notify-athletes:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
