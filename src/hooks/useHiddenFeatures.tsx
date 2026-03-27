import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUser } from "./useEffectiveUser";
import { toast } from "sonner";

interface HiddenFeature {
  id: string;
  tenant_id: string;
  feature_key: string;
  is_hidden: boolean;
  hidden_by: string;
  hidden_at: string;
  reason: string | null;
}

export const useHiddenFeatures = () => {
  const queryClient = useQueryClient();
  const { tenantId, userId } = useEffectiveUser();

  const { data: hiddenFeatures, isLoading } = useQuery({
    queryKey: ["hidden-features", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("tenant_hidden_features")
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Error fetching hidden features:", error);
        return [];
      }

      return data as HiddenFeature[];
    },
    enabled: !!tenantId,
  });

  const toggleHiddenFeature = useMutation({
    mutationFn: async ({ 
      featureKey, 
      isHidden, 
      reason 
    }: { 
      featureKey: string; 
      isHidden: boolean; 
      reason?: string;
    }) => {
      if (!tenantId || !userId) throw new Error("Not authenticated");

      if (isHidden) {
        const { error } = await supabase
          .from("tenant_hidden_features")
          .upsert(
            {
              tenant_id: tenantId,
              feature_key: featureKey,
              is_hidden: true,
              hidden_by: userId,
              reason: reason || null,
            },
            { onConflict: "tenant_id,feature_key" }
          );

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant_hidden_features")
          .delete()
          .eq("tenant_id", tenantId)
          .eq("feature_key", featureKey);

        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["hidden-features"] });
      toast.success(
        variables.isHidden 
          ? "Feature hidden for all users" 
          : "Feature is now visible"
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update feature visibility");
    },
  });

  const isFeatureHidden = (featureKey: string): boolean => {
    if (!hiddenFeatures) return false;
    const hidden = hiddenFeatures.find((hf) => hf.feature_key === featureKey);
    return hidden?.is_hidden ?? false;
  };

  return {
    hiddenFeatures: hiddenFeatures || [],
    isLoading,
    toggleHiddenFeature: toggleHiddenFeature.mutate,
    isToggling: toggleHiddenFeature.isPending,
    isFeatureHidden,
  };
};
