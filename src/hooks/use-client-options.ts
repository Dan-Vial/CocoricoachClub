import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ClientOptions {
  video_enabled: boolean;
  gps_data_enabled: boolean;
}

export function useClientOptions(clubId: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ["client-options", clubId],
    queryFn: async () => {
      if (!clubId) return null;

      // Get the club to find its client_id
      const { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("client_id")
        .eq("id", clubId)
        .single();

      if (clubError || !club?.client_id) {
        // If no client is linked, enable all options by default
        return { video_enabled: true, gps_data_enabled: true };
      }

      // Get client options
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("video_enabled, gps_data_enabled")
        .eq("id", club.client_id)
        .single();

      if (clientError || !client) {
        return { video_enabled: true, gps_data_enabled: true };
      }

      return {
        video_enabled: client.video_enabled ?? false,
        gps_data_enabled: client.gps_data_enabled ?? false,
      };
    },
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    options: data as ClientOptions | null,
    isLoading,
    videoEnabled: data?.video_enabled ?? false,
    gpsEnabled: data?.gps_data_enabled ?? false,
  };
}
