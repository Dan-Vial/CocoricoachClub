/**
 * Synchronise automatiquement les records d'athlétisme (PB / SB) à partir
 * des performances saisies en compétition (competition_rounds + competition_round_stats).
 *
 * - PB (personal_best) : meilleure performance jamais réalisée → écrasée si battue
 * - SB (season_best) : meilleure performance de la saison en cours → écrasée si battue
 *
 * Pour chaque (joueur × discipline × spécialité), on calcule la meilleure perf des manches
 * du match concerné, on compare au record courant et on upsert si c'est mieux.
 *
 * Aucun record n'est dégradé : on ne touche jamais aux valeurs supérieures.
 */
import { supabase } from "@/integrations/supabase/client";
import { getDefaultUnitForDiscipline } from "./recordsHelpers";

interface RoundLike {
  player_id: string;
  final_time_seconds?: number | null;
  stats?: Record<string, number> | null;
  /** stat_data JSON brut (si récupéré depuis la BDD) */
  stat_data?: Record<string, any> | null;
  /** Date spécifique de l'épreuve (pour les compétitions multi-jours). */
  round_date?: string | null;
}

interface PlayerInfo {
  id: string;
  discipline: string | null;
  specialty: string | null;
  /** Disciplines / spécialités secondaires (athlètes multi-épreuves) */
  disciplines?: string[] | null;
  specialties?: string[] | null;
}

interface SyncOptions {
  categoryId: string;
  matchDate: string;
  matchLocation?: string | null;
  rounds: RoundLike[];
  players: PlayerInfo[];
}

/** Extrait la meilleure valeur d'une manche athlétisme. */
function extractBestFromRound(round: RoundLike, lowerIsBetter: boolean): number | null {
  if (lowerIsBetter && round.final_time_seconds != null && round.final_time_seconds > 0) {
    return round.final_time_seconds;
  }

  const data = round.stat_data ?? round.stats ?? null;
  if (!data || typeof data !== "object") return null;

  const numericValues: number[] = [];
  Object.entries(data).forEach(([key, val]) => {
    if (typeof val !== "number" || !Number.isFinite(val) || val <= 0) return;
    if (/wind|temperature|temp_|condition|ranking|lane|round|date/i.test(key)) return;
    numericValues.push(val);
  });

  if (numericValues.length === 0) return null;
  return lowerIsBetter ? Math.min(...numericValues) : Math.max(...numericValues);
}

/** Renvoie toutes les paires (discipline, spécialité) pratiquées par l'athlète. */
function listAthletePairs(player: PlayerInfo): { discipline: string; specialty: string | null }[] {
  const pairs: { discipline: string; specialty: string | null }[] = [];
  if (player.disciplines && player.disciplines.length > 0) {
    player.disciplines.forEach((d, i) => {
      pairs.push({ discipline: d, specialty: player.specialties?.[i] || null });
    });
  } else if (player.discipline) {
    pairs.push({ discipline: player.discipline, specialty: player.specialty || null });
  }
  return pairs;
}

/**
 * Met à jour les records (PB/SB) à partir des manches saisies pour un match.
 * Idempotent : ré-exécuter ne fait rien si rien n'a été amélioré.
 */
export async function syncAthleticsRecordsFromRounds(opts: SyncOptions): Promise<{
  updated: number;
}> {
  const { categoryId, matchDate, matchLocation, rounds, players } = opts;
  if (!rounds.length || !players.length) return { updated: 0 };

  const seasonYear = new Date(matchDate).getFullYear();
  const playersById = new Map(players.map((p) => [p.id, p]));

  // Récupérer les records existants pour cette catégorie (toutes saisons confondues
  // pour pouvoir comparer au PB historique).
  const { data: existingRecords, error: recordsErr } = await supabase
    .from("athletics_records" as any)
    .select(
      "id, player_id, discipline, specialty, personal_best, season_best, season_year, lower_is_better, unit, is_locked, season_id"
    )
    .eq("category_id", categoryId);
  if (recordsErr) throw recordsErr;

  type ExistingRecord = {
    id: string;
    player_id: string;
    discipline: string;
    specialty: string | null;
    personal_best: number | null;
    season_best: number | null;
    season_year: number;
    lower_is_better: boolean;
    unit: string;
    is_locked: boolean;
    season_id: string | null;
  };

  const recordsList = (existingRecords || []) as unknown as ExistingRecord[];

  // Index : `${player_id}|${discipline}|${specialty}|${season_year}`
  const recordKey = (
    playerId: string,
    discipline: string,
    specialty: string | null,
    year: number,
  ) => `${playerId}|${discipline}|${specialty || ""}|${year}`;

  const recordsByKey = new Map<string, ExistingRecord>();
  recordsList.forEach((r) => {
    recordsByKey.set(recordKey(r.player_id, r.discipline, r.specialty, r.season_year), r);
  });

  // PB historique = max/min sur toutes les saisons (peut différer du record de la saison courante).
  const bestPbByPair = new Map<string, { value: number; lowerIsBetter: boolean }>();
  recordsList.forEach((r) => {
    if (r.personal_best == null) return;
    const key = `${r.player_id}|${r.discipline}|${r.specialty || ""}`;
    const existing = bestPbByPair.get(key);
    if (!existing) {
      bestPbByPair.set(key, { value: r.personal_best, lowerIsBetter: r.lower_is_better });
    } else {
      const better = r.lower_is_better
        ? r.personal_best < existing.value
        : r.personal_best > existing.value;
      if (better) {
        bestPbByPair.set(key, { value: r.personal_best, lowerIsBetter: r.lower_is_better });
      }
    }
  });

  // Calcule la meilleure perf du match pour chaque (player, discipline, specialty)
  const bestPerfByKey = new Map<string, { value: number; lowerIsBetter: boolean; unit: string }>();

  rounds.forEach((round) => {
    const player = playersById.get(round.player_id);
    if (!player) return;

    const pairs = listAthletePairs(player);
    if (pairs.length === 0) return;

    pairs.forEach(({ discipline, specialty }) => {
      const refRecord = recordsByKey.get(recordKey(round.player_id, discipline, specialty, seasonYear));
      const lowerIsBetter =
        refRecord?.lower_is_better ?? getDefaultUnitForDiscipline(discipline, specialty).lowerIsBetter;
      const unit = refRecord?.unit ?? getDefaultUnitForDiscipline(discipline, specialty).unit;

      const value = extractBestFromRound(round, lowerIsBetter);
      if (value == null) return;

      const key = `${round.player_id}|${discipline}|${specialty || ""}`;
      const current = bestPerfByKey.get(key);
      if (!current) {
        bestPerfByKey.set(key, { value, lowerIsBetter, unit });
      } else {
        const better = lowerIsBetter ? value < current.value : value > current.value;
        if (better) bestPerfByKey.set(key, { value, lowerIsBetter, unit });
      }
    });
  });

  if (bestPerfByKey.size === 0) return { updated: 0 };

  let updatedCount = 0;

  for (const [pairKey, perf] of bestPerfByKey.entries()) {
    const [playerId, discipline, specialtyRaw] = pairKey.split("|");
    const specialty = specialtyRaw || null;
    const seasonRecord = recordsByKey.get(recordKey(playerId, discipline, specialty, seasonYear));
    const historicalPb = bestPbByPair.get(`${playerId}|${discipline}|${specialty || ""}`);

    // Le PB est-il battu ? (vs historique tout-saisons confondues)
    const beatsPb =
      historicalPb == null
        ? true
        : perf.lowerIsBetter
          ? perf.value < historicalPb.value
          : perf.value > historicalPb.value;

    // Le SB est-il battu ? (vs record de la saison en cours)
    const currentSb = seasonRecord?.season_best ?? null;
    const beatsSb =
      currentSb == null
        ? true
        : perf.lowerIsBetter
          ? perf.value < currentSb
          : perf.value > currentSb;

    // Le PB de cette ligne (saison) doit aussi être propagé si battu (cas où l'athlète n'a pas
    // encore de record historique pour cette discipline).
    const seasonPb = seasonRecord?.personal_best ?? null;
    const beatsSeasonPb =
      seasonPb == null
        ? true
        : perf.lowerIsBetter
          ? perf.value < seasonPb
          : perf.value > seasonPb;

    if (!beatsSb && !beatsPb && !beatsSeasonPb) continue;

    // Si la ligne est verrouillée (saison clôturée), on n'écrit pas dessus :
    // on laisse la donnée intacte (la nouvelle saison aura sa propre ligne).
    if (seasonRecord?.is_locked) continue;

    if (seasonRecord) {
      const update: Record<string, any> = {};
      if (beatsSb) {
        update.season_best = perf.value;
        update.season_best_date = matchDate;
        update.season_best_location = matchLocation || null;
      }
      if (beatsPb || beatsSeasonPb) {
        update.personal_best = perf.value;
        update.personal_best_date = matchDate;
        update.personal_best_location = matchLocation || null;
      }
      if (Object.keys(update).length === 0) continue;

      const { error } = await supabase
        .from("athletics_records" as any)
        .update(update)
        .eq("id", seasonRecord.id);
      if (error) throw error;
      updatedCount++;
    } else {
      const insertPayload: Record<string, any> = {
        player_id: playerId,
        category_id: categoryId,
        discipline,
        specialty,
        season_year: seasonYear,
        unit: perf.unit,
        lower_is_better: perf.lowerIsBetter,
        season_best: perf.value,
        season_best_date: matchDate,
        season_best_location: matchLocation || null,
      };
      // Propagation du PB : on prend la meilleure valeur entre l'historique et la nouvelle perf.
      const newPb = historicalPb
        ? perf.lowerIsBetter
          ? Math.min(historicalPb.value, perf.value)
          : Math.max(historicalPb.value, perf.value)
        : perf.value;
      insertPayload.personal_best = newPb;
      insertPayload.personal_best_date = matchDate;
      insertPayload.personal_best_location = matchLocation || null;

      const { error } = await supabase
        .from("athletics_records" as any)
        .upsert(insertPayload, { onConflict: "player_id,discipline,specialty,season_year" });
      if (error) throw error;
      updatedCount++;
    }
  }

  return { updated: updatedCount };
}
