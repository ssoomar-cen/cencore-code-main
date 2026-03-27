import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, EyeOff, AlertTriangle } from "lucide-react";
import { useHiddenFeatures } from "@/hooks/useHiddenFeatures";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FEATURES = [
  // Core Features
  { key: 'dashboard', label: 'Dashboard', category: 'Core', critical: true },
  { key: 'crm', label: 'CRM (All)', category: 'Core', critical: false },
  { key: 'projects', label: 'Energy Programs', category: 'Core', critical: false },
  { key: 'settings', label: 'Settings', category: 'Admin', critical: true },
  
  // CRM Sub-modules
  { key: 'crm_accounts', label: 'Organizations', category: 'CRM', critical: false },
  { key: 'crm_contacts', label: 'Contacts', category: 'CRM', critical: false },
  { key: 'crm_opportunities', label: 'Opportunities', category: 'CRM', critical: false },
  { key: 'crm_quotes', label: 'Quotes', category: 'CRM', critical: false },
  { key: 'crm_contracts', label: 'Contracts', category: 'CRM', critical: false },
  { key: 'crm_activities', label: 'Activities', category: 'CRM', critical: false },
  { key: 'crm_cases', label: 'Cases', category: 'CRM', critical: false },
  
  // Other Features
  { key: 'documents', label: 'Documents', category: 'Core', critical: false },
  { key: 'email_calendar', label: 'Email & Calendar', category: 'Communication', critical: false },
  { key: 'workflow_automation', label: 'Workflow Automation', category: 'Automation', critical: false },
  { key: 'global_search', label: 'Global Search', category: 'Core', critical: false },
  { key: 'import_export', label: 'Import/Export', category: 'Data', critical: false },
  { key: 'support', label: 'Support', category: 'Core', critical: false },
  { key: 'audit_log', label: 'Audit Log', category: 'Admin', critical: false },
];

export function HiddenFeaturesManagement() {
  const { hiddenFeatures, isLoading, toggleHiddenFeature, isToggling, isFeatureHidden } = useHiddenFeatures();

  const hiddenCount = hiddenFeatures.filter(hf => hf.is_hidden).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          Hide Features
        </CardTitle>
        <CardDescription>
          Completely hide features from all users in your organization. Hidden features won't appear in the sidebar or be accessible.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hiddenCount > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {hiddenCount} feature{hiddenCount > 1 ? 's are' : ' is'} currently hidden from all users.
            </AlertDescription>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Hidden</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURES.map((feature) => {
              const isHidden = isFeatureHidden(feature.key);

              return (
                <TableRow key={feature.key} className={isHidden ? "opacity-60" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {feature.label}
                      {feature.critical && (
                        <Badge variant="destructive" className="text-xs">
                          Critical
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{feature.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {isHidden ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        Visible
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={isHidden}
                      disabled={isToggling || feature.critical}
                      onCheckedChange={(checked) => 
                        toggleHiddenFeature({ featureKey: feature.key, isHidden: checked })
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <p className="text-xs text-muted-foreground">
          Note: Critical features (Dashboard, Settings) cannot be hidden to ensure system functionality.
        </p>
      </CardContent>
    </Card>
  );
}
