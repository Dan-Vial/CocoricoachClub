import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, MapPin, Video, GraduationCap, FolderOpen } from "lucide-react";
import { MAIN_SPORTS, MainSportCategory, getOtherSportSubtypes, SportSubTypeOption } from "@/lib/constants/sportTypes";

export interface CategoryDraft {
  name: string;
  gender: string;
  rugby_type: string;
  gps_enabled: boolean;
  video_enabled: boolean;
  academy_enabled: boolean;
}

interface CreateClientCategoriesSectionProps {
  clubName: string;
  onClubNameChange: (name: string) => void;
  clubSport: MainSportCategory;
  onClubSportChange: (sport: MainSportCategory) => void;
  categories: CategoryDraft[];
  onCategoriesChange: (categories: CategoryDraft[]) => void;
}

export function CreateClientCategoriesSection({
  clubName,
  onClubNameChange,
  clubSport,
  onClubSportChange,
  categories,
  onCategoriesChange,
}: CreateClientCategoriesSectionProps) {
  const subtypes = getOtherSportSubtypes(clubSport);

  const addCategory = () => {
    onCategoriesChange([
      ...categories,
      {
        name: "",
        gender: "male",
        rugby_type: subtypes[0]?.value || clubSport,
        gps_enabled: false,
        video_enabled: false,
        academy_enabled: false,
      },
    ]);
  };

  const removeCategory = (index: number) => {
    onCategoriesChange(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, updates: Partial<CategoryDraft>) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], ...updates };
    onCategoriesChange(updated);
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <Label className="text-base font-semibold flex items-center gap-2">
        <FolderOpen className="h-4 w-4" />
        Club & Catégories
      </Label>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nom du club</Label>
          <Input
            value={clubName}
            onChange={(e) => onClubNameChange(e.target.value)}
            placeholder="Ex: Colomiers Rugby"
          />
        </div>
        <div className="space-y-2">
          <Label>Sport</Label>
          <Select value={clubSport} onValueChange={(v) => {
            onClubSportChange(v as MainSportCategory);
            // Reset category types when sport changes
            const newSubtypes = getOtherSportSubtypes(v as MainSportCategory);
            onCategoriesChange(categories.map(c => ({
              ...c,
              rugby_type: newSubtypes[0]?.value || v,
            })));
          }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MAIN_SPORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Categories list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Catégories
            {categories.length > 0 && (
              <Badge variant="secondary" className="ml-2">{categories.length}</Badge>
            )}
          </Label>
          <Button type="button" variant="outline" size="sm" onClick={addCategory}>
            <Plus className="h-3 w-3 mr-1" />
            Ajouter
          </Button>
        </div>

        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-3">
            Aucune catégorie ajoutée. Cliquez sur "Ajouter" pour commencer.
          </p>
        )}

        {categories.map((cat, index) => (
          <div key={index} className="p-3 rounded-lg border bg-background space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">Catégorie {index + 1}</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCategory(index)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nom</Label>
                <Input
                  value={cat.name}
                  onChange={(e) => updateCategory(index, { name: e.target.value })}
                  placeholder="Ex: Seniors"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Genre</Label>
                <Select value={cat.gender} onValueChange={(v) => updateCategory(index, { gender: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculin</SelectItem>
                    <SelectItem value="female">Féminin</SelectItem>
                    <SelectItem value="mixed">Mixte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={cat.rugby_type} onValueChange={(v) => updateCategory(index, { rugby_type: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subtypes.map((st) => (
                      <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Per-category options */}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id={`cat-gps-${index}`}
                  checked={cat.gps_enabled}
                  onCheckedChange={(checked) => updateCategory(index, { gps_enabled: checked === true })}
                />
                <label htmlFor={`cat-gps-${index}`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <MapPin className="h-3 w-3" /> GPS
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id={`cat-video-${index}`}
                  checked={cat.video_enabled}
                  onCheckedChange={(checked) => updateCategory(index, { video_enabled: checked === true })}
                />
                <label htmlFor={`cat-video-${index}`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <Video className="h-3 w-3" /> Vidéo
                </label>
              </div>
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id={`cat-academy-${index}`}
                  checked={cat.academy_enabled}
                  onCheckedChange={(checked) => updateCategory(index, { academy_enabled: checked === true })}
                />
                <label htmlFor={`cat-academy-${index}`} className="text-xs flex items-center gap-1 cursor-pointer">
                  <GraduationCap className="h-3 w-3" /> Académie
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        L'admin du club pourra ensuite inviter le staff dans chaque catégorie.
      </p>
    </div>
  );
}
