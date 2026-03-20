import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Image as ImageIcon, Video } from "lucide-react";

interface ExerciseMediaViewerProps {
  exerciseName: string;
  imageUrl?: string | null;
  youtubeUrl?: string | null;
  children: React.ReactNode;
}

export function ExerciseMediaViewer({
  exerciseName,
  imageUrl,
  youtubeUrl,
  children,
}: ExerciseMediaViewerProps) {
  const [open, setOpen] = useState(false);

  const hasMedia = !!imageUrl || !!youtubeUrl;

  const getYoutubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  if (!hasMedia) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        className="cursor-pointer hover:text-primary transition-colors inline-flex items-center gap-1"
        onClick={() => setOpen(true)}
        title="Voir la démonstration"
      >
        {children}
        {youtubeUrl && <Video className="h-3 w-3 text-primary opacity-70" />}
        {imageUrl && !youtubeUrl && <ImageIcon className="h-3 w-3 text-primary opacity-70" />}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {exerciseName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {imageUrl && (
              <div className="rounded-lg overflow-hidden border">
                <img src={imageUrl} alt={exerciseName} className="w-full max-h-80 object-contain bg-muted" />
              </div>
            )}
            {youtubeUrl && getYoutubeEmbedUrl(youtubeUrl) && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={getYoutubeEmbedUrl(youtubeUrl)!}
                  className="w-full h-full"
                  allowFullScreen
                  title={exerciseName}
                />
              </div>
            )}
            {youtubeUrl && (
              <a
                href={youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ouvrir dans un nouvel onglet
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
