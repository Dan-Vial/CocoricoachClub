import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Users, FileSpreadsheet, History } from "lucide-react";
import { AttendanceTab } from "@/components/category/attendance/AttendanceTab";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminTabProps {
  categoryId: string;
}

// Placeholder for Convocations - to be expanded
function ConvocationsSection({ categoryId }: { categoryId: string }) {
  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Convocations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Gérez les convocations pour les matchs et regroupements. Créez des groupes, exportez des listes.
        </p>
        <div className="mt-4 p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center">
          <p className="text-muted-foreground">
            Fonctionnalité à venir — Convocations de joueurs pour matchs et compétitions
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Placeholder for Audit Logs - to be expanded
function AuditSection({ categoryId }: { categoryId: string }) {
  return (
    <Card className="bg-gradient-card shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Journal d'activité
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Historique des actions effectuées dans cette catégorie (modifications, suppressions, ajouts).
        </p>
        <div className="mt-4 p-8 border-2 border-dashed border-muted-foreground/20 rounded-lg text-center">
          <p className="text-muted-foreground">
            Fonctionnalité à venir — Suivi des modifications et audits
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminTab({ categoryId }: AdminTabProps) {
  return (
    <Tabs defaultValue="attendance" className="space-y-4">
      <div className="overflow-x-auto -mx-4 px-4 pb-2">
        <TabsList className="inline-flex w-max min-w-full gap-1 h-auto bg-muted p-1">
          <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Présences</span>
            <span className="sm:hidden">Prés</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Staff & Rôles</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="convocations" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Convocations</span>
            <span className="sm:hidden">Convoc</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-1.5 whitespace-nowrap">
            <History className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Journal</span>
            <span className="sm:hidden">Log</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="attendance">
        <AttendanceTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="staff">
        <CategoryCollaborationTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="convocations">
        <ConvocationsSection categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="audit">
        <AuditSection categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}
