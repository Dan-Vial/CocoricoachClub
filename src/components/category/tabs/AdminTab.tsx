import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ClipboardCheck, Users, FileSpreadsheet, FileText, UserSearch, FolderOpen, Truck, BarChart3 } from "lucide-react";
import { AttendanceTab } from "@/components/category/attendance/AttendanceTab";
import { CategoryCollaborationTab } from "@/components/category/CategoryCollaborationTab";
import { MedicalRecordsTab } from "@/components/health/MedicalRecordsTab";
import { MatchSheetsSection } from "@/components/category/admin/MatchSheetsSection";

import { RecruitmentSection } from "@/components/category/admin/RecruitmentSection";
import { DocumentsSection } from "@/components/category/admin/DocumentsSection";
import { LogisticsSection } from "@/components/category/admin/LogisticsSection";
import { ReportsTab } from "@/components/category/ReportsTab";
import { ColoredSubTabsList, ColoredSubTabsTrigger } from "@/components/ui/colored-subtabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdminTabProps {
  categoryId: string;
}

const TEAM_SPORTS_WITH_MATCH_SHEETS = ["rugby", "football", "basketball", "handball", "volleyball"];

export function AdminTab({ categoryId }: AdminTabProps) {
  const { data: category } = useQuery({
    queryKey: ["category-sport-admin", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("clubs(sport)")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const sport = ((category?.clubs as any)?.sport || "rugby").toLowerCase();
  const hasMatchSheets = TEAM_SPORTS_WITH_MATCH_SHEETS.some(s => sport.includes(s));

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
          {hasMatchSheets && (
            <ColoredSubTabsTrigger 
              value="matchsheets" 
              colorKey="admin"
              icon={<FileSpreadsheet className="h-4 w-4" />}
            >
              <span className="hidden sm:inline">Feuilles de Match</span>
              <span className="sm:hidden">Feuilles</span>
            </ColoredSubTabsTrigger>
          )}
          <ColoredSubTabsTrigger 
            value="recruitment" 
            colorKey="admin"
            icon={<UserSearch className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Recrutement</span>
            <span className="sm:hidden">Recru</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="documents" 
            colorKey="admin"
            icon={<FolderOpen className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Documents & Certificats</span>
            <span className="sm:hidden">Docs</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="logistics" 
            colorKey="admin"
            icon={<Truck className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Logistique</span>
            <span className="sm:hidden">Logi</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="reports" 
            colorKey="admin"
            icon={<BarChart3 className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Rapports</span>
            <span className="sm:hidden">Rapp</span>
          </ColoredSubTabsTrigger>
          <ColoredSubTabsTrigger 
            value="staff" 
            colorKey="admin"
            icon={<Users className="h-4 w-4" />}
          >
            <span className="hidden sm:inline">Staff & Rôles</span>
            <span className="sm:hidden">Staff</span>
          </ColoredSubTabsTrigger>
        </ColoredSubTabsList>
      </div>

      <TabsContent value="attendance">
        <AttendanceTab categoryId={categoryId} />
      </TabsContent>

      {hasMatchSheets && (
        <TabsContent value="matchsheets">
          <MatchSheetsSection categoryId={categoryId} />
        </TabsContent>
      )}

      <TabsContent value="logistics">
        <LogisticsSection categoryId={categoryId} />
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