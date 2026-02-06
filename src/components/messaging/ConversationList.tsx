import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Plus, MessageSquare, Users, Hash } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Conversation {
  id: string;
  name: string | null;
  conversation_type: string;
  created_at: string;
}

interface ConversationListProps {
  categoryId: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function ConversationList({ categoryId, selectedId, onSelect }: ConversationListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("group");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("category_id", categoryId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
  });

  // Auto-create default conversations if missing
  const { data: defaultGroupsCreated } = useQuery({
    queryKey: ["default-conversations-check", categoryId],
    queryFn: async () => {
      if (!user) return true;
      
      // Check if STAFF and STAFF+Joueurs groups exist
      const staffGroupName = "Staff";
      const allGroupName = "Staff + Joueurs";
      
      const hasStaffGroup = conversations?.some(c => c.name === staffGroupName);
      const hasAllGroup = conversations?.some(c => c.name === allGroupName);
      
      // Create missing groups
      if (!hasStaffGroup) {
        const { data: conv } = await supabase
          .from("conversations")
          .insert({
            category_id: categoryId,
            name: staffGroupName,
            conversation_type: "group",
            created_by: user.id,
          })
          .select()
          .single();
          
        if (conv) {
          await supabase.from("conversation_participants").insert({
            conversation_id: conv.id,
            user_id: user.id,
            is_admin: true,
          });
        }
      }
      
      if (!hasAllGroup) {
        const { data: conv } = await supabase
          .from("conversations")
          .insert({
            category_id: categoryId,
            name: allGroupName,
            conversation_type: "group",
            created_by: user.id,
          })
          .select()
          .single();
          
        if (conv) {
          await supabase.from("conversation_participants").insert({
            conversation_id: conv.id,
            user_id: user.id,
            is_admin: true,
          });
        }
      }
      
      // Invalidate to refetch conversations list
      if (!hasStaffGroup || !hasAllGroup) {
        queryClient.invalidateQueries({ queryKey: ["conversations", categoryId] });
      }
      
      return true;
    },
    enabled: !!user && !!conversations,
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({
          category_id: categoryId,
          name: newName || null,
          conversation_type: newType,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (convError) throw convError;

      // Add creator as participant
      const { error: partError } = await supabase
        .from("conversation_participants")
        .insert({
          conversation_id: conv.id,
          user_id: user.id,
          is_admin: true,
        });

      if (partError) throw partError;

      return conv;
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", categoryId] });
      toast.success("Conversation créée");
      setCreateOpen(false);
      setNewName("");
      if (conv) {
        onSelect(conv.id);
      }
    },
    onError: () => {
      toast.error("Erreur lors de la création");
    },
  });

  const getConversationIcon = (type: string) => {
    switch (type) {
      case "group":
        return <Users className="h-4 w-4" />;
      case "channel":
        return <Hash className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-[500px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Conversations</CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Staff technique"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">Groupe</SelectItem>
                      <SelectItem value="direct">Message privé</SelectItem>
                      <SelectItem value="channel">Canal (annonces)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={() => createConversation.mutate()}>
                    Créer
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px]">
          {conversations?.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucune conversation. Créez-en une !
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {conversations?.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    selectedId === conv.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {getConversationIcon(conv.conversation_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {conv.name || "Conversation sans nom"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv.conversation_type === "channel" ? "Canal" : "Groupe"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
