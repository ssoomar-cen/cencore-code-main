export interface ProjectRate {
  project_rate_id: string;
  project_id: string;
  hourly_rate: number;
  valid_from: string;
  valid_to?: string | null;
}

export const useProjectRates = (_projectId?: string) => {
  return {
    projectRates: [] as ProjectRate[],
    isLoading: false,
    createProjectRate: async (_data: any) => {},
    updateProjectRate: async (_data: any) => {},
    getCurrentRate: () => null as ProjectRate | null,
    isPending: false,
  };
};
