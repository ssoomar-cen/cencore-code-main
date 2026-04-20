import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useOpportunities() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const res = await fetch("/api/opportunities?limit=500");
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
  });

  const create = useMutation({
    mutationFn: async (opp: any) => {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opp),
      });
      if (!res.ok) throw new Error("Failed to create opportunity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities-list"] });
      toast.success("Opportunity created");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const res = await fetch(`/api/opportunities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update opportunity");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities-list"] });
      toast.success("Opportunity updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/opportunities/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete opportunity");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities-list"] });
      toast.success("Opportunity deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, create, update, remove };
}

export function useOpportunitiesList(params: { search: string; page: number; limit: number }) {
  const { search, page, limit } = params;
  return useQuery({
    queryKey: ["opportunities-list", search, page, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) qs.set("search", search);
      const res = await fetch(`/api/opportunities?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      const result = await res.json();
      return { data: (result.data || []) as any[], total: (result.total || 0) as number };
    },
    placeholderData: (prev) => prev,
  });
}
