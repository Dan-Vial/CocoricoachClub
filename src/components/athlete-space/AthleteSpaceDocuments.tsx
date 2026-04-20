import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, File, Image, Download, Users, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AthleteSpaceDocumentsProps {
  playerId: string;
  categoryId: string;
}

const DOCUMENT_TYPES: Record<string, string> = {
  license: "Licence sportive",
  medical_certificate: "Certificat médical",
  medical_return_training: "Certificat de reprise à l'entraînement",
  medical_return_competition: "Certificat de reprise à la compétition",
  identity: "Pièce d'identité",
  contract: "Contrat",
  insurance: "Assurance",
  parental_authorization: "Autorisation parentale",
  image_rights: "Droit à l'image",
};

function getFileIcon(url: string | null) {
  if (!url) return <FileText className="h-5 w-5 text-muted-foreground" />;
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <File className="h-5 w-5 text-destructive" />;
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif", "heic"].includes(ext || ""))
    return <Image className="h-5 w-5 text-primary" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function AthleteSpaceDocuments({ playerId, categoryId }: AthleteSpaceDocumentsProps) {
  // Fetch team documents (player_id is null)
  const { data: teamDocuments, isLoading: teamLoading } = useQuery({
    queryKey: ["athlete-team-documents", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_documents" as any)
        .select("*")
        .eq("category_id", categoryId)
        .is("player_id", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch personal documents (player_id matches)
  const { data: personalDocuments, isLoading: personalLoading } = useQuery({
    queryKey: ["athlete-personal-documents", categoryId, playerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_documents" as any)
        .select("*")
        .eq("category_id", categoryId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleDownload = async (fileUrl: string, title: string) => {
    if (!fileUrl) return;
    try {
      const { data, error } = await supabase.storage
        .from("admin-documents")
        .createSignedUrl(fileUrl, 60 * 60);
      if (error) throw error;
      window.open(data.signedUrl, "_blank");
    } catch {
      toast.error("Erreur lors du téléchargement");
    }
  };

  const getDocTypeLabel = (docType: string) => {
    return DOCUMENT_TYPES[docType] || docType;
  };

  const renderDocumentList = (documents: any[] | undefined, isLoading: boolean, emptyMessage: string) => {
    if (isLoading) return <Skeleton className="h-32 w-full" />;
    if (!documents || documents.length === 0) {
      return (
        <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>
      );
    }

    return (
      <div className="space-y-3">
        {documents.map((doc: any) => (
          <Card key={doc.id} className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {getFileIcon(doc.file_url)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {getDocTypeLabel(doc.document_type)}
                      </Badge>
                      {doc.expiry_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expire le {format(new Date(doc.expiry_date), "dd MMM yyyy", { locale: fr })}
                        </span>
                      )}
                    </div>
                    {doc.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Ajouté le {format(new Date(doc.created_at), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                </div>
                {doc.file_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc.file_url, doc.title)}
                    className="shrink-0"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Télécharger</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            Mes documents ({personalDocuments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Documents d'équipe ({teamDocuments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          {renderDocumentList(personalDocuments, personalLoading, "Aucun document personnel")}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          {renderDocumentList(teamDocuments, teamLoading, "Aucun document d'équipe")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
