import { MessagingTab } from "@/components/messaging/MessagingTab";

interface CommunicationTabProps {
  categoryId: string;
  isAcademy?: boolean;
}

export function CommunicationTab({ categoryId }: CommunicationTabProps) {
  return <MessagingTab categoryId={categoryId} />;
}
