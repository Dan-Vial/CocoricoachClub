import { AthleticsMinimasManager } from "./AthleticsMinimasManager";
import { AthleticsMinimasMatrix } from "./AthleticsMinimasMatrix";
import { AthleticsRecordsManager } from "./AthleticsRecordsManager";

interface Props {
  categoryId: string;
}

/**
 * Sub-tab "Minimas / Records" dans Compétition pour l'athlétisme.
 * - Matrice croisée Athlètes × Minimas (delta auto depuis les compétitions)
 * - Gestion des minimas fédéraux (par catégorie)
 * - Gestion des records personnels (par athlète)
 */
export function AthleticsRecordsTab({ categoryId }: Props) {
  return (
    <div className="space-y-4">
      <AthleticsMinimasMatrix categoryId={categoryId} />
      <AthleticsMinimasManager categoryId={categoryId} />
      <AthleticsRecordsManager categoryId={categoryId} />
    </div>
  );
}
