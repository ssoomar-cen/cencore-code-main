import React from "react";
import { useInvoiceItem } from "@/hooks/useInvoiceItems";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface InvoiceItemDetailPanelProps {
  invoiceId: string;
  itemId: string;
  onClose?: () => void;
}

const ReadOnlyRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-b-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value ?? "—"}</span>
  </div>
);

const formatDate = (date: string | null | undefined) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString();
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

const formatPercentage = (value: number | null | undefined) => {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
};

export function InvoiceItemDetailPanel({ invoiceId, itemId, onClose }: InvoiceItemDetailPanelProps) {
  const { data: item, isLoading } = useInvoiceItem(invoiceId, itemId);
  const [detailsOpen, setDetailsOpen] = React.useState(true);
  const [financialsOpen, setFinancialsOpen] = React.useState(true);

  if (!invoiceId || !itemId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="sticky top-6">
        <CardContent className="flex justify-center py-12">
          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!item) {
    return (
      <Card className="sticky top-6">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Item not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-6">
      <CardHeader className="relative py-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">Invoice Item Detail</CardTitle>
            <CardDescription className="text-xs mt-1">
              {formatDate(item.periodDate)}
            </CardDescription>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 w-6 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Item Type Badge */}
        {item.invoiceItemType && (
          <div>
            <Badge variant="secondary" className="text-xs">
              {item.invoiceItemType}
            </Badge>
          </div>
        )}

        {/* Details Section */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-foreground transition-colors">
              <span>Details</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0">
            <ReadOnlyRow label="Name" value={item.name || "—"} />
            <ReadOnlyRow label="Period" value={formatDate(item.periodDate)} />
            {item.energyProgramId && (
              <ReadOnlyRow label="Energy Program ID" value={item.energyProgramId} />
            )}
            {item.projectId && (
              <ReadOnlyRow label="Project ID" value={item.projectId} />
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Financials Section */}
        <Collapsible open={financialsOpen} onOpenChange={setFinancialsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-foreground transition-colors border-t">
              <span>Financials</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${financialsOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0">
            <ReadOnlyRow label="Fee Amount" value={formatCurrency(item.feeAmount)} />
            <ReadOnlyRow label="Credit" value={formatCurrency(item.credit)} />
            <ReadOnlyRow label="Current CA" value={formatCurrency(item.currentCostAvoidance)} />
            <ReadOnlyRow label="Previous CA" value={formatCurrency(item.previousCostAvoidance)} />
            <ReadOnlyRow label="Special Savings" value={formatCurrency(item.specialSavings)} />
            <ReadOnlyRow label="Current vs Previous" value={formatCurrency(item.currentLessPrevious)} />
            <ReadOnlyRow label="Savings %" value={formatPercentage(item.savings)} />
          </CollapsibleContent>
        </Collapsible>

        {/* External IDs */}
        {(item.salesforceId ||  item.d365InvoiceItemGuid) && (
          <div className="pt-2 border-t text-xs space-y-1">
            <p className="text-muted-foreground font-medium">External IDs</p>
            {item.salesforceId && (
              <div className="break-words">
                <span className="text-muted-foreground">SF: </span>
                <span className="font-mono text-xs">{item.salesforceId}</span>
              </div>
            )}
            {item.d365InvoiceItemGuid && (
              <div className="break-words">
                <span className="text-muted-foreground">D365: </span>
                <span className="font-mono text-xs">{item.d365InvoiceItemGuid}</span>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <div className="pt-2 text-xs text-muted-foreground border-t">
          <div>Created: {formatDate(item.createdAt)}</div>
          <div>Updated: {formatDate(item.updatedAt)}</div>
        </div>
      </CardContent>
    </Card>
  );
}
