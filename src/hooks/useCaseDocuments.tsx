import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/cenergistic-api/client";
import { Document } from "./useDocuments";

export const useCaseDocuments = (caseId: string | undefined) => {
  const { data: documents, isLoading } = useQuery({
    queryKey: ["case-documents", caseId],
    queryFn: async () => {
      if (!caseId) return [];

      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("related_to_type", "case")
        .eq("related_to_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data as unknown as Document[];
    },
    enabled: !!caseId,
  });

  return {
    documents: documents || [],
    isLoading,
  };
};
