import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadMessages, markConversationAsRead } from "@/hooks/useUnreadMessages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MessageSquare, Users, Hash, User, Trash2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  isAthlete?: boolean;
}

interface Player {
  id: string;
  name: string;
  user_id: string | null;
}

interface StaffMember {
  id: string;
  user_id: string;
  profile: {
    full_name: string | null;
  } | null;
}

export function ConversationList({ categoryId, selectedId, onSelect, isAthlete = false }: ConversationListProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("group");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [selectedRecipientType, setSelectedRecipientType] = useState<"player" | "staff">("player");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { byConversation: unreadByConversation } = useUnreadMessages(categoryId);

  const handleSelect = async (convId: string) => {
    onSelect(convId);
    if (user) {
      await markConversationAsRead(convId, user.id);
      queryClient.invalidateQueries({ queryKey: ["unread-messages", categoryId, user.id] });
    }
  };

  // Fetch players for private messages
  const { data: players } = useQuery({
    queryKey: ["category-players-messaging", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("id, name, user_id")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data as Player[];
    },
  });

  // Fetch staff members for private messages
  const { data: staffMembers } = useQuery({
    queryKey: ["category-staff-messaging", categoryId],
    queryFn: async () => {
      const { data: category } = await supabase
        .from("categories")
        .select("club_id")
        .eq("id", categoryId)
        .single();

      if (!category) return [];

      const { data: members, error } = await supabase
        .from("club_members")
        .select("id, user_id")
        .eq("club_id", category.club_id);

      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = (members || []).filter(m => m.user_id !== user?.id).map(m => m.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return (members || [])
        .filter(m => m.user_id !== user?.id)
        .map(m => ({
          ...m,
          profile: profiles?.find(p => p.id === m.user_id) || null
        })) as StaffMember[];
    },
    enabled: !!user,
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", categoryId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get conversation IDs where user is a participant
      const { data: participantData, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", user.id);
      
      if (partError) throw partError;
      
      const participantConvIds = (participantData || []).map(p => p.conversation_id);
      
      // Fetch conversations for this category where user is a participant
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("category_id", categoryId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      
      // Only show conversations where user is a participant
      // Hide "Staff" group from athletes
      return (data as Conversation[]).filter(conv => {
        if (!participantConvIds.includes(conv.id)) return false;
        if (isAthlete && conv.name === "Staff") return false;
        return true;
      });
    },
    enabled: !!user,
  });

  // Fetch participants for all visible conversations
  const conversationIds = conversations?.map(c => c.id) || [];
  const { data: allParticipants } = useQuery({
    queryKey: ["conversation-all-participants", conversationIds],
    queryFn: async () => {
      if (conversationIds.length === 0) return {};
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds);
      if (error) throw error;

      // Collect unique user IDs
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      if (userIds.length === 0) return {};

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap: Record<string, string> = {};
      profiles?.forEach(p => { profileMap[p.id] = p.full_name || "Inconnu"; });

      // Group by conversation
      const result: Record<string, string[]> = {};
      (data || []).forEach(p => {
        if (!result[p.conversation_id]) result[p.conversation_id] = [];
        result[p.conversation_id].push(profileMap[p.user_id] || "Inconnu");
      });
      return result;
    },
    enabled: conversationIds.length > 0,
  });

  // Auto-create default conversations if missing AND auto-join to default groups
  const { data: defaultGroupsCreated } = useQuery({
    queryKey: ["default-conversations-check", categoryId, isAthlete, user?.id],
    queryFn: async () => {
      if (!user) return true;
      
      const staffGroupName = "Staff";
      const allGroupName = "Staff + Joueurs";
      
      // Always check DB directly to avoid creating duplicates
      const { data: existingGroups } = await supabase
        .from("conversations")
        .select("id, name")
        .eq("category_id", categoryId)
        .eq("conversation_type", "group")
        .in("name", [staffGroupName, allGroupName]);

      const staffGroupConv = existingGroups?.find(c => c.name === staffGroupName);
      const allGroupConv = existingGroups?.find(c => c.name === allGroupName);
      
      // Staff logic: create missing groups + auto-join existing ones
      if (!isAthlete) {
        // Create "Staff" group if it doesn't exist at all
        let staffConvId = staffGroupConv?.id;
        if (!staffConvId) {
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
            staffConvId = conv.id;
            await supabase.from("conversation_participants").insert({
              conversation_id: conv.id,
              user_id: user.id,
              is_admin: true,
            });
          }
        } else {
          // Group exists, ensure current staff user is a participant
          await supabase
            .from("conversation_participants")
            .upsert(
              { conversation_id: staffConvId, user_id: user.id, is_admin: false },
              { onConflict: "conversation_id,user_id" }
            );
        }
        
        // Create "Staff + Joueurs" group if it doesn't exist at all
        let allConvId = allGroupConv?.id;
        if (!allConvId) {
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
            allConvId = conv.id;
            // Add creator as admin participant
            await supabase.from("conversation_participants").insert({
              conversation_id: conv.id,
              user_id: user.id,
              is_admin: true,
            });

            // Auto-add ALL existing athletes with user accounts to the group
            const { data: athleteMembers } = await supabase
              .from("category_members")
              .select("user_id")
              .eq("category_id", categoryId)
              .eq("role", "athlete");

            if (athleteMembers && athleteMembers.length > 0) {
              const participantRows = athleteMembers
                .filter(m => m.user_id !== user.id)
                .map(m => ({
                  conversation_id: conv.id,
                  user_id: m.user_id,
                  is_admin: false,
                }));
              if (participantRows.length > 0) {
                await supabase.from("conversation_participants").insert(participantRows);
              }
            }

            // Also add all staff members to this group
            const { data: category } = await supabase
              .from("categories")
              .select("club_id")
              .eq("id", categoryId)
              .single();

            if (category) {
              const { data: staffMembersData } = await supabase
                .from("club_members")
                .select("user_id")
                .eq("club_id", category.club_id);

              if (staffMembersData && staffMembersData.length > 0) {
                const staffRows = staffMembersData
                  .filter(m => m.user_id !== user.id)
                  .map(m => ({
                    conversation_id: conv.id,
                    user_id: m.user_id,
                    is_admin: false,
                  }));
                if (staffRows.length > 0) {
                  await supabase
                    .from("conversation_participants")
                    .upsert(staffRows, { onConflict: "conversation_id,user_id" });
                }
              }
            }
          }
        } else {
          // Group exists, ensure current staff user is a participant
          await supabase
            .from("conversation_participants")
            .upsert(
              { conversation_id: allConvId, user_id: user.id, is_admin: false },
              { onConflict: "conversation_id,user_id" }
            );
        }
        
        // Refresh conversations list
        queryClient.invalidateQueries({ queryKey: ["conversations", categoryId] });
      }

      // Auto-join athlete to "Staff + Joueurs" if not already a participant
      if (isAthlete) {
        if (allGroupConv) {
          await supabase
            .from("conversation_participants")
            .upsert(
              {
                conversation_id: allGroupConv.id,
                user_id: user.id,
                is_admin: false,
              },
              { onConflict: "conversation_id,user_id" }
            );
          queryClient.invalidateQueries({ queryKey: ["conversations", categoryId] });
        }
      }
      
      return true;
    },
    enabled: !!user && !!conversations,
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      
      // For direct messages, create a conversation with the selected recipient
      if (newType === "direct") {
        if (!selectedRecipientId) {
          throw new Error("Veuillez sélectionner un destinataire");
        }

        let recipientUserId: string | null = null;
        let recipientName: string = "";

        if (selectedRecipientType === "player") {
          const player = players?.find(p => p.id === selectedRecipientId);
          recipientName = player?.name || "Joueur";
          // Lookup the player's user_id
          const { data: playerData } = await supabase
            .from("players")
            .select("user_id")
            .eq("id", selectedRecipientId)
            .single();
          recipientUserId = playerData?.user_id || null;
          if (!recipientUserId) {
            throw new Error("Ce joueur n'a pas encore de compte utilisateur");
          }
        } else {
          recipientUserId = selectedRecipientId;
          recipientName = staffMembers?.find(s => s.user_id === selectedRecipientId)?.profile?.full_name || "Staff";
        }

        // Check if a DM already exists between these two users
        const { data: existingParticipations } = await supabase
          .from("conversation_participants")
          .select("conversation_id")
          .eq("user_id", user.id);

        const myConvIds = (existingParticipations || []).map(p => p.conversation_id);

        if (myConvIds.length > 0) {
          const { data: recipientParticipations } = await supabase
            .from("conversation_participants")
            .select("conversation_id")
            .eq("user_id", recipientUserId)
            .in("conversation_id", myConvIds);

          const sharedConvIds = (recipientParticipations || []).map(p => p.conversation_id);

          if (sharedConvIds.length > 0) {
            // Check if any of the shared conversations is a direct message
            const { data: existingDM } = await supabase
              .from("conversations")
              .select("id")
              .in("id", sharedConvIds)
              .eq("conversation_type", "direct")
              .maybeSingle();

            if (existingDM) {
              // DM already exists, just select it
              return existingDM;
            }
          }
        }

        // Get current user's display name for the conversation name
        const { data: myProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        const myName = myProfile?.full_name || "Moi";

        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .insert({
            category_id: categoryId,
            name: `${myName} ↔ ${recipientName}`,
            conversation_type: "direct",
            created_by: user.id,
          })
          .select()
          .single();
        
        if (convError) throw convError;

        // Add both users as participants
        await supabase.from("conversation_participants").insert([
          { conversation_id: conv.id, user_id: user.id, is_admin: true },
          { conversation_id: conv.id, user_id: recipientUserId, is_admin: false },
        ]);

        return conv;
      }
      
      // For groups/channels
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
      setNewType("group");
      setSelectedRecipientId("");
      if (conv) {
        onSelect(conv.id);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création");
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      // Delete messages first
      const { error: msgError } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);
      
      if (msgError) console.warn("Error deleting messages:", msgError);

      // Delete participants
      const { error: partError } = await supabase
        .from("conversation_participants")
        .delete()
        .eq("conversation_id", conversationId);
      
      if (partError) console.warn("Error deleting participants:", partError);

      // Delete conversation
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;
      
      return conversationId;
    },
    onSuccess: (deletedId) => {
      // Close dialog first
      setDeleteDialogOpen(false);
      
      // If deleted conversation was selected, deselect it
      if (selectedId === deletedId) {
        onSelect("");
      }
      
      // Force refetch conversations
      queryClient.invalidateQueries({ queryKey: ["conversations", categoryId] });
      queryClient.refetchQueries({ queryKey: ["conversations", categoryId] });
      
      setConversationToDelete(null);
      toast.success("Conversation supprimée");
    },
    onError: (error) => {
      console.error("Error deleting conversation:", error);
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleDeleteClick = (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    setConversationToDelete(convId);
    setDeleteDialogOpen(true);
  };

  const getConversationIcon = (type: string) => {
    switch (type) {
      case "group":
        return <Users className="h-4 w-4" />;
      case "channel":
        return <Hash className="h-4 w-4" />;
      case "direct":
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const isDefaultGroup = (convName: string | null) => {
    return convName === "Staff" || convName === "Staff + Joueurs";
  };

  return (
    <>
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
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={(value) => {
                      setNewType(value);
                      setSelectedRecipientId("");
                    }}>
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

                  {newType === "direct" ? (
                    <>
                      <div className="space-y-2">
                        <Label>Type de destinataire</Label>
                        <Select 
                          value={selectedRecipientType} 
                          onValueChange={(value: "player" | "staff") => {
                            setSelectedRecipientType(value);
                            setSelectedRecipientId("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="player">Joueur</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Destinataire</Label>
                        <Select value={selectedRecipientId} onValueChange={setSelectedRecipientId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner..." />
                          </SelectTrigger>
                          <SelectContent>
                            {selectedRecipientType === "player" ? (
                              players?.filter(p => p.user_id).map((player) => (
                                <SelectItem key={player.id} value={player.id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {player.name.substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {player.name}
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              staffMembers?.map((member) => (
                                <SelectItem key={member.user_id} value={member.user_id}>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {(member.profile?.full_name || "?").substring(0, 2).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {member.profile?.full_name || "Membre du staff"}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: Staff technique"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>
                      Annuler
                    </Button>
                    <Button 
                      onClick={() => createConversation.mutate()}
                      disabled={newType === "direct" && !selectedRecipientId}
                    >
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
                  <div
                    key={conv.id}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors group",
                      selectedId === conv.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <button
                      onClick={() => handleSelect(conv.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      {getConversationIcon(conv.conversation_type)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conv.name || "Conversation sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {conv.conversation_type === "channel" 
                            ? "Canal" 
                            : conv.conversation_type === "direct"
                            ? "Message privé"
                            : "Groupe"}
                        </p>
                      </div>
                      {(unreadByConversation[conv.id] || 0) > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center p-0 text-xs rounded-full">
                          {unreadByConversation[conv.id] > 9 ? "9+" : unreadByConversation[conv.id]}
                        </Badge>
                      )}
                    </button>

                    {/* Delete button - hidden for default groups */}
                    {!isDefaultGroup(conv.name) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => handleDeleteClick(e as any, conv.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement la conversation et tous ses messages.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => conversationToDelete && deleteConversation.mutate(conversationToDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}