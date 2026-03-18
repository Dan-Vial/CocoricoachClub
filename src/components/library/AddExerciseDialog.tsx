import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Plus, Upload, X, Image as ImageIcon, Video } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { 
  EXERCISE_CATEGORIES, 
  DIFFICULTY_LEVELS, 
  getSubcategoriesForCategory,
  SPORT_OPTIONS,
  getTerrainCategoriesForSport,
  getCategoryGroup,
  CATEGORY_GROUP_CONFIGS,
  type ExerciseCategory
} from "@/lib/constants/exerciseCategories";

export function AddExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [selectedSport, setSelectedSport] = useState("all");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const availableSubcategories = getSubcategoriesForCategory(category);

  const groupedCategories = useMemo(() => {
    const musculation = EXERCISE_CATEGORIES.filter(c => c.group === "musculation");
    const bodyweight = EXERCISE_CATEGORIES.filter(c => c.group === "bodyweight");
    const crossfit = EXERCISE_CATEGORIES.filter(c => c.group === "crossfit_hyrox");
    const course = EXERCISE_CATEGORIES.filter(c => c.group === "course");
    const ergo = EXERCISE_CATEGORIES.filter(c => c.group === "ergo");
    const sled = EXERCISE_CATEGORIES.filter(c => c.group === "sled");
    const pilates = EXERCISE_CATEGORIES.filter(c => c.group === "pilates");
    const reathletisation = EXERCISE_CATEGORIES.filter(c => c.group === "reathletisation");
    const terrain = getTerrainCategoriesForSport(selectedSport);
    const stretching = EXERCISE_CATEGORIES.filter(c => c.group === "stretching_mobility");
    const plyometrie = EXERCISE_CATEGORIES.filter(c => c.group === "plyometrie");
    const neuro = EXERCISE_CATEGORIES.filter(c => c.group === "neuro");
    const other = EXERCISE_CATEGORIES.filter(c => c.group === null);
    return { musculation, bodyweight, crossfit, course, ergo, sled, pilates, reathletisation, terrain, stretching, plyometrie, neuro, other };
  }, [selectedSport]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setSubcategory("");
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    if (category) {
      const currentGroup = getCategoryGroup(category);
      if (currentGroup === "terrain") {
        const availableTerrainCats = getTerrainCategoriesForSport(sport);
        if (!availableTerrainCats.find(c => c.value === category)) {
          setCategory("");
        }
      }
    }
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      sonnerToast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("exercise-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(path);
      setImageUrl(urlData.publicUrl);
      sonnerToast.success("Image uploadée");
    } catch (err: any) {
      sonnerToast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
      toast({ title: "Erreur", description: "Le nom et la catégorie sont requis", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("exercise_library").insert({
        user_id: user.id,
        name,
        category,
        subcategory: subcategory || null,
        youtube_url: youtubeUrl || null,
        description: description || null,
        difficulty,
        image_url: imageUrl || null,
        is_system: false,
      });
      if (error) throw error;

      toast({ title: "Exercice ajouté", description: "L'exercice a été ajouté à votre bibliothèque" });
      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName(""); setCategory(""); setSubcategory(""); setYoutubeUrl("");
    setDescription(""); setDifficulty("intermediate"); setSelectedSport("all"); setImageUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter un exercice</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Ajouter un exercice</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'exercice *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Squat, Uchi-komi, Dribble..." required />
          </div>

          <div className="space-y-2">
            <Label>Sport (pour exercices terrain)</Label>
            <Select value={selectedSport} onValueChange={handleSportChange}>
              <SelectTrigger><SelectValue placeholder="Filtrer par sport" /></SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map((sport) => <SelectItem key={sport.value} value={sport.value}>{sport.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={category} onValueChange={handleCategoryChange} required>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.musculation?.color}`}>Musculation</SelectLabel>
                    {groupedCategories.musculation.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.bodyweight?.color}`}>Poids de corps</SelectLabel>
                    {groupedCategories.bodyweight.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.crossfit_hyrox?.color}`}>CrossFit / Hyrox</SelectLabel>
                    {groupedCategories.crossfit.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.course?.color}`}>Course</SelectLabel>
                    {groupedCategories.course.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.ergo?.color}`}>Ergo / Cardio</SelectLabel>
                    {groupedCategories.ergo.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.sled?.color}`}>Traîneau</SelectLabel>
                    {groupedCategories.sled.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.pilates?.color}`}>Pilates / Yoga</SelectLabel>
                    {groupedCategories.pilates.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.plyometrie?.color}`}>Pliométrie</SelectLabel>
                    {groupedCategories.plyometrie.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.neuro?.color}`}>Neuro / Cognitif</SelectLabel>
                    {groupedCategories.neuro.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.reathletisation?.color}`}>Rehab / Réathlé</SelectLabel>
                    {groupedCategories.reathletisation.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.terrain?.color}`}>Terrain</SelectLabel>
                    {groupedCategories.terrain.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.stretching_mobility?.color}`}>Échauffement / Mobilité</SelectLabel>
                    {groupedCategories.stretching.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectGroup>
                  {groupedCategories.other.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">Autre</SelectLabel>
                      {groupedCategories.other.map((cat) => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulté</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((level) => <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Sous-catégorie</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger><SelectValue placeholder="Sélectionner (optionnel)" /></SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map((sub) => <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Photo (max 2 Mo)</Label>
            {imageUrl ? (
              <div className="relative w-full max-w-xs">
                <img src={imageUrl} alt="Preview" className="rounded-lg border max-h-32 w-full object-cover" />
                <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setImageUrl("")}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById("coach-exercise-image")?.click()}>
                <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{uploading ? "Upload..." : "Cliquer pour uploader"}</p>
              </div>
            )}
            <input id="coach-exercise-image" type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="youtube" className="flex items-center gap-2"><Video className="h-4 w-4" /> Lien vidéo</Label>
            <Input id="youtube" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." type="url" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description de l'exercice..." rows={3} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Ajout..." : "Ajouter"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [selectedSport, setSelectedSport] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const availableSubcategories = getSubcategoriesForCategory(category);

  // Group categories by type for display
  const groupedCategories = useMemo(() => {
    const musculation = EXERCISE_CATEGORIES.filter(c => c.group === "musculation");
    const bodyweight = EXERCISE_CATEGORIES.filter(c => c.group === "bodyweight");
    const crossfit = EXERCISE_CATEGORIES.filter(c => c.group === "crossfit_hyrox");
    const course = EXERCISE_CATEGORIES.filter(c => c.group === "course");
    const ergo = EXERCISE_CATEGORIES.filter(c => c.group === "ergo");
    const sled = EXERCISE_CATEGORIES.filter(c => c.group === "sled");
    const pilates = EXERCISE_CATEGORIES.filter(c => c.group === "pilates");
    const reathletisation = EXERCISE_CATEGORIES.filter(c => c.group === "reathletisation");
    const terrain = getTerrainCategoriesForSport(selectedSport);
    const stretching = EXERCISE_CATEGORIES.filter(c => c.group === "stretching_mobility");
    const plyometrie = EXERCISE_CATEGORIES.filter(c => c.group === "plyometrie");
    const neuro = EXERCISE_CATEGORIES.filter(c => c.group === "neuro");
    const other = EXERCISE_CATEGORIES.filter(c => c.group === null);
    
    return { musculation, bodyweight, crossfit, course, ergo, sled, pilates, reathletisation, terrain, stretching, plyometrie, neuro, other };
  }, [selectedSport]);

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    setSubcategory(""); // Reset subcategory when category changes
  };

  const handleSportChange = (sport: string) => {
    setSelectedSport(sport);
    // Reset category if it was a terrain category that's no longer available
    if (category) {
      const currentGroup = getCategoryGroup(category);
      if (currentGroup === "terrain") {
        const availableTerrainCats = getTerrainCategoriesForSport(sport);
        if (!availableTerrainCats.find(c => c.value === category)) {
          setCategory("");
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category) {
      toast({
        title: "Erreur",
        description: "Le nom et la catégorie sont requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { error } = await supabase.from("exercise_library").insert({
        user_id: user.id,
        name,
        category,
        subcategory: subcategory || null,
        youtube_url: youtubeUrl || null,
        description: description || null,
        difficulty,
        is_system: false,
      });

      if (error) throw error;

      toast({
        title: "Exercice ajouté",
        description: "L'exercice a été ajouté à votre bibliothèque",
      });

      queryClient.invalidateQueries({ queryKey: ["exercise-library"] });
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setSubcategory("");
    setYoutubeUrl("");
    setDescription("");
    setDifficulty("intermediate");
    setSelectedSport("all");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un exercice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un exercice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'exercice *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Squat, Uchi-komi, Dribble..."
              required
            />
          </div>

          {/* Sport filter for terrain exercises */}
          <div className="space-y-2">
            <Label>Sport (pour exercices terrain)</Label>
            <Select value={selectedSport} onValueChange={handleSportChange}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrer par sport" />
              </SelectTrigger>
              <SelectContent>
                {SPORT_OPTIONS.map((sport) => (
                  <SelectItem key={sport.value} value={sport.value}>
                    {sport.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={category} onValueChange={handleCategoryChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.musculation?.color}`}>Musculation</SelectLabel>
                    {groupedCategories.musculation.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.bodyweight?.color}`}>Poids de corps</SelectLabel>
                    {groupedCategories.bodyweight.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.crossfit_hyrox?.color}`}>CrossFit / Hyrox</SelectLabel>
                    {groupedCategories.crossfit.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.course?.color}`}>Course</SelectLabel>
                    {groupedCategories.course.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.ergo?.color}`}>Ergo / Cardio</SelectLabel>
                    {groupedCategories.ergo.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.sled?.color}`}>Traîneau</SelectLabel>
                    {groupedCategories.sled.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.pilates?.color}`}>Pilates / Yoga</SelectLabel>
                    {groupedCategories.pilates.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.plyometrie?.color}`}>Pliométrie</SelectLabel>
                    {groupedCategories.plyometrie.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.neuro?.color}`}>Neuro / Cognitif</SelectLabel>
                    {groupedCategories.neuro.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.reathletisation?.color}`}>Rehab / Réathlé</SelectLabel>
                    {groupedCategories.reathletisation.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.terrain?.color}`}>Terrain {selectedSport !== "all" && `(${SPORT_OPTIONS.find(s => s.value === selectedSport)?.label})`}</SelectLabel>
                    {groupedCategories.terrain.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel className={`text-xs font-semibold ${CATEGORY_GROUP_CONFIGS.stretching_mobility?.color}`}>Échauffement / Mobilité</SelectLabel>
                    {groupedCategories.stretching.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  {groupedCategories.other.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs font-semibold text-muted-foreground">Autre</SelectLabel>
                      {groupedCategories.other.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulté</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {availableSubcategories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="subcategory">Sous-catégorie</Label>
              <Select value={subcategory} onValueChange={setSubcategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubcategories.map((sub) => (
                    <SelectItem key={sub.value} value={sub.value}>
                      {sub.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="youtube">Lien YouTube</Label>
            <Input
              id="youtube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'exercice..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Ajout..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
