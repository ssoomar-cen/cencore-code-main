import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Type definitions
export interface InvoiceItem {
  id: string;
  invoiceId: string;
  tenantId: string;
  projectId?: string;
  energyProgramId?: string;
  name?: string;
  invoiceItemType?: string;
  periodDate?: string;
  feeAmount?: number;
  credit?: number;
  currentCostAvoidance?: number;
  previousCostAvoidance?: number;
  specialSavings?: number;
  previousSpecialSavings?: number;
  currentLessPrevious?: number;
  savings?: number;
  salesforceId?: string;
  salesforceInvoiceId?: string;
  salesforceProjectId?: string;
  salesforceEnergyProgramId?: string;
  d365InvoiceItemGuid?: string;
  salesforceRaw?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecon {
  id: string;
  invoiceItemId: string;
  invoiceId?: string;
  tenantId: string;
  orgName?: string;
  placeInfo?: string;
  logicalDeviceCode?: string;
  reportDate?: string;
  beginDate?: string;
  category?: string;
  currentBatcc?: number;
  previousBatcc?: number;
  currentActualCost?: number;
  previousActualCost?: number;
  currentCa?: number;
  previousCa?: number;
  energyProgramId?: string;
  salesDocName?: string;
  placeId?: string;
  invoiceItemName?: string;
  salesforceId?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';

const api = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || response.statusText);
  }

  return response.json();
};

// Hook to fetch invoice items for a specific invoice
export const useInvoiceItems = (invoiceId: string | null) => {
  return useQuery({
    queryKey: ["invoiceItems", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      return api(`/api/invoices/${invoiceId}/items`);
    },
    enabled: !!invoiceId,
  });
};

// Hook to fetch a specific invoice item
export const useInvoiceItem = (invoiceId: string | null, itemId: string | null) => {
  return useQuery({
    queryKey: ["invoiceItem", invoiceId, itemId],
    queryFn: async () => {
      if (!invoiceId || !itemId) return null;
      return api(`/api/invoices/${invoiceId}/items/${itemId}`);
    },
    enabled: !!invoiceId && !!itemId,
  });
};

// Hook to fetch invoice reconciliations for a specific invoice item
export const useInvoiceReconciliations = (invoiceId: string | null, itemId: string | null) => {
  return useQuery({
    queryKey: ["invoiceReconciliations", invoiceId, itemId],
    queryFn: async () => {
      if (!invoiceId || !itemId) return [];
      return api(`/api/invoices/${invoiceId}/items/${itemId}/reconciliations`);
    },
    enabled: !!invoiceId && !!itemId,
  });
};

// Hook to fetch a specific reconciliation record
export const useInvoiceRecon = (invoiceId: string | null, itemId: string | null, reconId: string | null) => {
  return useQuery({
    queryKey: ["invoiceRecon", invoiceId, itemId, reconId],
    queryFn: async () => {
      if (!invoiceId || !itemId || !reconId) return null;
      return api(`/api/invoices/${invoiceId}/items/${itemId}/reconciliations/${reconId}`);
    },
    enabled: !!invoiceId && !!itemId && !!reconId,
  });
};
