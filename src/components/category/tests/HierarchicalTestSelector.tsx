import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTestCategoriesForSport, getGroupedTestCategories, TestCategory, TestOption } from "@/lib/constants/testCategories";
import { ChevronRight } from "lucide-react";

interface HierarchicalTestSelectorProps {
  sportType: string;
  selectedGroup: string; // group key or standalone category value
  selectedZone: string; // subcategory value (only for grouped)
  selectedTest: string; // test value
  onGroupChange: (group: string) => void;
  onZoneChange: (zone: string) => void;
  onTestChange: (test: string) => void;
  compact?: boolean;
}

export function HierarchicalTestSelector({
  sportType,
  selectedGroup,
  selectedZone,
  selectedTest,
  onGroupChange,
  onZoneChange,
  onTestChange,
  compact = false,
}: HierarchicalTestSelectorProps) {
  const filteredTestCategories = useMemo(
    () => getTestCategoriesForSport(sportType || ""),
    [sportType]
  );

  const { standalone, groups } = useMemo(
    () => getGroupedTestCategories(filteredTestCategories),
    [filteredTestCategories]
  );

  // Determine if selected group is a grouped category or standalone
  const isGrouped = groups.some((g) => g.key === selectedGroup);
  const selectedGroupObj = groups.find((g) => g.key === selectedGroup);
  const standaloneCategory = standalone.find((c) => c.value === selectedGroup);

  // Get zones (subcategories) for the selected group
  const zones = selectedGroupObj?.categories || [];

  // Get tests for the selected zone or standalone category
  const currentCategory = isGrouped
    ? zones.find((z) => z.value === selectedZone)
    : standaloneCategory;

  const tests = currentCategory?.tests || [];

  const handleGroupChange = (value: string) => {
    onGroupChange(value);
    onZoneChange("");
    onTestChange("");
  };

  const handleZoneChange = (value: string) => {
    onZoneChange(value);
    onTestChange("");
  };

  const labelSize = compact ? "text-xs" : "text-sm";
  const triggerSize = compact ? "h-9" : "";

  return (
    <div className="space-y-3">
      {/* Breadcrumb display */}
      {(selectedGroup || selectedZone || selectedTest) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {selectedGroup && (
            <span className="font-medium text-foreground">
              {isGrouped ? selectedGroupObj?.label : standaloneCategory?.label}
            </span>
          )}
          {selectedZone && isGrouped && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-foreground">
                {zones.find((z) => z.value === selectedZone)?.label}
              </span>
            </>
          )}
          {selectedTest && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="font-medium text-primary">
                {tests.find((t) => t.value === selectedTest)?.label}
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Level 1: Group / Category */}
        <div className="space-y-1.5">
          <Label className={labelSize}>Catégorie de test</Label>
          <Select value={selectedGroup} onValueChange={handleGroupChange}>
            <SelectTrigger className={triggerSize}>
              <SelectValue placeholder="Sélectionner..." />
            </SelectTrigger>
            <SelectContent className="z-[9999] max-h-[300px]">
              {/* Standalone categories */}
              <SelectGroup>
                <SelectLabel>Catégories générales</SelectLabel>
                {standalone.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              {/* Grouped categories */}
              {groups.map((group) => (
                <SelectGroup key={group.key}>
                  <SelectLabel>{group.label}</SelectLabel>
                  <SelectItem value={group.key}>
                    📁 {group.label} ({group.categories.length} zones)
                  </SelectItem>
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Level 2: Zone (only for grouped categories) */}
        {isGrouped && (
          <div className="space-y-1.5">
            <Label className={labelSize}>Zone / Type</Label>
            <Select value={selectedZone} onValueChange={handleZoneChange}>
              <SelectTrigger className={triggerSize}>
                <SelectValue placeholder="Sélectionner la zone..." />
              </SelectTrigger>
              <SelectContent className="z-[9999] max-h-[300px]">
                {zones.map((zone) => (
                  <SelectItem key={zone.value} value={zone.value}>
                    {zone.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Level 3: Specific test */}
        {((isGrouped && selectedZone) || (!isGrouped && selectedGroup)) && (
          <div className="space-y-1.5">
            <Label className={labelSize}>Test</Label>
            <Select value={selectedTest} onValueChange={onTestChange}>
              <SelectTrigger className={triggerSize}>
                <SelectValue placeholder="Sélectionner le test..." />
              </SelectTrigger>
              <SelectContent className="z-[9999] max-h-[300px]">
                {tests.map((test) => (
                  <SelectItem key={test.value} value={test.value}>
                    {test.label} {test.unit && `(${test.unit})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper to resolve a group+zone selection back to a flat test_category value
 * (needed for saving to DB which uses the flat category value)
 */
export function resolveTestCategory(
  selectedGroup: string,
  selectedZone: string,
  sportType: string
): string {
  const categories = getTestCategoriesForSport(sportType);
  const { groups } = getGroupedTestCategories(categories);
  const isGrouped = groups.some((g) => g.key === selectedGroup);
  return isGrouped ? selectedZone : selectedGroup;
}

/**
 * Helper to resolve a flat test_category value back to group+zone
 */
export function resolveGroupAndZone(
  testCategory: string,
  sportType: string
): { group: string; zone: string } {
  const categories = getTestCategoriesForSport(sportType);
  const cat = categories.find((c) => c.value === testCategory);
  if (!cat) return { group: "", zone: "" };
  if (cat.group) {
    return { group: cat.group, zone: cat.value };
  }
  return { group: cat.value, zone: "" };
}
