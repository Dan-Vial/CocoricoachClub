import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getDisciplineLabel, getSpecialtyLabel } from "@/lib/constants/athleticProfiles";

export interface AthleticsLineupPlayer {
  playerId: string;
  playerName: string;
  /** All discipline/specialty pairs the athlete practices */
  pairs: { discipline: string; specialty: string | null }[];
}

export interface AthleticsLineupEntry {
  playerId: string;
  discipline: string | null;
  specialty: string | null;
  isSelected: boolean;
  /** Order in which the athlete starts the events of this competition (1, 2, 3…). */
  startOrder?: number | null;
}

interface AthleticsLineupSectionProps {
  players: AthleticsLineupPlayer[];
  entries: AthleticsLineupEntry[];
  onToggle: (
    playerId: string,
    discipline: string | null,
    specialty: string | null,
    selected: boolean,
  ) => void;
  onPromoteFirst?: (
    playerId: string,
    discipline: string | null,
    specialty: string | null,
  ) => void;
}

const eqKey = (
  e: AthleticsLineupEntry,
  playerId: string,
  discipline: string | null,
  specialty: string | null,
) =>
  e.playerId === playerId &&
  (e.discipline ?? null) === (discipline ?? null) &&
  (e.specialty ?? null) === (specialty ?? null);

export function AthleticsLineupSection({
  players,
  entries,
  onToggle,
  onPromoteFirst,
}: AthleticsLineupSectionProps) {
  if (!players || players.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-4">
        Aucun athlète dans cette catégorie
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pour chaque athlète, coche une ou plusieurs épreuves sur lesquelles tu
        l'inscris dans cette compétition. L'ordre dans lequel tu coches définit
        l'ordre de départ. Clique sur le badge numéroté pour mettre une épreuve
        en premier.
      </p>
      {players.map((player) => {
        const playerEntries = entries.filter(
          (e) => e.playerId === player.playerId && e.isSelected,
        );
        const playerSelectedCount = playerEntries.length;
        const hasNoEvents = player.pairs.length === 0;

        return (
          <div
            key={player.playerId}
            className={`p-3 rounded-2xl border transition-colors ${
              playerSelectedCount > 0
                ? "bg-primary/5 border-primary/20"
                : "bg-card"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{player.playerName}</span>
              {playerSelectedCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {playerSelectedCount} épreuve
                  {playerSelectedCount > 1 ? "s" : ""}
                </Badge>
              )}
            </div>

            {hasNoEvents ? (
              <p className="text-xs text-muted-foreground italic">
                Aucune discipline configurée pour cet athlète. Renseigne sa
                discipline depuis sa fiche pour pouvoir l'inscrire.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {player.pairs.map((pair, idx) => {
                  const entry = entries.find((e) =>
                    eqKey(e, player.playerId, pair.discipline, pair.specialty),
                  );
                  const isSelected = !!entry?.isSelected;
                  const order = entry?.startOrder ?? null;
                  const id = `${player.playerId}-${pair.discipline}-${pair.specialty || ""}-${idx}`;
                  const discLabel = getDisciplineLabel(pair.discipline);
                  const specLabel = pair.specialty
                    ? getSpecialtyLabel(pair.specialty)
                    : null;
                  return (
                    <label
                      key={id}
                      htmlFor={id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-primary/30"
                          : "bg-muted/40 hover:bg-muted/60"
                      }`}
                    >
                      <Checkbox
                        id={id}
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          onToggle(
                            player.playerId,
                            pair.discipline,
                            pair.specialty,
                            !!checked,
                          )
                        }
                      />
                      {isSelected && order != null && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onPromoteFirst?.(
                              player.playerId,
                              pair.discipline,
                              pair.specialty,
                            );
                          }}
                          title={
                            order === 1
                              ? "Première épreuve"
                              : "Mettre cette épreuve en premier"
                          }
                          className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/80 transition-colors"
                        >
                          {order}
                        </button>
                      )}
                      <span className="text-sm">
                        {specLabel ? (
                          <>
                            <span className="font-medium">{specLabel}</span>
                            <span className="text-muted-foreground ml-1">
                              ({discLabel})
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">{discLabel}</span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
