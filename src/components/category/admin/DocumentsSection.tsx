import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, AlertTriangle, Download, Trash2, Search, User, Upload, File, Image, Eye, Users } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface DocumentsSectionProps {
  categoryId: string;
}

interface AdminDocument {
  id: string;
  player_id: string | null;
  document_type: string;
  title: string;
  file_url: string | null;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  players?: { name: string; first_name?: string | null } | null;
}

const DOCUMENT_TYPES = [
  { value: "license", label: "Licence sportive" },
  { value: "medical_certificate", label: "Certificat médical" },
  { value: "medical_return_training", label: "Certificat de reprise à l'entraînement" },
  { value: "medical_return_competition", label: "Certificat de reprise à la compétition" },
  { value: "identity", label: "Pièce d'identité" },
  { value: "contract", label: "Contrat" },
  { value: "insurance", label: "Assurance" },
  { value: "parental_authorization", label: "Autorisation parentale" },
  { value: "image_rights", label: "Droit à l'image" },
  { value: "custom", label: "Autre (personnalisé)" },
];

const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.gif,.bmp,.tiff,.tif";
const MAX_FILE_SIZE_MB = 10;

const STATUS_COLORS: Record<string, string> = {
  valid: "bg-green-100 text-green-700",
  expiring_soon: "bg-amber-100 text-amber-700",
  expired: "bg-red-100 text-red-700",
  pending: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  valid: "Valide",
  expiring_soon: "Expire bientôt",
  expired: "Expiré",
  pending: "En attente",
};

function getFileIcon(url: string | null) {
  if (!url) return <FileText className="h-5 w-5 text-muted-foreground" />;
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return <File className="h-5 w-5 text-red-500" />;
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif", "heic"].includes(ext || ""))
    return <Image className="h-5 w-5 text-blue-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function DocumentsSection({ categoryId }: DocumentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // "team" = documents d'équipe, or a player id
  const [selectedTab, setSelectedTab] = useState<string>("team");

  const [customDocumentType, setCustomDocumentType] = useState("");
  const [formData, setFormData] = useState({
    document_type: "license",
    title: "",
    expiry_date: "",
    notes: "",
  });

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, first_name")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ["admin-documents", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_documents" as any)
        .select("*, players(name, first_name)")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return (data as unknown as AdminDocument[]).map((doc) => {
        if (!doc.expiry_date) return { ...doc, status: "valid" };
        const daysUntilExpiry = differenceInDays(new Date(doc.expiry_date), new Date());
        if (daysUntilExpiry < 0) return { ...doc, status: "expired" };
        if (daysUntilExpiry <= 30) return { ...doc, status: "expiring_soon" };
        return { ...doc, status: "valid" };
      });
    },
  });

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const fileName = `${categoryId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("admin-documents")
      .upload(fileName, file, { upsert: false });

    if (error) throw error;
    return fileName;
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("admin-documents")
      .createSignedUrl(filePath, 60 * 60);
    if (error) return null;
    return data.signedUrl;
  };

  const addDocumentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      setIsUploading(true);
      let fileUrl: string | null = null;

      if (selectedFile) {
        fileUrl = await uploadFile(selectedFile);
      }

      const playerId = selectedTab === "team" ? null : selectedTab;

      const { error } = await supabase.from("admin_documents" as any).insert({
        category_id: categoryId,
        created_by: user?.id,
        player_id: playerId,
        document_type: data.document_type === "custom" ? customDocumentType : data.document_type,
        title: data.title,
        file_url: fileUrl,
        expiry_date: data.expiry_date || null,
        notes: data.notes || null,
        status: "valid",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents", categoryId] });
      setShowAddDialog(false);
      resetForm();
      toast({ title: "Document ajouté avec succès" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (doc: AdminDocument) => {
      if (doc.file_url && !doc.file_url.startsWith("http")) {
        await supabase.storage.from("admin-documents").remove([doc.file_url]);
      }
      const { error } = await supabase.from("admin_documents" as any).delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents", categoryId] });
      toast({ title: "Document supprimé" });
    },
  });

  const handleViewFile = async (doc: AdminDocument) => {
    if (!doc.file_url) return;
    if (doc.file_url.startsWith("http")) {
      window.open(doc.file_url, "_blank");
      return;
    }
    const url = await getSignedUrl(doc.file_url);
    if (url) {
      window.open(url, "_blank");
    } else {
      toast({ title: "Erreur", description: "Impossible d'accéder au fichier", variant: "destructive" });
    }
  };

  const handleDownloadFile = async (doc: AdminDocument) => {
    if (!doc.file_url) return;

    try {
      let url: string;
      if (doc.file_url.startsWith("http")) {
        url = doc.file_url;
      } else {
        const signedUrl = await getSignedUrl(doc.file_url);
        if (!signedUrl) {
          toast({ title: "Erreur", description: "Impossible de télécharger le fichier", variant: "destructive" });
          return;
        }
        url = signedUrl;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      const ext = doc.file_url.split(".").pop() || "bin";
      a.download = `${doc.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Erreur", description: "Échec du téléchargement", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      document_type: "license",
      title: "",
      expiry_date: "",
      notes: "",
    });
    setCustomDocumentType("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: `Maximum ${MAX_FILE_SIZE_MB} Mo`, variant: "destructive" });
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setFormData((prev) => ({ ...prev, title: nameWithoutExt }));
    }
  };

  // Filter documents for current tab
  const tabDocuments = documents?.filter((doc) => {
    if (selectedTab === "team") return doc.player_id === null;
    return doc.player_id === selectedTab;
  });

  const filteredDocuments = tabDocuments?.filter((doc) => {
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    return matchesType;
  });

  const expiredDocs = documents?.filter((d) => d.status === "expired") || [];
  const expiringSoonDocs = documents?.filter((d) => d.status === "expiring_soon") || [];

  const selectedPlayerName = selectedTab === "team"
    ? "Équipe"
    : (() => {
        const p = players?.find((pl) => pl.id === selectedTab);
        return p ? [p.first_name, p.name].filter(Boolean).join(" ") : "";
      })();

  // Count docs per player/team for badges
  const getDocCount = (id: string) => {
    if (id === "team") return documents?.filter((d) => d.player_id === null).length || 0;
    return documents?.filter((d) => d.player_id === id).length || 0;
  };

  return (
    <div className="space-y-6">
      {/* Alertes documents expirés */}
      {(expiredDocs.length > 0 || expiringSoonDocs.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {expiredDocs.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Documents expirés ({expiredDocs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1">
                  {expiredDocs.slice(0, 5).map((doc) => (
                    <li key={doc.id} className="text-red-600">
                      {doc.players?.name ? `${[doc.players.first_name, doc.players.name].filter(Boolean).join(" ")} - ` : ""}
                      {doc.title}
                    </li>
                  ))}
                  {expiredDocs.length > 5 && (
                    <li className="text-red-500 italic">+{expiredDocs.length - 5} autres...</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
          {expiringSoonDocs.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Expirent sous 30 jours ({expiringSoonDocs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <ul className="space-y-1">
                  {expiringSoonDocs.slice(0, 5).map((doc) => (
                    <li key={doc.id} className="text-amber-600">
                      {doc.players?.name ? `${[doc.players.first_name, doc.players.name].filter(Boolean).join(" ")} - ` : ""}
                      {doc.title}
                      {doc.expiry_date && (
                        <span className="ml-1 text-xs">
                          ({differenceInDays(new Date(doc.expiry_date), new Date())} jours)
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Onglets athlètes */}
      <div className="space-y-4">
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            <Button
              variant={selectedTab === "team" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTab("team")}
              className="shrink-0"
            >
              <Users className="h-4 w-4 mr-1.5" />
              Équipe
              {getDocCount("team") > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {getDocCount("team")}
                </Badge>
              )}
            </Button>
            {players?.map((player) => (
              <Button
                key={player.id}
                variant={selectedTab === player.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTab(player.id)}
                className="shrink-0"
              >
                <User className="h-4 w-4 mr-1.5" />
                {[player.first_name, player.name].filter(Boolean).join(" ")}
                {getDocCount(player.id) > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                    {getDocCount(player.id)}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Header avec filtre et bouton ajouter */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un document {selectedTab !== "team" ? `pour ${selectedPlayerName}` : "d'équipe"}
          </Button>
        </div>

        {/* Dialog ajout document */}
        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Nouveau document {selectedTab !== "team" ? `— ${selectedPlayerName}` : "— Équipe"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* File Upload */}
              <div>
                <Label>Fichier (PDF, Image) *</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-3">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <p className="text-sm font-medium truncate max-w-[250px]">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Cliquez pour sélectionner un fichier</p>
                      <p className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP, GIF • Max {MAX_FILE_SIZE_MB} Mo</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Type de document *</Label>
                <Select value={formData.document_type} onValueChange={(v) => { setFormData({ ...formData, document_type: v }); if (v !== "custom") setCustomDocumentType(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.document_type === "custom" && (
                  <div className="mt-2">
                    <Label className="text-xs">Nom du type personnalisé *</Label>
                    <Input
                      value={customDocumentType}
                      onChange={(e) => setCustomDocumentType(e.target.value)}
                      placeholder="Ex: Bilan annuel, Fiche technique..."
                      autoFocus
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Titre / Description *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="ex: Licence 2024-2025"
                />
              </div>
              <div>
                <Label>Date d'expiration</Label>
                <Input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes additionnelles..."
                  rows={2}
                />
              </div>
              <Button
                onClick={() => addDocumentMutation.mutate(formData)}
                disabled={!formData.title || !selectedFile || addDocumentMutation.isPending || isUploading || (formData.document_type === "custom" && !customDocumentType.trim())}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-pulse" />
                    Envoi en cours...
                  </>
                ) : (
                  "Ajouter"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Liste des documents */}
        <div className="grid gap-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredDocuments?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Aucun document pour {selectedPlayerName}</p>
              </CardContent>
            </Card>
          ) : (
            filteredDocuments?.map((doc) => (
              <Card
                key={doc.id}
                className={doc.status === "expired" ? "border-red-200" : doc.status === "expiring_soon" ? "border-amber-200" : ""}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {getFileIcon(doc.file_url)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">{doc.title}</h4>
                        <Badge className={STATUS_COLORS[doc.status]}>
                          {STATUS_LABELS[doc.status]}
                        </Badge>
                        {doc.file_url && (
                          <Badge variant="outline" className="text-xs">
                            {doc.file_url.split(".").pop()?.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                        <span>{DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type}</span>
                        {doc.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expire le {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: fr })}
                          </span>
                        )}
                        {doc.created_at && (
                          <span className="text-xs">
                            Ajouté le {format(new Date(doc.created_at), "d MMM yyyy", { locale: fr })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.file_url && (
                      <>
                        <Button variant="ghost" size="icon" title="Voir le fichier" onClick={() => handleViewFile(doc)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Télécharger" onClick={() => handleDownloadFile(doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteDocumentMutation.mutate(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
