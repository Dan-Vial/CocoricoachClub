 import { useState } from "react";
 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import { Badge } from "@/components/ui/badge";
 import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { Switch } from "@/components/ui/switch";
 import { toast } from "@/components/ui/sonner";
 import { Video, Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
 
 export function SuperAdminVideos() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   const [isAddOpen, setIsAddOpen] = useState(false);
   const [editingVideo, setEditingVideo] = useState<any>(null);
   const [form, setForm] = useState({
     title: "",
     description: "",
     video_url: "",
     thumbnail_url: "",
     category: "general",
     visibility: "all",
     is_active: true,
   });
 
   // Fetch videos
   const { data: videos = [], isLoading } = useQuery({
     queryKey: ["tutorial-videos"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("tutorial_videos")
         .select("*")
         .order("sort_order")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
   // Create video
   const createVideo = useMutation({
     mutationFn: async () => {
       const { error } = await supabase.from("tutorial_videos").insert({
         title: form.title,
         description: form.description || null,
         video_url: form.video_url,
         thumbnail_url: form.thumbnail_url || null,
         category: form.category,
         visibility: form.visibility,
         is_active: form.is_active,
         created_by: user?.id,
       });
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Vidéo ajoutée");
       queryClient.invalidateQueries({ queryKey: ["tutorial-videos"] });
       setIsAddOpen(false);
       resetForm();
     },
   });
 
   // Update video
   const updateVideo = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase
         .from("tutorial_videos")
         .update({
           title: form.title,
           description: form.description || null,
           video_url: form.video_url,
           thumbnail_url: form.thumbnail_url || null,
           category: form.category,
           visibility: form.visibility,
           is_active: form.is_active,
         })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Vidéo mise à jour");
       queryClient.invalidateQueries({ queryKey: ["tutorial-videos"] });
       setEditingVideo(null);
       resetForm();
     },
   });
 
   // Toggle active
   const toggleActive = useMutation({
     mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
       const { error } = await supabase
         .from("tutorial_videos")
         .update({ is_active: isActive })
         .eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["tutorial-videos"] });
     },
   });
 
   // Delete video
   const deleteVideo = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("tutorial_videos").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       toast.success("Vidéo supprimée");
       queryClient.invalidateQueries({ queryKey: ["tutorial-videos"] });
     },
   });
 
   const resetForm = () => {
     setForm({
       title: "",
       description: "",
       video_url: "",
       thumbnail_url: "",
       category: "general",
       visibility: "all",
       is_active: true,
     });
   };
 
   const openEdit = (video: any) => {
     setEditingVideo(video);
     setForm({
       title: video.title,
       description: video.description || "",
       video_url: video.video_url,
       thumbnail_url: video.thumbnail_url || "",
       category: video.category,
       visibility: video.visibility,
       is_active: video.is_active,
     });
   };
 
   const getVisibilityBadge = (visibility: string) => {
     switch (visibility) {
       case "all":
         return <Badge variant="outline">Tous</Badge>;
       case "admin":
         return <Badge className="bg-primary">Admins</Badge>;
       case "staff":
         return <Badge variant="secondary">Staff</Badge>;
       case "super_admin":
         return <Badge variant="destructive">Super Admin</Badge>;
       default:
         return <Badge variant="outline">{visibility}</Badge>;
     }
   };
 
  const videoFormContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Titre *</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Titre de la vidéo"
        />
      </div>
      <div className="space-y-2">
        <Label>URL de la vidéo *</Label>
        <Input
          value={form.video_url}
          onChange={(e) => setForm({ ...form, video_url: e.target.value })}
          placeholder="https://youtube.com/watch?v=..."
        />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description de la vidéo..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Général</SelectItem>
              <SelectItem value="getting_started">Démarrage</SelectItem>
              <SelectItem value="features">Fonctionnalités</SelectItem>
              <SelectItem value="tips">Astuces</SelectItem>
              <SelectItem value="updates">Mises à jour</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Visibilité</Label>
          <Select
            value={form.visibility}
            onValueChange={(v) => setForm({ ...form, visibility: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les utilisateurs</SelectItem>
              <SelectItem value="staff">Staff uniquement</SelectItem>
              <SelectItem value="admin">Admins uniquement</SelectItem>
              <SelectItem value="super_admin">Super Admin uniquement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>URL Miniature (optionnel)</Label>
        <Input
          value={form.thumbnail_url}
          onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={form.is_active}
          onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
        />
        <Label>Vidéo active</Label>
      </div>
    </div>
  );

  return (
     <Card>
       <CardHeader>
         <div className="flex items-center justify-between">
           <div>
             <CardTitle className="flex items-center gap-2">
               <Video className="h-5 w-5" />
               Vidéos tutoriels
             </CardTitle>
             <CardDescription>
               Gérez les vidéos de formation visibles dans toutes les catégories
             </CardDescription>
           </div>
           <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
             <DialogTrigger asChild>
               <Button>
                 <Plus className="h-4 w-4 mr-2" />
                 Ajouter une vidéo
               </Button>
             </DialogTrigger>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>Nouvelle vidéo</DialogTitle>
               </DialogHeader>
               {videoFormContent}
               <DialogFooter>
                 <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                   Annuler
                 </Button>
                 <Button
                   onClick={() => createVideo.mutate()}
                   disabled={!form.title || !form.video_url}
                 >
                   Ajouter
                 </Button>
               </DialogFooter>
             </DialogContent>
           </Dialog>
         </div>
       </CardHeader>
       <CardContent>
         {isLoading ? (
           <p className="text-muted-foreground">Chargement...</p>
         ) : videos.length === 0 ? (
           <p className="text-muted-foreground text-center py-8">Aucune vidéo</p>
         ) : (
           <div className="space-y-3">
             {videos.map((video: any) => (
               <div
                 key={video.id}
                 className={`flex items-center gap-4 p-4 border rounded-lg ${
                   !video.is_active ? "opacity-50" : ""
                 }`}
               >
                 <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                 
                 <div className="flex-1">
                   <div className="flex items-center gap-2">
                     <h4 className="font-medium">{video.title}</h4>
                     {getVisibilityBadge(video.visibility)}
                     <Badge variant="outline">{video.category}</Badge>
                   </div>
                   {video.description && (
                     <p className="text-sm text-muted-foreground mt-1">
                       {video.description}
                     </p>
                   )}
                 </div>
 
                 <div className="flex items-center gap-2">
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => toggleActive.mutate({ id: video.id, isActive: !video.is_active })}
                   >
                     {video.is_active ? (
                       <Eye className="h-4 w-4" />
                     ) : (
                       <EyeOff className="h-4 w-4" />
                     )}
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => openEdit(video)}
                   >
                     <Edit className="h-4 w-4" />
                   </Button>
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={() => {
                       if (confirm("Supprimer cette vidéo ?")) deleteVideo.mutate(video.id);
                     }}
                   >
                     <Trash2 className="h-4 w-4 text-destructive" />
                   </Button>
                 </div>
               </div>
             ))}
           </div>
         )}
 
         {/* Edit Dialog */}
         <Dialog open={!!editingVideo} onOpenChange={(open) => !open && setEditingVideo(null)}>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Modifier la vidéo</DialogTitle>
             </DialogHeader>
             {videoFormContent}
             <DialogFooter>
               <Button variant="outline" onClick={() => setEditingVideo(null)}>
                 Annuler
               </Button>
               <Button
                 onClick={() => editingVideo && updateVideo.mutate(editingVideo.id)}
                 disabled={!form.title || !form.video_url}
               >
                 Sauvegarder
               </Button>
             </DialogFooter>
           </DialogContent>
         </Dialog>
       </CardContent>
     </Card>
   );
 }