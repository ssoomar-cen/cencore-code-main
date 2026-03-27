import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";
import { useEffectiveUser } from "./useEffectiveUser";

export interface Contact {
  contact_id: string;
  contact_number: string | null;
  tenant_id: string;
  account_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // New fields
  contact_type: string | null;
  goes_by: string | null;
  association: string | null;
  asst_email: string | null;
  commission_split_total: number | null;
  mc_commission: string | null;
  sales_role: string | null;
  personal_email: string | null;
  additional_email: string | null;
  mobile: string | null;
  fax: string | null;
  recruiter_commission: string | null;
  internal_search_owner: string | null;
  recruited_by_user_id: string | null;
  agreement_notes: string | null;
  actual_from_goals: number | null;
  quota_over_goals: number | null;
  amount_over_quota: number | null;
  dallas_visit_date: string | null;
  commission_notes: string | null;
  key_reference: boolean | null;
  key_reference_date: string | null;
  reference_notes: string | null;
  description: string | null;
  employee_id: string | null;
  mailing_address: string | null;
  home_address: string | null;
  account?: {
    name: string;
  };
  recruited_by?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  };
}

interface ContactsQueryOptions {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  isPrimary?: "all" | "primary" | "not-primary";
  isActive?: "all" | "active" | "inactive";
}

export const useContacts = (options?: ContactsQueryOptions) => {
  const queryClient = useQueryClient();
  const { tenantId } = useEffectiveUser();
  const enabled = options?.enabled ?? true;
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const search = (options?.search || "").trim();
  const isPrimary = options?.isPrimary ?? "all";
  const isActive = options?.isActive ?? "all";

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('contacts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contact' },
        (payload) => {
          console.log('Contact changed:', payload);
          queryClient.invalidateQueries({ queryKey: ["contacts"] });
        }
      )
      .subscribe((status) => {
        console.log('Contacts realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["contacts", tenantId, page, pageSize, search, isPrimary, isActive],
    queryFn: async () => {
      if (!tenantId) {
        return { rows: [] as Contact[], total: 0 };
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("contact")
        .select("*, account:account_id(name), recruited_by:recruited_by_user_id(id, first_name, last_name)", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(
          `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,contact_number.ilike.%${search}%`
        );
      }
      if (isPrimary === "primary") {
        query = query.eq("is_primary", true);
      } else if (isPrimary === "not-primary") {
        query = query.eq("is_primary", false);
      }
      if (isActive === "active") {
        query = query.eq("is_active", true);
      } else if (isActive === "inactive") {
        query = query.eq("is_active", false);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return {
        rows: (data || []) as unknown as Contact[],
        total: count ?? 0,
      };
    },
    enabled: enabled && !!tenantId,
    staleTime: 5 * 60_000,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });

  const createContact = useMutation({
    mutationFn: async (newContact: Partial<Contact>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("contact")
        .insert({
          ...newContact,
          tenant_id: profile.tenant_id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      
      // Invalidate parent account detail query
      if (data.account_id) {
        queryClient.invalidateQueries({ queryKey: ["account-detail", data.account_id] });
      }
      
      toast.success("Contact created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create contact");
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ contact_id, ...updates }: Partial<Contact> & { contact_id: string }) => {
      // Remove contact_number from updates as it's auto-generated and readonly
      const { contact_number, ...updateData } = updates as any;
      
      const { error } = await supabase
        .from("contact")
        .update(updateData)
        .eq("contact_id", contact_id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contact-detail", variables.contact_id] });
      toast.success("Contact updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update contact");
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact").delete().eq("contact_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete contact");
    },
  });

  return {
    contacts: data?.rows ?? [],
    totalRows: data?.total ?? 0,
    isLoading,
    isFetching,
    createContact: createContact.mutate,
    updateContact: updateContact.mutate,
    deleteContact: deleteContact.mutate,
    isCreating: createContact.isPending,
    isUpdating: updateContact.isPending,
    isDeleting: deleteContact.isPending,
  };
};
