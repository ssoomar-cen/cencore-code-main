import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { callM365Api } from "@/lib/m365Api";

export type OutlookContact = {
  id: string;
  givenName: string | null;
  surname: string | null;
  displayName: string | null;
  emailAddresses: { address: string; name?: string }[];
  businessPhones: string[];
  mobilePhone: string | null;
  jobTitle: string | null;
  companyName: string | null;
  department: string | null;
};

export function useOutlookContacts() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
    });
  }, []);

  // Check M365 config
  const { data: m365Config } = useQuery({
    queryKey: ["m365-config", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return null;
      const { data } = await (supabase as any)
        .from("tenant_m365_config_safe")
        .select("is_configured")
        .eq("tenant_id", activeTenantId)
        .single();
      return data;
    },
    enabled: !!activeTenantId,
  });

  const isM365Configured = !!m365Config?.is_configured;

  // Fetch Outlook contacts
  const {
    data: outlookContacts,
    isLoading: loadingContacts,
    refetch: refetchContacts,
  } = useQuery({
    queryKey: ["outlook-contacts", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId || !userEmail) return [];
      const data = await callM365Api("list_contacts", { userId: userEmail, top: 200 }, activeTenantId) as any;
      return (data?.value || []) as OutlookContact[];
    },
    enabled: !!activeTenantId && isM365Configured && !!userEmail,
    refetchInterval: 5 * 60 * 1000,
  });

  // Import Outlook contact → CRM
  const importContact = useMutation({
    mutationFn: async (contact: OutlookContact) => {
      const { data: { user } } = await supabase.auth.getUser();
      const primaryEmail = contact.emailAddresses?.[0]?.address || null;
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          first_name: contact.givenName || "Unknown",
          last_name: contact.surname || "Unknown",
          email: primaryEmail,
          phone: contact.businessPhones?.[0] || null,
          mobile: contact.mobilePhone || null,
          job_title: contact.jobTitle || null,
          department: contact.department || null,
          user_id: user?.id,
          tenant_id: activeTenantId,
          status: "active",
          notes: `Imported from Outlook. Company: ${contact.companyName || "N/A"}`,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contact imported from Outlook");
    },
    onError: (err: Error) => {
      toast.error("Import failed: " + err.message);
    },
  });

  // Push CRM contact → Outlook
  const pushToOutlook = useMutation({
    mutationFn: async (contact: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      mobile?: string;
      jobTitle?: string;
      company?: string;
      department?: string;
    }) => {
      if (!activeTenantId || !userEmail) throw new Error("No tenant or user");
      return await callM365Api("create_contact", {
        userId: userEmail,
        givenName: contact.firstName,
        surname: contact.lastName,
        emailAddresses: contact.email
          ? [{ address: contact.email, name: `${contact.firstName} ${contact.lastName}` }]
          : [],
        businessPhones: contact.phone ? [contact.phone] : [],
        mobilePhone: contact.mobile || null,
        jobTitle: contact.jobTitle || null,
        companyName: contact.company || null,
        department: contact.department || null,
      }, activeTenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-contacts"] });
      toast.success("Contact synced to Outlook");
    },
    onError: (err: Error) => {
      toast.error("Sync failed: " + err.message);
    },
  });

  return {
    outlookContacts: outlookContacts || [],
    loadingContacts,
    refetchContacts,
    importContact,
    pushToOutlook,
    isM365Configured,
  };
}
