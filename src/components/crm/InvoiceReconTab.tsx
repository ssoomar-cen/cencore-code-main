import React from "react";
import { useInvoiceReconciliations } from "@/hooks/useInvoiceItems";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface InvoiceReconTabProps {
  invoiceId: string | null;
  itemId: string | null;
}

export function InvoiceReconTab({ invoiceId, itemId }: InvoiceReconTabProps) {
  const { data: reconciliations, isLoading } = useInvoiceReconciliations(invoiceId, itemId);

  if (!invoiceId || !itemId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please select an invoice item first</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!reconciliations || reconciliations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No reconciliation data found</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return "—";
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Data</CardTitle>
        <CardDescription>
          Device-level reconciliation records ({reconciliations.length} records)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Device Code</TableHead>
                <TableHead>Report Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>BATCC</TableHead>
                <TableHead>Actual Cost</TableHead>
                <TableHead>Cost Avoidance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliations.map((recon) => (
                <TableRow key={recon.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{recon.placeInfo || "—"}</div>
                      <div className="text-xs text-muted-foreground">{recon.orgName || "—"}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {recon.logicalDeviceCode || "—"}
                  </TableCell>
                  <TableCell>{formatDate(recon.reportDate)}</TableCell>
                  <TableCell>
                    {recon.category ? (
                      <Badge variant="secondary">{recon.category}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(recon.currentBatcc)}</TableCell>
                  <TableCell>{formatCurrency(recon.currentActualCost)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(recon.currentCa)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary statistics */}
        <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Actual Cost</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                reconciliations.reduce((sum, r) => sum + (r.currentActualCost || 0), 0)
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total BATCC</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                reconciliations.reduce((sum, r) => sum + (r.currentBatcc || 0), 0)
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Cost Avoidance</p>
            <p className="text-lg font-semibold">
              {formatCurrency(
                reconciliations.reduce((sum, r) => sum + (r.currentCa || 0), 0)
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
