import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { IntegrationsGrid } from "./IntegrationsGrid";
import { useUserRole } from "@/hooks/useUserRole";

export function SystemConfiguration() {
  const { isAdmin } = useUserRole();

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Only administrators can access system configuration settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          System-wide configurations for integrations and third-party services. These settings affect all users.
        </AlertDescription>
      </Alert>

      {/* Integrations Grid */}
      <IntegrationsGrid />
    </div>
  );
}
