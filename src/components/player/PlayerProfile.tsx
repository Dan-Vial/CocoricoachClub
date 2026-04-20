import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, Users, Target, Timer, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlayerAvatarUpload } from "./PlayerAvatarUpload";
import { CustomAthleticProfileEditor } from "./CustomAthleticProfileEditor";
import { getAthleticProfileConfig, type AthleticProfileConfig, type AthleticProfileTest } from "@/lib/constants/athleticProfiles";

interface PlayerProfileProps {
  playerId: string;
  categoryId: string;
  playerName: string;
  avatarUrl?: string | null;
  sportType?: string;
  discipline?: string | null;
}

type ProfileType = "primary" | "balanced" | "secondary" | "insufficientData";

interface TestResult {
  value: number;
  date: string;
}

interface CustomProfileType {
  key: string;
  label: string;
  description: string;
  recommendations: string[];
  thresholdMin?: number;
  thresholdMax?: number;
}

export function PlayerProfile({ playerId, categoryId, playerName, avatarUrl, sportType = "XV", discipline }: PlayerProfileProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const defaultConfig = getAthleticProfileConfig(sportType, discipline);

  // Fetch custom profile for this category
  const { data: customProfile } = useQuery({
    queryKey: ["custom_athletic_profile", categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_athletic_profiles")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Determine which config to use
  const isCustom = !!customProfile;
  const customTests = customProfile?.tests as unknown as AthleticProfileTest[] | undefined;
  const customProfileTypes = customProfile?.profile_types as unknown as { profiles?: CustomProfileType[] } | undefined;

  const activeTests: AthleticProfileTest[] = isCustom && customTests && customTests.length >= 2
    ? customTests
    : defaultConfig.tests;

  const profileLabel = isCustom ? (customProfile?.name || "Profil personnalisé") : defaultConfig.label;
  const profileDescription = isCustom ? (customProfile?.description || "") : defaultConfig.profileDescription;

  // Fetch test data
  const { data: testData } = useQuery({
    queryKey: ["player_athletic_profile", playerId, categoryId, sportType, discipline, isCustom],
    queryFn: async () => {
      const results: Record<string, TestResult | null> = {};
      
      for (const test of activeTests) {
        let data: { value: number; date: string } | null = null;
        
        if (test.tableSource === "speed_tests") {
          const { data: speedData } = await supabase
            .from("speed_tests")
            .select("*")
            .eq("player_id", playerId)
            .eq("test_type", test.testType)
            .order("test_date", { ascending: false })
            .limit(1);
          
          if (speedData && speedData.length > 0) {
            const testResult = speedData[0];
            const value = testResult.vma_kmh || testResult.speed_kmh || testResult.time_40m_seconds || 0;
            data = { value, date: testResult.test_date };
          }
        } else if (test.tableSource === "jump_tests") {
          const { data: jumpData } = await supabase
            .from("jump_tests")
            .select("*")
            .eq("player_id", playerId)
            .eq("test_type", test.testType)
            .order("test_date", { ascending: false })
            .limit(1);
          
          if (jumpData && jumpData.length > 0) {
            data = { value: jumpData[0].result_cm, date: jumpData[0].test_date };
          }
        } else if (test.tableSource === "generic_tests") {
          const { data: genericData } = await supabase
            .from("generic_tests")
            .select("*")
            .eq("player_id", playerId)
            .eq("test_type", test.testType)
            .order("test_date", { ascending: false })
            .limit(1);
          
          if (genericData && genericData.length > 0) {
            data = { value: genericData[0].result_value, date: genericData[0].test_date };
          }
        }
        
        results[test.key] = data;
      }
      
      return results;
    },
  });

  // Calculate profile
  const getPlayerProfile = () => {
    const testResults = activeTests.map(t => testData?.[t.key] || null);
    const hasAllData = testResults.every(r => r !== null);

    if (!hasAllData) {
      return { type: "insufficientData" as ProfileType, testResults, ratio: null, matchedProfile: null };
    }

    // Calculate ratio based on first two tests
    const val1 = testResults[0]!.value;
    const val2 = testResults[1]!.value;
    const t1 = activeTests[0];
    const t2 = activeTests[1];

    let ratio: number;
    if (t1.higherIsBetter === t2.higherIsBetter) {
      ratio = (val1 / (val1 + val2)) * 100;
    } else {
      ratio = t1.higherIsBetter
        ? (val1 / (val1 + (1 / val2))) * 100
        : ((1 / val1) / ((1 / val1) + val2)) * 100;
    }

    // Match profile based on thresholds (custom) or default ranges
    if (isCustom && customProfileTypes?.profiles) {
      const matched = customProfileTypes.profiles.find(p => {
        const min = p.thresholdMin ?? -Infinity;
        const max = p.thresholdMax ?? Infinity;
        return ratio >= min && ratio <= max;
      });
      return { type: "primary" as ProfileType, testResults, ratio, matchedProfile: matched || customProfileTypes.profiles[0] };
    }

    // Default classification
    let type: ProfileType;
    if (ratio > 55) type = "primary";
    else if (ratio >= 45) type = "balanced";
    else type = "secondary";

    return { type, testResults, ratio, matchedProfile: null };
  };

  const profile = getPlayerProfile();

  // Get display info
  const getDisplayProfile = () => {
    if (isCustom && profile.matchedProfile) {
      return {
        label: profile.matchedProfile.label,
        description: profile.matchedProfile.description,
        recommendations: profile.matchedProfile.recommendations.filter(Boolean),
      };
    }
    if (!isCustom) {
      const defaultType = defaultConfig.profileTypes[profile.type];
      return {
        label: defaultType.label,
        description: defaultType.description,
        recommendations: defaultType.recommendations,
      };
    }
    return {
      label: "Données insuffisantes",
      description: "Tests requis pour déterminer le profil",
      recommendations: activeTests.map(t => `Effectuer: ${t.label}`),
    };
  };

  const displayProfile = getDisplayProfile();

  const getProfileIcon = () => {
    switch (profile.type) {
      case "primary": return Timer;
      case "balanced": return Users;
      case "secondary": return Zap;
      default: return Activity;
    }
  };

  const getProfileColor = () => {
    switch (profile.type) {
      case "primary": return "bg-primary text-primary-foreground";
      case "balanced": return "bg-accent text-accent-foreground";
      case "secondary": return "bg-secondary text-secondary-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const Icon = getProfileIcon();

  return (
    <>
      <Card className="bg-gradient-card shadow-md">
        <CardHeader className="py-3 px-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" />
              Profil Athlétique - {profileLabel}
            </div>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setEditorOpen(true)} title="Personnaliser le profil">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {profileDescription}
            {isCustom && <Badge variant="outline" className="ml-2 text-[10px]">Personnalisé</Badge>}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-3 pt-0">
          <PlayerAvatarUpload
            playerId={playerId}
            playerName={playerName}
            currentAvatarUrl={avatarUrl}
          />
          
          <div className="flex items-center justify-between">
            <Badge className={`${getProfileColor()} text-sm py-1 px-3`}>
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {displayProfile.label}
            </Badge>
            {profile.ratio !== null && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Équilibre</p>
                <p className="text-xl font-bold">{profile.ratio.toFixed(0)}%</p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">{displayProfile.description}</p>
          
          {profile.testResults && profile.testResults.some(r => r !== null) && (
            <div className={`grid grid-cols-${Math.min(activeTests.length, 3)} gap-2 p-2 bg-muted/50 rounded-lg`}>
              {activeTests.map((test, i) => {
                const result = profile.testResults[i];
                if (!result) return null;
                return (
                  <div key={test.key}>
                    <p className="text-xs text-muted-foreground">{test.shortLabel}</p>
                    <p className="text-base font-bold text-primary">
                      {result.value.toFixed(1)} {test.unit}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {displayProfile.recommendations.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-semibold text-xs">Recommandations:</h4>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                {displayProfile.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {profile.type === "insufficientData" && (
            <div className="p-2 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Tests requis:
              </p>
              <ul className="list-disc list-inside text-xs text-muted-foreground mt-1">
                {activeTests.map((test, i) => (
                  <li key={i}>{test.label}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomAthleticProfileEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        categoryId={categoryId}
      />
    </>
  );
}
