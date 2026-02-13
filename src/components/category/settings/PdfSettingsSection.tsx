import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FileText, Upload, Eye, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PdfSettingsProps {
  categoryId: string;
}

interface PdfSettingsData {
  logo_url: string | null;
  club_name_override: string;
  header_color: string;
  accent_color: string;
  show_logo: boolean;
  show_club_name: boolean;
  show_category_name: boolean;
  show_date: boolean;
  footer_text: string;
}

const defaultSettings: PdfSettingsData = {
  logo_url: null,
  club_name_override: "",
  header_color: "#224378",
  accent_color: "#3B82F6",
  show_logo: true,
  show_club_name: true,
  show_category_name: true,
  show_date: true,
  footer_text: "",
};

export function PdfSettingsSection({ categoryId }: PdfSettingsProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<PdfSettingsData>(defaultSettings);
  const [uploading, setUploading] = useState(false);

  // Fetch existing settings
  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["pdf-settings", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_settings")
        .select("*")
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch club info for defaults
  const { data: categoryInfo } = useQuery({
    queryKey: ["category-club-info", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("name, club_id, clubs(name, logo_url)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings({
        logo_url: savedSettings.logo_url,
        club_name_override: savedSettings.club_name_override || "",
        header_color: savedSettings.header_color || "#224378",
        accent_color: savedSettings.accent_color || "#3B82F6",
        show_logo: savedSettings.show_logo ?? true,
        show_club_name: savedSettings.show_club_name ?? true,
        show_category_name: savedSettings.show_category_name ?? true,
        show_date: savedSettings.show_date ?? true,
        footer_text: savedSettings.footer_text || "",
      });
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        category_id: categoryId,
        logo_url: settings.logo_url || null,
        club_name_override: settings.club_name_override || null,
        header_color: settings.header_color,
        accent_color: settings.accent_color,
        show_logo: settings.show_logo,
        show_club_name: settings.show_club_name,
        show_category_name: settings.show_category_name,
        show_date: settings.show_date,
        footer_text: settings.footer_text || null,
      };

      const { error } = await supabase
        .from("pdf_settings")
        .upsert(payload, { onConflict: "category_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdf-settings", categoryId] });
      toast.success("Paramètres PDF sauvegardés");
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${categoryId}/pdf-logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("club-logos")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("club-logos")
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, logo_url: urlData.publicUrl }));
      toast.success("Logo téléchargé");
    } catch {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  // Use club logo as fallback
  const displayLogo = settings.logo_url || (categoryInfo?.clubs as any)?.logo_url;
  const displayClubName = settings.club_name_override || (categoryInfo?.clubs as any)?.name || "Mon Club";
  const displayCategoryName = categoryInfo?.name || "Catégorie";

  if (isLoading) {
    return (
      <Card className="bg-gradient-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Personnalisation des PDF
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configurez l'apparence de vos exports PDF (rapports, tests, séances, programmes)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="space-y-3">
            <Label className="font-semibold">Logo</Label>
            <div className="flex items-center gap-4">
              {displayLogo ? (
                <div className="w-16 h-16 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
                  <img src={displayLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {uploading ? "Envoi..." : "Changer le logo"}
                    </span>
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG ou JPG, max 2 Mo</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Header text */}
          <div className="space-y-3">
            <Label className="font-semibold">Texte de l'en-tête</Label>
            <div className="space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground">Nom du club (laisser vide pour utiliser le nom par défaut)</Label>
                <Input
                  value={settings.club_name_override}
                  onChange={e => setSettings(prev => ({ ...prev, club_name_override: e.target.value }))}
                  placeholder={(categoryInfo?.clubs as any)?.name || "Nom du club"}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Texte de pied de page</Label>
                <Input
                  value={settings.footer_text}
                  onChange={e => setSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                  placeholder="Ex: Confidentiel - Usage interne uniquement"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Colors */}
          <div className="space-y-3">
            <Label className="font-semibold">Couleurs</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Couleur d'en-tête</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.header_color}
                    onChange={e => setSettings(prev => ({ ...prev, header_color: e.target.value }))}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.header_color}
                    onChange={e => setSettings(prev => ({ ...prev, header_color: e.target.value }))}
                    className="flex-1"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Couleur d'accent</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accent_color}
                    onChange={e => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={settings.accent_color}
                    onChange={e => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                    className="flex-1"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <Label className="font-semibold">Éléments affichés</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Afficher le logo</Label>
                <Switch checked={settings.show_logo} onCheckedChange={v => setSettings(prev => ({ ...prev, show_logo: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Afficher le nom du club</Label>
                <Switch checked={settings.show_club_name} onCheckedChange={v => setSettings(prev => ({ ...prev, show_club_name: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Afficher le nom de la catégorie</Label>
                <Switch checked={settings.show_category_name} onCheckedChange={v => setSettings(prev => ({ ...prev, show_category_name: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Afficher la date</Label>
                <Switch checked={settings.show_date} onCheckedChange={v => setSettings(prev => ({ ...prev, show_date: v }))} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Preview */}
          <div className="space-y-3">
            <Label className="font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Aperçu de l'en-tête PDF
            </Label>
            <div className="border rounded-lg overflow-hidden">
              <div 
                className="p-4 flex items-center gap-4"
                style={{ backgroundColor: settings.header_color }}
              >
                {settings.show_logo && displayLogo && (
                  <img src={displayLogo} alt="Logo" className="h-10 w-10 object-contain rounded bg-white/20 p-1" />
                )}
                <div className="text-white">
                  {settings.show_club_name && (
                    <p className="font-bold text-sm">{displayClubName}</p>
                  )}
                  {settings.show_category_name && (
                    <p className="text-xs opacity-80">{displayCategoryName}</p>
                  )}
                  {settings.show_date && (
                    <p className="text-xs opacity-60 mt-0.5">13/02/2026</p>
                  )}
                </div>
              </div>
              {settings.footer_text && (
                <div className="px-4 py-2 bg-muted/30 border-t">
                  <p className="text-xs text-muted-foreground text-center italic">{settings.footer_text}</p>
                </div>
              )}
            </div>
          </div>

          {/* Save button */}
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder les paramètres PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
