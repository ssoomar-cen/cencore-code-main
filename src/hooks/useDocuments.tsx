import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number | null;
  category: string | null;
  description: string | null;
  storage_path: string;
  owner_user_id: string;
  related_to_type: string | null;
  related_to_id: string | null;
  version: number | null;
  is_current_version: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  tenant_id: string;
}

export const useDocuments = (category?: string) => {
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", category],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      let query = supabase
        .from("documents")
        .select("*")
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false });

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as unknown as Document[];
    },
  });

  const { data: isSharePointConnected } = useQuery({
    queryKey: ["sharepoint-integration"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integrations")
        .select("*")
        .eq("provider", "sharepoint")
        .eq("status", "active")
        .maybeSingle();

      return !!data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted successfully");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Failed to delete document");
    },
  });

  return {
    documents: documents || [],
    isLoading,
    isSharePointConnected: isSharePointConnected || false,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
};
