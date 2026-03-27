export type ProjectTeamRole = 'RVP' | 'TL' | 'MVL' | 'CM' | 'IC';

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  role?: string | null;
  profile?: { id: string; first_name: string | null; last_name: string | null } | null;
}

export const useProjectTeamMembers = (_projectId?: string) => {
  return {
    teamMembers: [] as ProjectTeamMember[],
    isLoading: false,
    addTeamMember: async (_data: any) => {},
    removeTeamMember: async (_id: string) => {},
    isPending: false,
  };
};
