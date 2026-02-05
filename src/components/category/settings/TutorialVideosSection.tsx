 import { useQuery } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Video, Play, ExternalLink } from "lucide-react";
 import { Button } from "@/components/ui/button";
 
 export function TutorialVideosSection() {
   const { user } = useAuth();
 
   // Check if user is admin
   const { data: isAdmin } = useQuery({
     queryKey: ["user-is-admin", user?.id],
     queryFn: async () => {
       if (!user?.id) return false;
       const { data } = await supabase
         .from("club_members")
         .select("role")
         .eq("user_id", user.id)
         .eq("role", "admin")
         .maybeSingle();
       return !!data;
     },
     enabled: !!user?.id,
   });
 
   // Fetch tutorial videos based on user's visibility level
   const { data: videos = [], isLoading } = useQuery({
     queryKey: ["tutorial-videos-user", isAdmin],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("tutorial_videos")
         .select("*")
         .eq("is_active", true)
         .order("sort_order")
         .order("created_at", { ascending: false });
       if (error) throw error;
       return data;
     },
   });
 
   const getCategoryLabel = (category: string) => {
     switch (category) {
       case "general":
         return "Général";
       case "getting_started":
         return "Démarrage";
       case "features":
         return "Fonctionnalités";
       case "tips":
         return "Astuces";
       case "updates":
         return "Mises à jour";
       default:
         return category;
     }
   };
 
   const getYoutubeEmbedUrl = (url: string) => {
     const videoId = url.match(
       /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
     )?.[1];
     return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
   };
 
   if (isLoading) {
     return <p className="text-muted-foreground">Chargement des tutoriels...</p>;
   }
 
   if (videos.length === 0) {
     return (
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Video className="h-5 w-5" />
             Tutoriels & Formation
           </CardTitle>
         </CardHeader>
         <CardContent>
           <p className="text-muted-foreground text-center py-8">
             Aucun tutoriel disponible pour le moment
           </p>
         </CardContent>
       </Card>
     );
   }
 
   // Group videos by category
   const videosByCategory = videos.reduce((acc: Record<string, any[]>, video: any) => {
     if (!acc[video.category]) {
       acc[video.category] = [];
     }
     acc[video.category].push(video);
     return acc;
   }, {});
 
   return (
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Video className="h-5 w-5" />
           Tutoriels & Formation
         </CardTitle>
         <CardDescription>
           Vidéos pour vous aider à utiliser l'application
         </CardDescription>
       </CardHeader>
       <CardContent>
         <div className="space-y-6">
           {Object.entries(videosByCategory).map(([category, categoryVideos]) => (
             <div key={category}>
               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                 <Badge variant="outline">{getCategoryLabel(category)}</Badge>
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {(categoryVideos as any[]).map((video) => {
                   const embedUrl = getYoutubeEmbedUrl(video.video_url);
                   
                   return (
                     <div
                       key={video.id}
                       className="border rounded-lg overflow-hidden"
                     >
                       {embedUrl ? (
                         <div className="aspect-video">
                           <iframe
                             src={embedUrl}
                             title={video.title}
                             className="w-full h-full"
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                             allowFullScreen
                           />
                         </div>
                       ) : (
                         <div className="aspect-video bg-muted flex items-center justify-center">
                           <Button
                             variant="outline"
                             onClick={() => window.open(video.video_url, "_blank")}
                           >
                             <Play className="h-4 w-4 mr-2" />
                             Voir la vidéo
                           </Button>
                         </div>
                       )}
                       <div className="p-3">
                         <h4 className="font-medium">{video.title}</h4>
                         {video.description && (
                           <p className="text-sm text-muted-foreground mt-1">
                             {video.description}
                           </p>
                         )}
                         <Button
                           variant="ghost"
                           size="sm"
                           className="mt-2"
                           onClick={() => window.open(video.video_url, "_blank")}
                         >
                           <ExternalLink className="h-4 w-4 mr-1" />
                           Ouvrir dans un nouvel onglet
                         </Button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           ))}
         </div>
       </CardContent>
     </Card>
   );
 }