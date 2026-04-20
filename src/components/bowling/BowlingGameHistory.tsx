import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Eye, Trophy } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BowlingScoreSheet, type FrameData, type BowlingStats } from "@/components/athlete-portal/BowlingScoreSheet";
import { getStatColor } from "@/lib/bowling/statColors";

interface BowlingGameData {
  roundId: string;
  matchId: string;
  roundNumber: number;
  matchDate: string;
  matchOpponent: string;
  phase: string;
  score: number;
  strikes: number;
  spares: number;
  strikePercentage: number;
  sparePercentage: number;
  openFrames: number;
  splitCount: number;
  splitConverted: number;
  frames?: FrameData[];
}

interface BowlingGameHistoryProps {
  games: BowlingGameData[];
  categoryId: string;
}

const PHASE_LABELS: Record<string, string> = {
  qualification: "Qualification",
  round_robin: "Round Robin",
  quart: "Quart de finale",
  demi: "Demi-finale",
  petite_finale: "Petite finale",
  finale: "Finale",
};

export function BowlingGameHistory({ games, categoryId }: BowlingGameHistoryProps) {
  const [viewingGame, setViewingGame] = useState<BowlingGameData | null>(null);

  if (games.length === 0) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune partie enregistrée.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedByMatch = games.reduce<Record<string, { matchDate: string; opponent: string; games: BowlingGameData[] }>>((acc, game) => {
    if (!acc[game.matchId]) {
      acc[game.matchId] = { matchDate: game.matchDate, opponent: game.matchOpponent, games: [] };
    }
    acc[game.matchId].games.push(game);
    return acc;
  }, {});

  const sortedMatches = Object.entries(groupedByMatch).sort(([, a], [, b]) => 
    b.matchDate.localeCompare(a.matchDate)
  );

  return (
    <>
      <div className="space-y-4">
        {sortedMatches.map(([matchId, { matchDate, opponent, games: matchGames }]) => {
          const totalScore = matchGames.reduce((s, g) => s + g.score, 0);
          const avgScore = totalScore / matchGames.length;
          const highGame = Math.max(...matchGames.map(g => g.score));
          
          return (
            <Card key={matchId}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    {opponent || "Compétition"}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {matchDate ? format(new Date(matchDate), "dd MMM yyyy", { locale: fr }) : "-"}
                  </div>
                </div>
                <div className="flex gap-3 text-xs">
                  <Badge variant="secondary">{matchGames.length} parties</Badge>
                  <Badge variant="outline">Moy: {avgScore.toFixed(1)}</Badge>
                  <Badge variant="outline">High: {highGame}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {matchGames.map((game) => (
                    <div
                      key={game.roundId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {game.phase ? PHASE_LABELS[game.phase] || game.phase : `Partie ${game.roundNumber}`}
                        </Badge>
                        <span className="text-2xl font-bold tabular-nums">{game.score}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right text-xs text-muted-foreground hidden sm:block">
                          <div className="flex items-center gap-1 justify-end">
                            <span className={`${getStatColor("strike", game.strikePercentage).bg} ${getStatColor("strike", game.strikePercentage).text.includes("text-red") ? "text-red-600" : "text-white"} px-1.5 py-0.5 rounded text-xs font-medium`}>{game.strikes}X</span>
                            <span className={`${getStatColor("spare", game.sparePercentage).bg} ${getStatColor("spare", game.sparePercentage).text.includes("text-red") ? "text-red-600" : "text-white"} px-1.5 py-0.5 rounded text-xs font-medium`}>{game.spares}/</span>
                            <span className="text-muted-foreground">{game.openFrames} open</span>
                          </div>
                          <div>Splits: {game.splitCount} ({game.splitConverted} conv.)</div>
                        </div>
                        {game.frames && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingGame(game)}
                            className="gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="hidden sm:inline">Voir</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Read-only score sheet dialog - interactive for viewing details */}
      <Dialog open={!!viewingGame} onOpenChange={(open) => !open && setViewingGame(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {viewingGame?.matchOpponent} - {viewingGame?.phase ? PHASE_LABELS[viewingGame.phase] || viewingGame.phase : `Partie ${viewingGame?.roundNumber}`}
              <Badge variant="secondary" className="ml-2 text-lg">{viewingGame?.score}</Badge>
            </DialogTitle>
          </DialogHeader>
          {viewingGame?.frames && (
            <BowlingScoreSheet
              initialFrames={viewingGame.frames}
              onSave={() => {}}
              onCancel={() => setViewingGame(null)}
              readOnly
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
