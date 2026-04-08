import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSavedView,
  deleteSavedView,
  exportView,
  getEntityMetadata,
  listSavedViews,
  queryView,
  starSavedView,
  updateSavedView,
} from "../api/viewBuilderApi";
import { QueryRequest } from "../types/viewBuilder";

export function useViewMetadata(entity: string) {
  return useQuery({
    queryKey: ["view-metadata", entity],
    queryFn: () => getEntityMetadata(entity),
    enabled: !!entity,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useViewQuery(payload: QueryRequest, enabled: boolean) {
  return useQuery({
    queryKey: ["view-query", payload],
    queryFn: () => queryView(payload),
    enabled,
    staleTime: 60_000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

export function useSavedViews(entity: string) {
  return useQuery({
    queryKey: ["saved-views", entity],
    queryFn: () => listSavedViews(entity),
    enabled: !!entity,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSaveView() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createSavedView,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", variables.baseEntity] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: Parameters<typeof updateSavedView>[1] & { id: string }) =>
      updateSavedView(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["saved-views", (variables as any).baseEntity] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSavedView,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
    },
  });

  const starMutation = useMutation({
    mutationFn: starSavedView,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-views"] });
    },
  });

  return {
    createView: createMutation.mutateAsync,
    updateView: updateMutation.mutateAsync,
    deleteView: deleteMutation.mutateAsync,
    starView: starMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}

export function useExportView() {
  return useMutation({
    mutationFn: ({ type, payload }: { type: "csv" | "xlsx"; payload: QueryRequest }) =>
      exportView(type, payload),
  });
}
