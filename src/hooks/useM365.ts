import { useState } from "react";
import { toast } from "sonner";
import { useTenant } from "@/hooks/useTenant";
import { callM365Api } from "@/lib/m365Api";

type M365Action =
  | "list_emails" | "send_email"
  | "list_events" | "create_event"
  | "list_sites" | "list_drives" | "list_drive_items"
  | "list_my_files" | "list_users"
  | "list_teams" | "list_channels" | "send_channel_message"
  | "list_channel_messages" | "list_chats" | "send_chat_message"
  | "list_contacts" | "create_contact";

export function useM365() {
  const [loading, setLoading] = useState(false);
  const { activeTenantId } = useTenant();

  const callM365 = async (action: M365Action, params: Record<string, any> = {}) => {
    if (!activeTenantId) {
      toast.error("No active tenant selected");
      throw new Error("No active tenant");
    }
    setLoading(true);
    try {
      return await callM365Api(action, params, activeTenantId);
    } catch (err: any) {
      toast.error(err.message || "Microsoft 365 request failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { callM365, loading };
}
