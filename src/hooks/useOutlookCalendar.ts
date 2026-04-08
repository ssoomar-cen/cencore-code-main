import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "sonner";
import { callM365Api } from "@/lib/m365Api";

export type OutlookEvent = {
  id: string;
  subject: string;
  bodyPreview: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: { displayName: string };
  isAllDay?: boolean;
  organizer?: { emailAddress: { name: string; address: string } };
  webLink?: string;
};

type SyncDirection = "one-way" | "two-way";

export function useOutlookCalendar() {
  const { activeTenantId } = useTenant();
  const queryClient = useQueryClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [syncDirection, setSyncDirection] = useState<SyncDirection>(
    () => (localStorage.getItem("calendarSyncDirection") as SyncDirection) || "one-way"
  );

  const updateSyncDirection = (dir: SyncDirection) => {
    setSyncDirection(dir);
    localStorage.setItem("calendarSyncDirection", dir);
  };

  // Get current user's email for Graph API calls
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || null);
    });
  }, []);

  // Check if M365 is configured for this tenant
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

  // Fetch Outlook events
  const {
    data: outlookEvents,
    isLoading: loadingEvents,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ["outlook-events", activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      const data = await callM365Api("list_events", { userId: userEmail, top: 100 }, activeTenantId) as any;
      return (data?.value || []) as OutlookEvent[];
    },
    enabled: !!activeTenantId && isM365Configured && !!userEmail,
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  // Push CRM event to Outlook
  const pushToOutlook = useMutation({
    mutationFn: async (event: {
      subject: string;
      body?: string;
      startDateTime: string;
      endDateTime: string;
      timeZone?: string;
      attendees?: string[];
      userId: string;
    }) => {
      if (!activeTenantId) throw new Error("No active tenant");
      return await callM365Api("create_event", {
        userId: event.userId,
        subject: event.subject,
        body: event.body || "",
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        timeZone: event.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        attendees: event.attendees || [],
      }, activeTenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-events"] });
      toast.success("Event synced to Outlook");
    },
    onError: (err: Error) => {
      toast.error("Failed to sync to Outlook: " + err.message);
    },
  });

  return {
    outlookEvents: outlookEvents || [],
    loadingEvents,
    refetchEvents,
    pushToOutlook,
    isM365Configured,
    syncDirection,
    setSyncDirection: updateSyncDirection,
  };
}
