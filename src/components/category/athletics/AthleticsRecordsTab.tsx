import { AthleticsMinimasManager } from "./AthleticsMinimasManager";
import { AthleticsRecordsManager } from "./AthleticsRecordsManager";

interface Props {
  categoryId: string;
}

/**
 * Sub-tab "Minimas / Records" dans Compétition pour l'athlétisme.
 * Combine la gestion des minimas fédéraux et des records personnels par athlète.
 */
export function AthleticsRecordsTab({ categoryId }: Props) {
  return (
    <div className="space-y-4">
      <AthleticsMinimasManager categoryId={categoryId} />
      <AthleticsRecordsManager categoryId={categoryId} />
    </div>
  );
}
