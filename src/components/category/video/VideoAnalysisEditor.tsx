import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Film, Upload, Scissors, ArrowLeft } from "lucide-react";
import { VideoPlayerWithClipping } from "./VideoPlayerWithClipping";
import { DirectClipImport } from "./DirectClipImport";

interface VideoAnalysisEditorProps {
  analysisId: string;
  analysisTitle: string;
  categoryId: string;
  matchId?: string | null;
  videoUrl?: string | null;
  videoFileUrl?: string | null;
  sportType?: string;
  onBack: () => void;
  onClipCreated: () => void;
}

export function VideoAnalysisEditor({
  analysisId,
  analysisTitle,
  categoryId,
  matchId,
  videoUrl,
  sportType,
  onBack,
  onClipCreated,
}: VideoAnalysisEditorProps) {
  const [activeMode, setActiveMode] = useState<"clipping" | "import">(
    videoUrl ? "clipping" : "import"
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{analysisTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Ajoutez des clips à cette analyse
            </p>
          </div>
        </div>
      </div>

      {/* Mode selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" />
            Mode d'ajout de clips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeMode} onValueChange={(v) => setActiveMode(v as "clipping" | "import")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="clipping" className="flex items-center gap-2">
                <Scissors className="h-4 w-4" />
                Découpage vidéo
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import direct
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clipping" className="mt-4">
              {videoUrl ? (
                <VideoPlayerWithClipping
                  analysisId={analysisId}
                  categoryId={categoryId}
                  matchId={matchId}
                  videoUrl={videoUrl}
                  sportType={sportType}
                  onClipCreated={onClipCreated}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Aucune vidéo associée</p>
                  <p className="text-sm mt-1">
                    Cette analyse n'a pas de vidéo liée. Utilisez le mode "Import direct"
                    pour ajouter des clips externes.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveMode("import")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Passer à l'import direct
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="import" className="mt-4">
              <DirectClipImport
                categoryId={categoryId}
                sportType={sportType}
                onSuccess={onClipCreated}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Mode Découpage</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Regardez la vidéo complète et marquez les moments clés en temps réel.
                  Entrez les timestamps manuellement ou utilisez les boutons "Marquer".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Upload className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Mode Import Direct</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Importez des clips déjà découpés depuis VEO, Hudl ou autres sources.
                  Liez-les à un match, des joueurs et des statistiques.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
