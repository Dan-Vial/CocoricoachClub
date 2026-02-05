 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Switch } from "@/components/ui/switch";
 import { toast } from "@/components/ui/sonner";
 import { Settings, Save } from "lucide-react";
 import { useState, useEffect } from "react";
 
 export function SuperAdminSettings() {
   const { user } = useAuth();
   const queryClient = useQueryClient();
   
   const [modules, setModules] = useState({
     gps: true,
     video: true,
     reports: true,
     wellness: true,
     nutrition: true,
   });
 
   const [defaults, setDefaults] = useState({
     max_clubs: 1,
     max_categories: 3,
     max_staff: 5,
     max_athletes: 50,
   });
 
   const [trialDays, setTrialDays] = useState(14);
 
   // Fetch settings
   const { data: settings = [], isLoading } = useQuery({
     queryKey: ["app-settings"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("app_settings")
         .select("*");
       if (error) throw error;
       return data;
     },
   });
 
   // Update state when settings load
   useEffect(() => {
     if (settings.length > 0) {
       const modulesData = settings.find((s: any) => s.setting_key === "modules_enabled");
       const defaultsData = settings.find((s: any) => s.setting_key === "default_limits");
       const trialData = settings.find((s: any) => s.setting_key === "trial_days");
 
       if (modulesData?.setting_value) {
         setModules(modulesData.setting_value as typeof modules);
       }
       if (defaultsData?.setting_value) {
         setDefaults(defaultsData.setting_value as typeof defaults);
       }
       if (trialData?.setting_value) {
         setTrialDays(Number(trialData.setting_value));
       }
     }
   }, [settings]);
 
   // Save settings
   const saveSettings = useMutation({
     mutationFn: async () => {
       // Update modules
       await supabase
         .from("app_settings")
         .update({ 
           setting_value: modules,
           updated_by: user?.id,
         })
         .eq("setting_key", "modules_enabled");
 
       // Update defaults
       await supabase
         .from("app_settings")
         .update({ 
           setting_value: defaults,
           updated_by: user?.id,
         })
         .eq("setting_key", "default_limits");
 
       // Update trial days
       await supabase
         .from("app_settings")
         .update({ 
           setting_value: trialDays,
           updated_by: user?.id,
         })
         .eq("setting_key", "trial_days");
     },
     onSuccess: () => {
       toast.success("Paramètres sauvegardés");
       queryClient.invalidateQueries({ queryKey: ["app-settings"] });
     },
     onError: () => {
       toast.error("Erreur lors de la sauvegarde");
     },
   });
 
   if (isLoading) {
     return <p className="text-muted-foreground">Chargement...</p>;
   }
 
   return (
     <div className="space-y-6">
       {/* Modules */}
       <Card>
         <CardHeader>
           <CardTitle className="flex items-center gap-2">
             <Settings className="h-5 w-5" />
             Modules actifs
           </CardTitle>
           <CardDescription>
             Activez ou désactivez les modules de l'application
           </CardDescription>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
             <div className="flex items-center justify-between p-4 border rounded-lg">
               <Label>GPS</Label>
               <Switch
                 checked={modules.gps}
                 onCheckedChange={(checked) => setModules({ ...modules, gps: checked })}
               />
             </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
               <Label>Vidéo</Label>
               <Switch
                 checked={modules.video}
                 onCheckedChange={(checked) => setModules({ ...modules, video: checked })}
               />
             </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
               <Label>Rapports</Label>
               <Switch
                 checked={modules.reports}
                 onCheckedChange={(checked) => setModules({ ...modules, reports: checked })}
               />
             </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
               <Label>Wellness</Label>
               <Switch
                 checked={modules.wellness}
                 onCheckedChange={(checked) => setModules({ ...modules, wellness: checked })}
               />
             </div>
             <div className="flex items-center justify-between p-4 border rounded-lg">
               <Label>Nutrition</Label>
               <Switch
                 checked={modules.nutrition}
                 onCheckedChange={(checked) => setModules({ ...modules, nutrition: checked })}
               />
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Default Limits */}
       <Card>
         <CardHeader>
           <CardTitle>Limites par défaut</CardTitle>
           <CardDescription>
             Valeurs par défaut pour les nouveaux clients
           </CardDescription>
         </CardHeader>
         <CardContent>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="space-y-2">
               <Label>Clubs max</Label>
               <Input
                 type="number"
                 min={1}
                 value={defaults.max_clubs}
                 onChange={(e) => setDefaults({ ...defaults, max_clubs: parseInt(e.target.value) || 1 })}
               />
             </div>
             <div className="space-y-2">
               <Label>Catégories/club</Label>
               <Input
                 type="number"
                 min={1}
                 value={defaults.max_categories}
                 onChange={(e) => setDefaults({ ...defaults, max_categories: parseInt(e.target.value) || 1 })}
               />
             </div>
             <div className="space-y-2">
               <Label>Staff max</Label>
               <Input
                 type="number"
                 min={1}
                 value={defaults.max_staff}
                 onChange={(e) => setDefaults({ ...defaults, max_staff: parseInt(e.target.value) || 1 })}
               />
             </div>
             <div className="space-y-2">
               <Label>Athlètes max</Label>
               <Input
                 type="number"
                 min={1}
                 value={defaults.max_athletes}
                 onChange={(e) => setDefaults({ ...defaults, max_athletes: parseInt(e.target.value) || 1 })}
               />
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Trial Period */}
       <Card>
         <CardHeader>
           <CardTitle>Période d'essai</CardTitle>
           <CardDescription>
             Durée de la période d'essai pour les nouveaux clients
           </CardDescription>
         </CardHeader>
         <CardContent>
           <div className="flex items-center gap-4">
             <div className="space-y-2">
               <Label>Jours d'essai</Label>
               <Input
                 type="number"
                 min={0}
                 className="w-32"
                 value={trialDays}
                 onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
               />
             </div>
           </div>
         </CardContent>
       </Card>
 
       {/* Save Button */}
       <div className="flex justify-end">
         <Button onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
           <Save className="h-4 w-4 mr-2" />
           Sauvegarder les paramètres
         </Button>
       </div>
     </div>
   );
 }