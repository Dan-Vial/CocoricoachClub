import { useState } from "react";
import { TutorialVideosSection } from "@/components/category/settings/TutorialVideosSection";
import { PdfSettingsSection } from "@/components/category/settings/PdfSettingsSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Video, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsTabProps {
  categoryId: string;
}

export function SettingsTab({ categoryId }: SettingsTabProps) {
  const [pdfOpen, setPdfOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* PDF Settings Collapsible */}
      <Collapsible open={pdfOpen} onOpenChange={setPdfOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between w-full p-4 rounded-xl border bg-card shadow-sm transition-colors hover:bg-accent/50",
            pdfOpen && "rounded-b-none border-b-0"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Personnalisation des PDF</p>
                <p className="text-sm text-muted-foreground">Logo, couleurs et pied de page</p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              pdfOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border border-t-0 rounded-b-xl p-4 bg-card shadow-sm">
            <PdfSettingsSection categoryId={categoryId} />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Tutorial Videos Collapsible */}
      <Collapsible open={tutorialsOpen} onOpenChange={setTutorialsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between w-full p-4 rounded-xl border bg-card shadow-sm transition-colors hover:bg-accent/50",
            tutorialsOpen && "rounded-b-none border-b-0"
          )}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold">Vidéos & Tutoriels</p>
                <p className="text-sm text-muted-foreground">Guides et formations vidéo</p>
              </div>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-200",
              tutorialsOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border border-t-0 rounded-b-xl p-4 bg-card shadow-sm">
            <TutorialVideosSection />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
