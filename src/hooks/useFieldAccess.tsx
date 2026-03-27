export const useFieldAccess = () => {
  const isFieldVisible = (_resource: string, _fieldKey: string): boolean => true;

  return {
    isFieldVisible,
    userRole: null,
    isLoading: false,
  };
};
