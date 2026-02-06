import { useState } from "react";
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
import { Plus, FileText, Calendar, AlertTriangle, Download, Trash2, Search, User } from "lucide-react";
import { format, differenceInDays, isPast, addDays } from "date-fns";
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
  players?: { name: string } | null;
}

const DOCUMENT_TYPES = [
  { value: "license", label: "Licence sportive" },
  { value: "medical_certificate", label: "Certificat médical" },
  { value: "identity", label: "Pièce d'identité" },
  { value: "contract", label: "Contrat" },
  { value: "insurance", label: "Assurance" },
  { value: "parental_authorization", label: "Autorisation parentale" },
  { value: "image_rights", label: "Droit à l'image" },
  { value: "other", label: "Autre" },
];

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

export function DocumentsSection({ categoryId }: DocumentsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

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
        .select("id, name")
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
        .select("*, players(name)")
        .eq("category_id", categoryId)
        .order("expiry_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      
      // Calculate status based on expiry_date
      return (data as unknown as AdminDocument[]).map((doc) => {
        if (!doc.expiry_date) return { ...doc, status: "valid" };
        const daysUntilExpiry = differenceInDays(new Date(doc.expiry_date), new Date());
        if (daysUntilExpiry < 0) return { ...doc, status: "expired" };
        if (daysUntilExpiry <= 30) return { ...doc, status: "expiring_soon" };
        return { ...doc, status: "valid" };
      });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("admin_documents" as any).insert({
        category_id: categoryId,
        created_by: user?.id,
        player_id: data.player_id || null,
        document_type: data.document_type,
        title: data.title,
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
      toast({ title: "Document ajouté" });
    },
    onError: (error: any) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-documents", categoryId] });
      toast({ title: "Document supprimé" });
    },
  });

  const resetForm = () => {
    setFormData({
      player_id: "",
      document_type: "license",
      title: "",
      expiry_date: "",
      notes: "",
    });
  };

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.players?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Group documents by status for alerts
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
                      {doc.players?.name ? `${doc.players.name} - ` : ""}{doc.title}
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
                      {doc.players?.name ? `${doc.players.name} - ` : ""}{doc.title}
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

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
                      <SelectItem key={player.id} value={player.id}>{player.name}</SelectItem>
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
                disabled={!formData.title || addDocumentMutation.isPending}
                className="w-full"
              >
                Ajouter
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
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{doc.title}</h4>
                      <Badge className={STATUS_COLORS[doc.status]}>
                        {STATUS_LABELS[doc.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label}</span>
                      {doc.players?.name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.players.name}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteDocumentMutation.mutate(doc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
