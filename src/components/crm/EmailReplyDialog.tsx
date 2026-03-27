import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActivities } from "@/hooks/useActivities";

interface EmailReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: any;
  replyType: "reply" | "replyAll" | "forward";
}

export function EmailReplyDialog({
  open,
  onOpenChange,
  activity,
  replyType,
}: EmailReplyDialogProps) {
  const { createActivity } = useActivities();
  
  // Determine recipient based on reply type - for reply/replyAll, use the original sender's email
  const getInitialTo = () => {
    if (replyType === "forward") return "";
    
    // For replies, the "To" should be the original sender's email
    // Priority: from_email (the actual sender) > contact email > case contact email > lead email
    if (activity.from_email) return activity.from_email;
    if (activity.contact?.email) return activity.contact.email;
    if (activity.case?.contact?.email) return activity.case.contact.email;
    if (activity.lead?.email) return activity.lead.email;
    
    return "";
  };

  const getInitialCc = () => {
    if (replyType === "replyAll" && activity.cc_email) {
      return activity.cc_email;
    }
    return "";
  };

  const getSubjectPrefix = () => {
    if (replyType === "forward") return "Fwd: ";
    return "Re: ";
  };

  const getInitialSubject = () => {
    const subject = activity.subject || "";
    const prefix = getSubjectPrefix();
    
    // Don't add prefix if it already exists
    if (subject.toLowerCase().startsWith(prefix.toLowerCase().trim())) {
      return subject;
    }
    return `${prefix}${subject}`;
  };

  const getInitialBody = () => {
    const originalBody = activity.description || "";
    const senderInfo = activity.contact 
      ? `${activity.contact.first_name || ""} ${activity.contact.last_name || ""}`.trim()
      : "Unknown Sender";
    const sentDate = activity.start_datetime 
      ? new Date(activity.start_datetime).toLocaleString()
      : "Unknown Date";

    if (replyType === "forward") {
      return `\n\n---------- Forwarded message ----------\nFrom: ${senderInfo}\nDate: ${sentDate}\nSubject: ${activity.subject || "No Subject"}\n\n${originalBody}`;
    }
    
    return `\n\n---------- Original Message ----------\nFrom: ${senderInfo}\nDate: ${sentDate}\n\n${originalBody}`;
  };

  const [to, setTo] = useState(getInitialTo());
  const [cc, setCc] = useState(getInitialCc());
  const [subject, setSubject] = useState(getInitialSubject());
  const [body, setBody] = useState(getInitialBody());
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!to) {
      toast.error("Please enter a recipient email address");
      return;
    }

    setIsSending(true);
    try {
      // Send the email
      const { error } = await supabase.functions.invoke('send-activity-email', {
        body: {
          to,
          cc: cc || null,
          toName: to,
          subject,
          body,
          activityId: activity.activity_id
        }
      });

      if (error) throw error;

      // Create a new activity for the sent email
      await createActivity.mutateAsync({
        type: "Email",
        subject,
        description: body,
        status: "Completed",
        priority: activity.priority || "Normal",
        account_id: activity.account_id || null,
        contact_id: activity.contact_id || null,
        lead_id: activity.lead_id || null,
        opportunity_id: activity.opportunity_id || null,
        quote_id: activity.quote_id || null,
        contract_id: activity.contract_id || null,
        start_datetime: new Date().toISOString(),
        // These fields are handled by the mutation
        ...({ case_id: activity.case_id || null, to_email: to, cc_email: cc || null } as any),
      } as any);

      toast.success("Email sent successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending email:", error);
      toast.error(error.message || "Failed to send email");
    } finally {
      setIsSending(false);
    }
  };

  const getDialogTitle = () => {
    switch (replyType) {
      case "reply":
        return "Reply";
      case "replyAll":
        return "Reply All";
      case "forward":
        return "Forward";
      default:
        return "Reply";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cc">CC</Label>
            <Input
              id="cc"
              type="email"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Type your message..."
              className="font-sans"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !to}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}