import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  description?: string;
  url: string;
  created_at?: string;
}

export const useGlobalSearch = (query: string, selectedType: string) => {
  const queryClient = useQueryClient();

  const { data: results, isLoading } = useQuery({
    queryKey: ["global-search", query, selectedType],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const searchTerm = `%${query.toLowerCase()}%`;
      const results: SearchResult[] = [];

      // Search Accounts
      if (selectedType === "all" || selectedType === "accounts") {
        const { data: accounts } = await supabase
          .from("account")
          .select("account_id, name, industry, phone, website")
          .eq("tenant_id", profile.tenant_id)
          .or(`name.ilike.${searchTerm},industry.ilike.${searchTerm}`)
          .limit(10);

        if (accounts) {
          results.push(
            ...accounts.map((acc) => ({
              id: acc.account_id,
              type: "Account",
              title: acc.name,
              subtitle: acc.industry || undefined,
              description: acc.phone || acc.website || undefined,
              url: `/crm/accounts`,
            }))
          );
        }
      }

      // Search Contacts
      if (selectedType === "all" || selectedType === "contacts") {
        const { data: contacts } = await supabase
          .from("contact")
          .select("contact_id, first_name, last_name, email, phone, title")
          .eq("tenant_id", profile.tenant_id)
          .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm}`)
          .limit(10);

        if (contacts) {
          results.push(
            ...contacts.map((contact) => ({
              id: contact.contact_id,
              type: "Contact",
              title: `${contact.first_name || ""} ${contact.last_name || ""}`.trim(),
              subtitle: contact.title || undefined,
              description: contact.email || contact.phone || undefined,
              url: `/crm/contacts`,
            }))
          );
        }
      }

      // Search Opportunities
      if (selectedType === "all" || selectedType === "opportunities") {
        const { data: opportunities } = await supabase
          .from("opportunity")
          .select("opportunity_id, name, stage, amount, description")
          .eq("tenant_id", profile.tenant_id)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10);

        if (opportunities) {
          results.push(
            ...opportunities.map((opp) => ({
              id: opp.opportunity_id,
              type: "Opportunity",
              title: opp.name,
              subtitle: opp.stage || undefined,
              description: opp.amount ? `$${opp.amount.toLocaleString()}` : undefined,
              url: `/crm/opportunities`,
            }))
          );
        }
      }

      // Projects feature removed

      // Search Contracts
      if (selectedType === "all" || selectedType === "contracts") {
        const { data: contracts } = await supabase
          .from("contract")
          .select("contract_id, contract_number, status, value")
          .eq("tenant_id", profile.tenant_id)
          .ilike("contract_number", searchTerm)
          .limit(10);

        if (contracts) {
          results.push(
            ...contracts.map((contract) => ({
              id: contract.contract_id,
              type: "Contract",
              title: contract.contract_number,
              subtitle: contract.status || undefined,
              description: contract.value ? `$${contract.value.toLocaleString()}` : undefined,
              url: `/crm/contracts`,
            }))
          );
        }
      }

      // Search Activities
      if (selectedType === "all" || selectedType === "activities") {
        const { data: activities } = await supabase
          .from("activity")
          .select("activity_id, subject, type, status, description")
          .eq("tenant_id", profile.tenant_id)
          .or(`subject.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10);

        if (activities) {
          results.push(
            ...activities.map((activity) => ({
              id: activity.activity_id,
              type: "Activity",
              title: activity.subject || "Untitled Activity",
              subtitle: activity.type || undefined,
              description: activity.status || undefined,
              url: `/crm/activities`,
            }))
          );
        }
      }

      // Search Documents
      if (selectedType === "all" || selectedType === "documents") {
        const { data: documents } = await supabase
          .from("documents")
          .select("id, name, category, description")
          .eq("tenant_id", profile.tenant_id)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .limit(10);

        if (documents) {
          results.push(
            ...documents.map((doc) => ({
              id: doc.id,
              type: "Document",
              title: doc.name,
              subtitle: doc.category || undefined,
              description: doc.description || undefined,
              url: `/crm/documents`,
            }))
          );
        }
      }

      return results;
    },
    enabled: query.length >= 2,
  });

  // Get search history
  const { data: searchHistory } = useQuery({
    queryKey: ["search-history"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("search_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      return data || [];
    },
  });

  // Get saved searches
  const { data: savedSearches } = useQuery({
    queryKey: ["saved-searches"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      return data || [];
    },
  });

  // Save search to history
  const saveToHistory = useMutation({
    mutationFn: async (searchQuery: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("search_history")
        .insert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          search_query: searchQuery,
          result_count: results?.length || 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
    },
  });

  // Save search
  const saveSearch = useMutation({
    mutationFn: async ({ name, searchQuery }: { name: string; searchQuery: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase
        .from("saved_searches")
        .insert({
          user_id: user.id,
          tenant_id: profile.tenant_id,
          name,
          search_query: searchQuery,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      toast.success("Search saved successfully");
    },
    onError: () => {
      toast.error("Failed to save search");
    },
  });

  return {
    results: results || [],
    isLoading,
    searchHistory: searchHistory || [],
    savedSearches: savedSearches || [],
    saveToHistory: saveToHistory.mutate,
    saveSearch: saveSearch.mutate,
  };
};
