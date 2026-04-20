import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ClipboardCheck, Users, UserSearch, FolderOpen, BarChart3 } from "lucide-react";
import { AttendanceTab } from "@/components/category/attendance/AttendanceTab";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";

import { RecruitmentSection } from "@/components/category/admin/RecruitmentSection";
import { DocumentsSection } from "@/components/category/admin/DocumentsSection";

import { ReportsTab } from "@/components/category/ReportsTab";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";

interface AdminTabProps {
  categoryId: string;
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
            tooltip="Suivi des présences aux séances et matchs : historique, taux et statistiques de participation"
          >
            <span className="hidden sm:inline">Présences</span>
            <span className="sm:hidden">Prés</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="recruitment" 
            colorKey="admin"
            icon={<UserSearch className="h-4 w-4" />}
            tooltip="Gestion du recrutement : fiches prospects, évaluations et suivi des candidatures"
          >
            <span className="hidden sm:inline">Recrutement</span>
            <span className="sm:hidden">Recru</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="documents" 
            colorKey="admin"
            icon={<FolderOpen className="h-4 w-4" />}
            tooltip="Centralisation des documents administratifs : licences, certificats médicaux, autorisations"
          >
            <span className="hidden sm:inline">Documents & Certificats</span>
            <span className="sm:hidden">Docs</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="reports" 
            colorKey="admin"
            icon={<BarChart3 className="h-4 w-4" />}
            tooltip="Rapports synthétiques : bilans de saison, statistiques générales et exports"
          >
            <span className="hidden sm:inline">Rapports</span>
            <span className="sm:hidden">Rapp</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="staff" 
            colorKey="admin"
            icon={<Users className="h-4 w-4" />}
            tooltip="Gestion du staff : rôles, permissions et invitations des membres de l'encadrement"
          >
            <span className="hidden sm:inline">Staff & Rôles</span>
            <span className="sm:hidden">Staff</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
      </div>

      <TabsContent value="attendance">
        <AttendanceTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="recruitment">
        <RecruitmentSection categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="documents">
        <DocumentsSection categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="reports">
        <ReportsTab categoryId={categoryId} />
      </TabsContent>

      <TabsContent value="staff">
        <CategoryCollaborationTab categoryId={categoryId} />
      </TabsContent>
    </Tabs>
  );
}