import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: onboardingStatus, isLoading } = useQuery({
    queryKey: ["user-onboarding", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const completeOnboarding = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_onboarding")
        .upsert({
          user_id: user.id,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
    },
  });

  const skipOnboarding = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const { error } = await supabase
        .from("user_onboarding")
        .upsert({
          user_id: user.id,
          skipped_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-onboarding"] });
    },
  });

  const needsOnboarding = !isLoading && !onboardingStatus?.completed_at && !onboardingStatus?.skipped_at;

  return {
    onboardingStatus,
    isLoading,
    needsOnboarding,
    completeOnboarding: completeOnboarding.mutate,
    skipOnboarding: skipOnboarding.mutate,
  };
}
