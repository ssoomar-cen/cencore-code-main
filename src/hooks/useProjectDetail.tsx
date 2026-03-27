import { useQuery } from "@tanstack/react-query";

export const useProjectDetail = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ["project-detail", projectId],
    queryFn: async () => null,
    enabled: false,
  });
};
