import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mail, Phone } from "lucide-react";
import { SupportEmailDialog } from "@/components/support/SupportEmailDialog";
import { toast } from "sonner";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Support = () => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { data: branding } = useTenantBranding();

  // Use branding values or fallback to defaults
  const supportEmail = branding?.support_email || "support@msdynamics.com";
  const supportPhone = branding?.support_phone || "+1 (800) 555-1234";

  const handlePhoneClick = () => {
    const phoneNumber = supportPhone.replace(/\D/g, '');
    window.location.href = `tel:+${phoneNumber}`;
  };

  const teamsSupportUrl =
    (import.meta as any)?.env?.VITE_TEAMS_SUPPORT_URL ||
    `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(supportEmail)}`;
  const slackSupportUrl = (import.meta as any)?.env?.VITE_SLACK_SUPPORT_URL || "";

  const openTeamsChat = () => {
    window.open(teamsSupportUrl, "_blank", "noopener,noreferrer");
  };

  const openSlackChat = () => {
    if (!slackSupportUrl) {
      toast.error("Slack support URL is not configured. Set VITE_SLACK_SUPPORT_URL.");
      return;
    }
    window.open(slackSupportUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-1">Get help with your portal</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader className="p-4">
            <MessageSquare className="h-6 w-6 text-primary mb-1" />
            <CardTitle className="text-lg">Live Chat</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col">
            <p className="text-sm text-muted-foreground mb-3 flex-1">
              Chat with our support team
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  Start Chat
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={openTeamsChat}>
                  Open Microsoft Teams Chat
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openSlackChat}>
                  Open Slack Chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="p-4">
            <Mail className="h-6 w-6 text-primary mb-1" />
            <CardTitle className="text-lg">Email Support</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col">
            <p className="text-sm text-muted-foreground mb-3 flex-1">
              {supportEmail}
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setEmailDialogOpen(true)}
            >
              Send Email
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="p-4">
            <Phone className="h-6 w-6 text-primary mb-1" />
            <CardTitle className="text-lg">Phone Support</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col">
            <p className="text-sm text-muted-foreground mb-3 flex-1">
              Mon-Fri, 9AM-5PM CST<br />
              {supportPhone}
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handlePhoneClick}
            >
              Call Now
            </Button>
          </CardContent>
        </Card>
      </div>

      <SupportEmailDialog 
        open={emailDialogOpen} 
        onOpenChange={setEmailDialogOpen} 
      />
    </div>
  );
};

export default Support;
