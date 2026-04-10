import React from "react";
import { useInvoiceItems } from "@/hooks/useInvoiceItems";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Loader } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface InvoiceItemsTabProps {
  invoiceId: string;
  onSelectItem?: (itemId: string) => void;
}

export function InvoiceItemsTab({ invoiceId, onSelectItem }: InvoiceItemsTabProps) {
  const { data: items, isLoading } = useInvoiceItems(invoiceId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No invoice items found</p>
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

  const formatPercentage = (value: number | null | undefined) => {
    if (value == null) return "—";
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Items</CardTitle>
        <CardDescription>
          Itemized breakdown of the invoice ({items.length} items)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Fee Amount</TableHead>
                <TableHead>Cost Avoidance</TableHead>
                <TableHead>Savings</TableHead>
                <TableHead className="w-20">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {formatDate(item.periodDate)}
                  </TableCell>
                  <TableCell>
                    {item.invoiceItemType ? (
                      <Badge variant="outline">{item.invoiceItemType}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(item.feeAmount)}</TableCell>
                  <TableCell>{formatCurrency(item.currentCostAvoidance)}</TableCell>
                  <TableCell>{formatPercentage(item.savings)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSelectItem?.(item.id)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
