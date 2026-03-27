import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/contexts/ImpersonationContext";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUserEmail, stopImpersonation } = useImpersonation();

  if (!isImpersonating) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-3">
      <AlertCircle className="h-4 w-4" />
      <span className="text-sm font-medium">
        You are currently impersonating: <strong>{impersonatedUserEmail}</strong>
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-amber-950 hover:bg-amber-600 hover:text-white ml-auto"
        onClick={stopImpersonation}
      >
        <X className="h-4 w-4 mr-1" />
        Stop Impersonating
      </Button>
    </div>
  );
}
