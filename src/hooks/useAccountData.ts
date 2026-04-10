import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

// ============================================================================
// ACCOUNT HOOKS
// ============================================================================

export function useAccounts(search?: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["accounts", search, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const response = await fetch(`${API_BASE_URL}/accounts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch accounts");
      return response.json();
    },
  });
}

export function useAccount(accountId: string) {
  return useSuspenseQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/accounts/${accountId}`);
      if (!response.ok) throw new Error("Failed to fetch account");
      return response.json();
    },
    enabled: !!accountId,
  });
}

export function useAccountWithData(accountId: string) {
  return useQuery({
    queryKey: ["account", accountId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/accounts/${accountId}`);
      if (!response.ok) throw new Error("Failed to fetch account");
      return response.json();
    },
    enabled: !!accountId,
  });
}

// ============================================================================
// CONTRACT HOOKS
// ============================================================================

export function useAccountContracts(accountId: string, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ["accounts", accountId, "contracts", limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const response = await fetch(
        `${API_BASE_URL}/accounts/${accountId}/contracts?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch contracts");
      return response.json();
    },
    enabled: !!accountId,
  });
}

export function useContract(contractId: string) {
  return useQuery({
    queryKey: ["contracts", contractId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/accounts/contracts/${contractId}`
      );
      if (!response.ok) throw new Error("Failed to fetch contract");
      return response.json();
    },
    enabled: !!contractId,
  });
}

export function useContractInvoices(
  contractId: string,
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ["contracts", contractId, "invoices", limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const response = await fetch(
        `${API_BASE_URL}/accounts/contracts/${contractId}/invoices?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
    enabled: !!contractId,
  });
}

// ============================================================================
// ENERGY PROGRAM HOOKS
// ============================================================================

export function useAccountEnergyPrograms(
  accountId: string,
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ["accounts", accountId, "energy-programs", limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const response = await fetch(
        `${API_BASE_URL}/accounts/${accountId}/energy-programs?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch energy programs");
      return response.json();
    },
    enabled: !!accountId,
  });
}

export function useEnergyProgram(programId: string) {
  return useQuery({
    queryKey: ["energy-programs", programId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/accounts/programs/${programId}`
      );
      if (!response.ok) throw new Error("Failed to fetch energy program");
      return response.json();
    },
    enabled: !!programId,
  });
}

export function useEnergyProgramInvoices(
  programId: string,
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ["energy-programs", programId, "invoices", limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const response = await fetch(
        `${API_BASE_URL}/accounts/programs/${programId}/invoices?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
    enabled: !!programId,
  });
}

// ============================================================================
// ACCOUNT INVOICES HOOKS
// ============================================================================

export function useAccountInvoices(
  accountId: string,
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ["accounts", accountId, "invoices", limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", String(limit));
      params.append("offset", String(offset));

      const response = await fetch(
        `${API_BASE_URL}/accounts/${accountId}/invoices?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json();
    },
    enabled: !!accountId,
  });
}
