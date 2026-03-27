export const useProjectsStats = () => {
  return {
    stats: {
      totalProjects: 0,
      totalHours: 0,
      billableHours: 0,
      billableAmount: 0,
      budgetHours: 0,
      budgetAmount: 0,
      totalExpense: 0,
      totalRevenue: 0,
      utilizationRate: 0,
    },
    isLoading: false,
  };
};
