import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { Shield, Users, UserCog, Dumbbell, Stethoscope, User } from "lucide-react";

interface RoleMenuPermission {
  id: string;
  menu_key: string;
  menu_label: string;
  player_visible: boolean;
  staff_admin_visible: boolean;
  staff_coach_visible: boolean;
  staff_prepa_visible: boolean;
  staff_doctor_visible: boolean;
}

const roleColumns = [
  { key: "player_visible", label: "Joueur", icon: User },
  { key: "staff_admin_visible", label: "Admin", icon: Shield },
  { key: "staff_coach_visible", label: "Coach", icon: UserCog },
  { key: "staff_prepa_visible", label: "Prépa", icon: Dumbbell },
  { key: "staff_doctor_visible", label: "Médecin", icon: Stethoscope },
] as const;

export function RoleMenuPermissions() {
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["role-menu-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_menu_permissions")
        .select("*")
        .order("menu_label");
      if (error) throw error;
      return data as RoleMenuPermission[];
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({
      id,
      field,
      value,
    }: {
      id: string;
      field: keyof RoleMenuPermission;
      value: boolean;
    }) => {
      const { error } = await supabase
        .from("role_menu_permissions")
        .update({ [field]: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-menu-permissions"] });
      toast.success("Permission mise à jour");
    },
    onError: () => {
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleToggle = (
    permission: RoleMenuPermission,
    field: keyof RoleMenuPermission
  ) => {
    const currentValue = permission[field] as boolean;
    updatePermission.mutate({
      id: permission.id,
      field,
      value: !currentValue,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Permissions des menus par rôle
        </CardTitle>
        <CardDescription>
          Configurez quels menus chaque rôle peut voir. Les cases cochées indiquent les menus accessibles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Menu</TableHead>
                  {roleColumns.map((role) => (
                    <TableHead key={role.key} className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <role.icon className="h-4 w-4" />
                        <span className="text-xs">{role.label}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="font-medium">
                      {permission.menu_label}
                    </TableCell>
                    {roleColumns.map((role) => (
                      <TableCell key={role.key} className="text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={permission[role.key]}
                            onCheckedChange={() =>
                              handleToggle(permission, role.key)
                            }
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
