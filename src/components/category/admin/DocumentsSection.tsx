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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Calendar, AlertTriangle, Download, Trash2, Search, User, Upload, File, Image, Eye } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

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
  { value: "other", label: "Autre" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    player_id: "",
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
        .order("expiry_date", { ascending: true, nullsFirst: false });
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

    const { data: urlData } = supabase.storage
      .from("admin-documents")
      .getPublicUrl(fileName);

    // Since bucket is private, use signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from("admin-documents")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10); // 10 years

    if (signedError) throw signedError;
    
    // Store the path, not the signed URL (we'll generate signed URLs on demand)
    return fileName;
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("admin-documents")
      .createSignedUrl(filePath, 60 * 60); // 1 hour
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

      const { error } = await supabase.from("admin_documents" as any).insert({
        category_id: categoryId,
        created_by: user?.id,
        player_id: data.player_id || null,
        document_type: data.document_type,
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
      // Delete file from storage if exists
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

    // If it's already a full URL (legacy), open directly
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

  const resetForm = () => {
    setFormData({
      player_id: "",
      document_type: "license",
      title: "",
      expiry_date: "",
      notes: "",
    });
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

    // Auto-fill title from filename if empty
    if (!formData.title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setFormData(prev => ({ ...prev, title: nameWithoutExt }));
    }
  };

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.players?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const expiredDocs = documents?.filter((d) => d.status === "expired") || [];
  const expiringSoonDocs = documents?.filter((d) => d.status === "expiring_soon") || [];

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
                      {doc.players?.name ? `${[doc.players.first_name, doc.players.name].filter(Boolean).join(" ")} - ` : ""}{doc.title}
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
                      {doc.players?.name ? `${[doc.players.first_name, doc.players.name].filter(Boolean).join(" ")} - ` : ""}{doc.title}
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

      {/* Header avec recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau Document</DialogTitle>
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
                      <p className="text-sm text-muted-foreground">
                        Cliquez pour sélectionner un fichier
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, PNG, WEBP, GIF • Max {MAX_FILE_SIZE_MB} Mo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label>Joueur (optionnel)</Label>
                <Select 
                  value={formData.player_id || "none"} 
                  onValueChange={(v) => setFormData({ ...formData, player_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un joueur..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun (document équipe)</SelectItem>
                    {players?.map((player) => (
                      <SelectItem key={player.id} value={player.id}>{[player.first_name, player.name].filter(Boolean).join(" ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type de document *</Label>
                <Select 
                  value={formData.document_type} 
                  onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                disabled={!formData.title || !selectedFile || addDocumentMutation.isPending || isUploading}
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
      </div>

      {/* Liste des documents */}
      <div className="grid gap-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : filteredDocuments?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Aucun document enregistré</p>
            </CardContent>
          </Card>
        ) : (
          filteredDocuments?.map((doc) => (
            <Card key={doc.id} className={doc.status === "expired" ? "border-red-200" : doc.status === "expiring_soon" ? "border-amber-200" : ""}>
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
                      <span>{DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label}</span>
                      {doc.players?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {[doc.players.first_name, doc.players.name].filter(Boolean).join(" ")}
                        </span>
                      )}
                      {doc.expiry_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expire le {format(new Date(doc.expiry_date), "d MMM yyyy", { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {doc.file_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Voir le fichier"
                      onClick={() => handleViewFile(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
  );
}