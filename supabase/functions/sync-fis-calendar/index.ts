import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ParsedEvent {
  fis_uid: string;
  event_name: string;
  location: string;
  event_date: string; // YYYY-MM-DD
  end_date: string | null;
  discipline: string | null;
  gender: string | null;
  competition_level: string | null;
  fis_race_id: string | null;
  fis_results_url: string | null;
  fis_sector_code: string | null;
  raw_description: string | null;
}

function parseICalDate(val: string): string | null {
  // Format: 20250729 or 20250729T120000Z
  const dateStr = val.replace(/;VALUE=DATE/i, "").trim();
  if (dateStr.length >= 8) {
    const y = dateStr.substring(0, 4);
    const m = dateStr.substring(4, 6);
    const d = dateStr.substring(6, 8);
    return `${y}-${m}-${d}`;
  }
  return null;
}

function extractCategory(desc: string): string | null {
  const match = desc.match(/Category:\s*(.+?)(?:\\n|$)/);
  return match ? match[1].trim() : null;
}

function extractGender(desc: string): string | null {
  const match = desc.match(/Gender:\s*(.+?)(?:\\n|$)/);
  return match ? match[1].trim() : null;
}

function extractEvent(desc: string): string | null {
  const match = desc.match(/Event:\s*(.+?)(?:\\n|$)/);
  return match ? match[1].trim() : null;
}

function extractResultsUrl(desc: string): string | null {
  const match = desc.match(/Result\/Startlist:\s*(https?:\/\/[^\s\\]+)/);
  return match ? match[1].trim() : null;
}

function extractRaceId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/raceid=(\d+)/);
  return match ? match[1] : null;
}

function extractDiscipline(summary: string): string | null {
  const disciplines = [
    "Halfpipe", "Slopestyle", "Big Air", "Snowboard Cross",
    "Parallel Giant Slalom", "Parallel Slalom",
    "Giant Slalom", "Slalom", "Super-G", "Downhill",
    "Combined", "Alpine Combined",
  ];
  for (const d of disciplines) {
    if (summary.toLowerCase().includes(d.toLowerCase())) return d;
  }
  return null;
}

function extractSectorFromCategories(categories: string): string | null {
  // FIS-calendar-SB-SAC -> SB
  const match = categories.match(/FIS-calendar-(\w+)-/);
  return match ? match[1] : null;
}

function extractCompetitionLevel(categories: string, description: string): string | null {
  // From CATEGORIES: FIS-calendar-SB-WC -> WC
  const catMatch = categories.match(/FIS-calendar-\w+-(\w+)/);
  if (catMatch) {
    const code = catMatch[1];
    const map: Record<string, string> = {
      WC: "World Cup",
      WSC: "World Championships",
      OWG: "Olympic Winter Games",
      EC: "European Cup",
      NAC: "Nor-Am Cup",
      SAC: "South American Cup",
      ANC: "Australia New Zealand Cup",
      FIS: "FIS",
      JWC: "Junior World Championships",
      YOG: "Youth Olympic Games",
      NC: "National Championship",
    };
    return map[code] || code;
  }
  // Fallback from description Category field
  return extractCategory(description);
}

function parseICal(icalText: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const blocks = icalText.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split("END:VEVENT")[0];
    const lines = block.split("\n").map((l) => l.trim());

    let uid = "";
    let dtstart = "";
    let dtend = "";
    let summary = "";
    let location = "";
    let categories = "";
    let description = "";

    for (const line of lines) {
      if (line.startsWith("UID:")) uid = line.substring(4);
      else if (line.startsWith("DTSTART")) dtstart = line.split(":").pop() || "";
      else if (line.startsWith("DTEND")) dtend = line.split(":").pop() || "";
      else if (line.startsWith("SUMMARY:")) summary = line.substring(8);
      else if (line.startsWith("LOCATION:")) location = line.substring(9);
      else if (line.startsWith("CATEGORIES:")) categories = line.substring(11);
      else if (line.startsWith("DESCRIPTION:")) description = line.substring(12);
    }

    if (!uid || !dtstart) continue;

    const eventDate = parseICalDate(dtstart);
    if (!eventDate) continue;

    const endDateRaw = parseICalDate(dtend);
    // iCal DTEND is exclusive, subtract 1 day for actual end
    let endDate = endDateRaw;
    if (endDateRaw) {
      const ed = new Date(endDateRaw);
      ed.setDate(ed.getDate() - 1);
      endDate = ed.toISOString().split("T")[0];
    }

    const resultsUrl = extractResultsUrl(description);

    events.push({
      fis_uid: uid,
      event_name: summary,
      location: location || null,
      event_date: eventDate,
      end_date: endDate !== eventDate ? endDate : null,
      discipline: extractDiscipline(summary) || extractEvent(description),
      gender: extractGender(description),
      competition_level: extractCompetitionLevel(categories, description),
      fis_race_id: extractRaceId(resultsUrl),
      fis_results_url: resultsUrl,
      fis_sector_code: extractSectorFromCategories(categories),
      raw_description: description || null,
    });
  }

  return events;
}

function mapCompetitionLevel(level: string | null): string | null {
  if (!level) return null;
  const map: Record<string, string> = {
    "World Cup": "WC",
    "World Championships": "WSC",
    "Olympic Winter Games": "OWG",
    "European Cup": "EC",
    "FIS": "FIS",
    "South American Cup": "SAC",
    "Junior World Championships": "JWC",
  };
  return map[level] || level;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feed_id, feed_url, category_id } = await req.json();

    if (!feed_url || !category_id) {
      return new Response(
        JSON.stringify({ error: "feed_url and category_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the iCal feed
    console.log("Fetching FIS iCal feed:", feed_url);
    const feedResp = await fetch(feed_url);
    if (!feedResp.ok) {
      throw new Error(`Failed to fetch feed: ${feedResp.status}`);
    }
    const icalText = await feedResp.text();

    // Parse events
    const events = parseICal(icalText);
    console.log(`Parsed ${events.length} events from iCal feed`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get existing events for this category to detect deletions
    const { data: existingEvents } = await supabase
      .from("fis_calendar_events")
      .select("id, fis_uid, match_id")
      .eq("category_id", category_id);

    const existingMap = new Map(
      (existingEvents || []).map((e: any) => [e.fis_uid, e])
    );
    const incomingUids = new Set(events.map((e) => e.fis_uid));

    // Delete events no longer in the feed
    const deletedUids = [...existingMap.keys()].filter(
      (uid) => !incomingUids.has(uid)
    );
    if (deletedUids.length > 0) {
      // Also delete associated matches
      const deletedEvents = deletedUids
        .map((uid) => existingMap.get(uid))
        .filter(Boolean);
      const matchIdsToDelete = deletedEvents
        .map((e: any) => e.match_id)
        .filter(Boolean);

      await supabase
        .from("fis_calendar_events")
        .delete()
        .eq("category_id", category_id)
        .in("fis_uid", deletedUids);

      if (matchIdsToDelete.length > 0) {
        await supabase
          .from("matches")
          .delete()
          .in("id", matchIdsToDelete);
      }
      console.log(`Deleted ${deletedUids.length} events no longer in feed`);
    }

    // Upsert events and create/update matches
    let created = 0;
    let updated = 0;

    for (const event of events) {
      const existing = existingMap.get(event.fis_uid);

      if (existing) {
        // Update existing event
        await supabase
          .from("fis_calendar_events")
          .update({
            event_name: event.event_name,
            location: event.location,
            event_date: event.event_date,
            end_date: event.end_date,
            discipline: event.discipline,
            gender: event.gender,
            competition_level: event.competition_level,
            fis_race_id: event.fis_race_id,
            fis_results_url: event.fis_results_url,
            fis_sector_code: event.fis_sector_code,
            raw_description: event.raw_description,
          })
          .eq("id", (existing as any).id);

        // Update associated match if exists
        if ((existing as any).match_id) {
          await supabase
            .from("matches")
            .update({
              opponent: event.event_name,
              match_date: event.event_date,
              end_date: event.end_date,
              location: event.location,
              competition: event.competition_level,
              event_type: "competition",
            })
            .eq("id", (existing as any).match_id);
        }

        updated++;
      } else {
        // Create match first
        const { data: match } = await supabase
          .from("matches")
          .insert({
            category_id,
            opponent: event.event_name,
            match_date: event.event_date,
            end_date: event.end_date,
            location: event.location,
            competition: event.competition_level,
            event_type: "competition",
            is_home: false,
          })
          .select("id")
          .single();

        // Create calendar event linked to match
        await supabase.from("fis_calendar_events").insert({
          category_id,
          feed_id: feed_id || null,
          fis_uid: event.fis_uid,
          event_name: event.event_name,
          location: event.location,
          event_date: event.event_date,
          end_date: event.end_date,
          discipline: event.discipline,
          gender: event.gender,
          competition_level: event.competition_level,
          fis_race_id: event.fis_race_id,
          fis_results_url: event.fis_results_url,
          fis_sector_code: event.fis_sector_code,
          match_id: match?.id || null,
          raw_description: event.raw_description,
        });

        // Link match back to event
        if (match?.id) {
          const { data: calEvent } = await supabase
            .from("fis_calendar_events")
            .select("id")
            .eq("category_id", category_id)
            .eq("fis_uid", event.fis_uid)
            .single();

          if (calEvent) {
            await supabase
              .from("matches")
              .update({ fis_calendar_event_id: calEvent.id })
              .eq("id", match.id);
          }
        }

        created++;
      }
    }

    // Update feed last_synced_at
    if (feed_id) {
      await supabase
        .from("fis_calendar_feeds")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", feed_id);
    }

    const result = {
      success: true,
      total_events: events.length,
      created,
      updated,
      deleted: deletedUids.length,
    };

    console.log("Sync complete:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error syncing FIS calendar:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
