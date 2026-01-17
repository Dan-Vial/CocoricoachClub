import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Add40mSprintDialog } from "./Add40mSprintDialog";
import { Add1600mRunDialog } from "./Add1600mRunDialog";
import { AddRunningTestDialog } from "./AddRunningTestDialog";
import { SpeedTestsTable } from "./SpeedTestsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useViewerModeContext } from "@/contexts/ViewerModeContext";

interface SpeedTestsSectionProps {
  categoryId: string;
}

export function SpeedTestsSection({ categoryId }: SpeedTestsSectionProps) {
  const [is40mDialogOpen, setIs40mDialogOpen] = useState(false);
  const [is1600mDialogOpen, setIs1600mDialogOpen] = useState(false);
  const [isRunningDialogOpen, setIsRunningDialogOpen] = useState(false);
  const { isViewer } = useViewerModeContext();

  const { data: players } = useQuery({
    queryKey: ["players", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("category_id", categoryId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      {!isViewer && (
        <div className="flex justify-end">
          <Button onClick={() => setIsRunningDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter un test de course
          </Button>
        </div>
      )}

      <Tabs defaultValue="40m" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="40m">40m Sprint</TabsTrigger>
          <TabsTrigger value="1600m">1600m Run</TabsTrigger>
          <TabsTrigger value="10m">10m Sprint</TabsTrigger>
          <TabsTrigger value="20m">20m Sprint</TabsTrigger>
          <TabsTrigger value="30m">30m Sprint</TabsTrigger>
          <TabsTrigger value="60m">60m Sprint</TabsTrigger>
          <TabsTrigger value="100m">100m Sprint</TabsTrigger>
          <TabsTrigger value="cooper">Cooper</TabsTrigger>
          <TabsTrigger value="beep">Beep Test</TabsTrigger>
          <TabsTrigger value="yoyo">Yo-Yo</TabsTrigger>
        </TabsList>

        <TabsContent value="40m">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Test 40m Sprint</CardTitle>
                {!isViewer && (
                  <Button onClick={() => setIs40mDialogOpen(true)} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Entrez le temps en secondes pour calculer automatiquement la vitesse
              </p>
              <SpeedTestsTable categoryId={categoryId} testType="40m_sprint" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="1600m">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Test 1600m Run</CardTitle>
                {!isViewer && (
                  <Button onClick={() => setIs1600mDialogOpen(true)} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Entrez le temps pour calculer automatiquement la VMA
              </p>
              <SpeedTestsTable categoryId={categoryId} testType="1600m_run" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="10m">
          <Card>
            <CardHeader>
              <CardTitle>Test 10m Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="10m_sprint" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="20m">
          <Card>
            <CardHeader>
              <CardTitle>Test 20m Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="20m_sprint" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="30m">
          <Card>
            <CardHeader>
              <CardTitle>Test 30m Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="30m_sprint" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="60m">
          <Card>
            <CardHeader>
              <CardTitle>Test 60m Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="60m_sprint" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="100m">
          <Card>
            <CardHeader>
              <CardTitle>Test 100m Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="100m_sprint" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cooper">
          <Card>
            <CardHeader>
              <CardTitle>Test de Cooper (12 min)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Distance parcourue en 12 minutes
              </p>
              <SpeedTestsTable categoryId={categoryId} testType="cooper_test" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beep">
          <Card>
            <CardHeader>
              <CardTitle>Test Navette (Beep Test)</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="beep_test" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yoyo">
          <Card>
            <CardHeader>
              <CardTitle>Yo-Yo Test</CardTitle>
            </CardHeader>
            <CardContent>
              <SpeedTestsTable categoryId={categoryId} testType="yo_yo_test" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {players && (
        <>
          <Add40mSprintDialog
            open={is40mDialogOpen}
            onOpenChange={setIs40mDialogOpen}
            categoryId={categoryId}
            players={players}
          />
          <Add1600mRunDialog
            open={is1600mDialogOpen}
            onOpenChange={setIs1600mDialogOpen}
            categoryId={categoryId}
            players={players}
          />
          <AddRunningTestDialog
            open={isRunningDialogOpen}
            onOpenChange={setIsRunningDialogOpen}
            categoryId={categoryId}
            players={players}
          />
        </>
      )}
    </div>
  );
}
