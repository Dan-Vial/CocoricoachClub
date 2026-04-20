import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendGlobalNotificationRequest {
  title: string;
  message: string;
  target_type: "all" | "staff" | "club" | "client";
  target_ids?: string[]; // club ids OR client ids depending on target_type
  channels: {
    push?: boolean;
    email?: boolean;
  };
  notification_type?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is super admin
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

    const { data: isSuperAdmin } = await authClient.rpc("is_super_admin", {
      _user_id: user.id,
    });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
    const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("OneSignal credentials not configured");
    }

    const body: SendGlobalNotificationRequest = await req.json();
    const { title, message, target_type, target_ids = [], channels, notification_type = "info" } = body;

    if (!title || !message) {
      return new Response(JSON.stringify({ error: "Missing title or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Resolve target club ids ────────────────────────────────────────────
    let clubIds: string[] = [];

    if (target_type === "client") {
      if (target_ids.length === 0) {
        return new Response(JSON.stringify({ error: "No client selected" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: clientClubs, error: ccErr } = await supabase
        .from("clubs")
        .select("id")
        .in("client_id", target_ids)
        .eq("is_active", true);
      if (ccErr) throw ccErr;
      clubIds = (clientClubs ?? []).map((c) => c.id);
    } else if (target_type === "club") {
      clubIds = target_ids;
    }

    // ── Resolve target user ids ────────────────────────────────────────────
    const userIdSet = new Set<string>();

    if (target_type === "all") {
      // All approved users
      const { data: approved, error } = await supabase
        .from("approved_users")
        .select("user_id");
      if (error) throw error;
      (approved ?? []).forEach((u) => u.user_id && userIdSet.add(u.user_id));
    } else if (target_type === "staff") {
      // All club members (staff roles, not athletes)
      const { data: members, error } = await supabase
        .from("club_members")
        .select("user_id, role");
      if (error) throw error;
      (members ?? []).forEach((m) => {
        if (m.user_id && m.role !== "athlete") userIdSet.add(m.user_id);
      });
    } else if (target_type === "club" || target_type === "client") {
      if (clubIds.length === 0) {
        return new Response(JSON.stringify({ error: "No target clubs resolved" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // club_members
      const { data: members, error: memErr } = await supabase
        .from("club_members")
        .select("user_id")
        .in("club_id", clubIds);
      if (memErr) throw memErr;
      (members ?? []).forEach((m) => m.user_id && userIdSet.add(m.user_id));

      // club owners
      const { data: ownerClubs, error: ownErr } = await supabase
        .from("clubs")
        .select("user_id")
        .in("id", clubIds);
      if (ownErr) throw ownErr;
      (ownerClubs ?? []).forEach((c) => c.user_id && userIdSet.add(c.user_id));

      // category members in those clubs (athletes)
      const { data: cats, error: catErr } = await supabase
        .from("categories")
        .select("id")
        .in("club_id", clubIds);
      if (catErr) throw catErr;
      const catIds = (cats ?? []).map((c) => c.id);

      if (catIds.length > 0) {
        const { data: catMembers, error: cmErr } = await supabase
          .from("category_members")
          .select("user_id")
          .in("category_id", catIds);
        if (cmErr) throw cmErr;
        (catMembers ?? []).forEach((m) => m.user_id && userIdSet.add(m.user_id));
      }
    }

    const userIds = Array.from(userIdSet);
    console.log(`[send-global-notification] Resolved ${userIds.length} target users (target_type=${target_type})`);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, push_sent: 0, email_sent: 0, total_users: 0, warning: "No target users found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch emails for target users
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    if (profErr) throw profErr;

    const emails = (profiles ?? []).filter((p) => p.email).map((p) => p.email!);

    let pushSent = 0;
    let emailSent = 0;
    const errors: string[] = [];

    // ── Insert in-app notifications (best effort) ──────────────────────────
    try {
      const inAppRecords = userIds.map((uid) => ({
        user_id: uid,
        title,
        message,
        notification_type: "global",
        notification_subtype: notification_type,
        priority: notification_type === "alert" ? "high" : "normal",
      }));
      // Chunk inserts to avoid payload limits
      const chunkSize = 500;
      for (let i = 0; i < inAppRecords.length; i += chunkSize) {
        const chunk = inAppRecords.slice(i, i + chunkSize);
        const { error: insErr } = await supabase.from("notifications").insert(chunk);
        if (insErr) console.warn("In-app insert chunk error:", insErr.message);
      }
    } catch (e) {
      console.warn("In-app notifications failed:", e);
    }

    // ── PUSH via OneSignal external_id (= user.id) ─────────────────────────
    if (channels.push && userIds.length > 0) {
      // OneSignal supports up to 2000 aliases per request
      const chunkSize = 1500;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        try {
          const resp = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_aliases: { external_id: chunk },
              target_channel: "push",
              headings: { en: title, fr: title },
              contents: { en: message, fr: message },
              name: `Global notification (${target_type})`,
            }),
          });
          const json = await resp.json();
          if (resp.ok && !json.errors) {
            pushSent += chunk.length;
            console.log(`Push chunk OK (${chunk.length} users):`, json.id);
          } else {
            console.error("Push error:", json);
            errors.push(`Push: ${JSON.stringify(json.errors ?? json)}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Push exception:", msg);
          errors.push(`Push: ${msg}`);
        }
      }
    }

    // ── EMAIL via OneSignal include_email_tokens ───────────────────────────
    if (channels.email && emails.length > 0) {
      const emailHtml = `
        <!DOCTYPE html>
        <html><head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f5;margin:0;padding:20px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#059669 0%,#10b981 100%);padding:32px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:24px;">🏉 CocoriCoach Club</h1>
            </div>
            <div style="padding:32px;">
              <h2 style="color:#1f2937;margin:0 0 16px 0;">${title}</h2>
              <p style="color:#4b5563;line-height:1.6;white-space:pre-wrap;margin:0;">${message}</p>
            </div>
            <div style="background:#f9fafb;padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} CocoriCoach Club</p>
            </div>
          </div>
        </body></html>
      `;

      const chunkSize = 1500;
      for (let i = 0; i < emails.length; i += chunkSize) {
        const chunk = emails.slice(i, i + chunkSize);
        try {
          const resp = await fetch("https://api.onesignal.com/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify({
              app_id: ONESIGNAL_APP_ID,
              include_email_tokens: chunk,
              email_subject: title,
              email_body: emailHtml,
              email_from_name: "CocoriCoach Club",
              name: `Global email (${target_type})`,
            }),
          });
          const json = await resp.json();
          if (resp.ok && !json.errors) {
            emailSent += chunk.length;
            console.log(`Email chunk OK (${chunk.length} recipients):`, json.id);
          } else {
            console.error("Email error:", json);
            errors.push(`Email: ${JSON.stringify(json.errors ?? json)}`);
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("Email exception:", msg);
          errors.push(`Email: ${msg}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_users: userIds.length,
        total_emails: emails.length,
        push_sent: pushSent,
        email_sent: emailSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-global-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
