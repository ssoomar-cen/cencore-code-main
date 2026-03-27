import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { UserEmailConnections } from "./UserEmailConnections";

export function MyConnections() {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Connect your personal accounts to sync data with the CRM. These are your individual connections.
        </AlertDescription>
      </Alert>

      <UserEmailConnections />
    </div>
  );
}
