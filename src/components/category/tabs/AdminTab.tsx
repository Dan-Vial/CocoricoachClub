import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ClipboardCheck, Users, FileSpreadsheet, History, FileText } from "lucide-react";
import { AttendanceTab } from "@/components/category/attendance/AttendanceTab";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";
import { MedicalRecordsTab } from "@/components/health/MedicalRecordsTab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface AdminTabProps {
  categoryId: string;
}

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
      <div className="flex justify-center overflow-x-auto -mx-4 px-4 pb-2">
        <ColoredSubTabsList colorKey="admin" className="inline-flex w-max">
          <ColoredSubTabsTrigger 
            value="attendance" 
            colorKey="admin"
            icon={<ClipboardCheck className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Présences</span>
            <span className="sm:hidden">Prés</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="staff" 
            colorKey="admin"
            icon={<Users className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Staff & Rôles</span>
            <span className="sm:hidden">Staff</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="medical" 
            colorKey="admin"
            icon={<FileText className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Suivi Médical</span>
            <span className="sm:hidden">Médical</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="convocations" 
            colorKey="admin"
            icon={<FileSpreadsheet className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Convocations</span>
            <span className="sm:hidden">Convoc</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="audit" 
            colorKey="admin"
            icon={<History className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Journal</span>
            <span className="sm:hidden">Log</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
      </div>

      <TabsContent value="attendance">
        <AttendanceTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="staff">
        <CategoryCollaborationTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="medical">
        <MedicalRecordsTab categoryId={categoryId} />
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
