import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface OpportunityProjection {
  id: string;
  year_number: number;
  gross_monthly_fee: number | null;
  net_monthly_fee: number | null;
  gross_savings: number | null;
  net_savings: number | null;
  notes: string | null;
}

interface ContractProjection {
  id: string;
  year_number: number;
  gross_monthly_fee: number | null;
  gross_savings: number | null;
  notes: string | null;
}

interface OpportunityYearProjectionsTableProps {
  type: "opportunity";
  entityId: string;
  projections: OpportunityProjection[];
  onAdd: (projection: Partial<OpportunityProjection>) => void;
  onUpdate: (projection: Partial<OpportunityProjection> & { id: string }) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

interface ContractYearProjectionsTableProps {
  type: "contract";
  entityId: string;
  projections: ContractProjection[];
  onAdd: (projection: Partial<ContractProjection>) => void;
  onUpdate: (projection: Partial<ContractProjection> & { id: string }) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

type YearProjectionsTableProps = OpportunityYearProjectionsTableProps | ContractYearProjectionsTableProps;

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "-";
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const parseCurrency = (value: string): number | null => {
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (cleaned === "") return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
};

export const YearProjectionsTable = (props: YearProjectionsTableProps) => {
  const { type, entityId, projections, onAdd, onUpdate, onDelete, isLoading } = props;
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string | number | null>>({});

  const isOpportunity = type === "opportunity";
  const existingYears = projections.map(p => p.year_number);
  const nextYear = existingYears.length > 0 ? Math.max(...existingYears) + 1 : 1;

  const handleStartAdd = () => {
    setAddingNew(true);
    setFormData({
      year_number: nextYear,
      gross_monthly_fee: "",
      net_monthly_fee: "",
      gross_savings: "",
      net_savings: "",
      notes: "",
    });
  };

  const handleStartEdit = (projection: OpportunityProjection | ContractProjection) => {
    setEditingId(projection.id);
    setFormData({
      year_number: projection.year_number,
      gross_monthly_fee: projection.gross_monthly_fee ?? "",
      gross_savings: projection.gross_savings ?? "",
      notes: projection.notes ?? "",
      ...((projection as OpportunityProjection).net_monthly_fee !== undefined && {
        net_monthly_fee: (projection as OpportunityProjection).net_monthly_fee ?? "",
        net_savings: (projection as OpportunityProjection).net_savings ?? "",
      }),
    });
  };

  const handleSaveAdd = () => {
    const newProjection: any = {
      [isOpportunity ? "opportunity_id" : "contract_id"]: entityId,
      year_number: Number(formData.year_number),
      gross_monthly_fee: parseCurrency(String(formData.gross_monthly_fee || "")),
      gross_savings: parseCurrency(String(formData.gross_savings || "")),
      notes: formData.notes || null,
    };
    
    if (isOpportunity) {
      newProjection.net_monthly_fee = parseCurrency(String(formData.net_monthly_fee || ""));
      newProjection.net_savings = parseCurrency(String(formData.net_savings || ""));
    }

    onAdd(newProjection);
    setAddingNew(false);
    setFormData({});
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    
    const updates: any = {
      id: editingId,
      year_number: Number(formData.year_number),
      gross_monthly_fee: parseCurrency(String(formData.gross_monthly_fee || "")),
      gross_savings: parseCurrency(String(formData.gross_savings || "")),
      notes: formData.notes || null,
    };
    
    if (isOpportunity) {
      updates.net_monthly_fee = parseCurrency(String(formData.net_monthly_fee || ""));
      updates.net_savings = parseCurrency(String(formData.net_savings || ""));
    }

    onUpdate(updates);
    setEditingId(null);
    setFormData({});
  };

  const handleCancel = () => {
    setAddingNew(false);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const renderInput = (field: string, placeholder: string, isCurrency = false) => (
    <Input
      type={isCurrency ? "text" : field === "year_number" ? "number" : "text"}
      value={formData[field] ?? ""}
      onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
      placeholder={placeholder}
      className="h-8 text-sm"
    />
  );

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                  <CardTitle className="text-base">
                    {isOpportunity ? "Fees & Savings by Year" : "Fees by Year"}
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartAdd();
                  }}
                  disabled={addingNew || !!editingId}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Year
                </Button>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {projections.length === 0 && !addingNew ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No year projections added yet. Click "Add Year" to get started.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Year</TableHead>
                        <TableHead>Gross Monthly Fee</TableHead>
                        {isOpportunity && <TableHead>Net Monthly Fee</TableHead>}
                        <TableHead>Gross Savings</TableHead>
                        {isOpportunity && <TableHead>Net Savings</TableHead>}
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projections.map((projection) => (
                        <TableRow key={projection.id}>
                          {editingId === projection.id ? (
                            <>
                              <TableCell>{renderInput("year_number", "Year")}</TableCell>
                              <TableCell>{renderInput("gross_monthly_fee", "$0.00", true)}</TableCell>
                              {isOpportunity && <TableCell>{renderInput("net_monthly_fee", "$0.00", true)}</TableCell>}
                              <TableCell>{renderInput("gross_savings", "$0.00", true)}</TableCell>
                              {isOpportunity && <TableCell>{renderInput("net_savings", "$0.00", true)}</TableCell>}
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveEdit}>
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-medium">{projection.year_number}</TableCell>
                              <TableCell>{formatCurrency(projection.gross_monthly_fee)}</TableCell>
                              {isOpportunity && <TableCell>{formatCurrency((projection as OpportunityProjection).net_monthly_fee)}</TableCell>}
                              <TableCell>{formatCurrency(projection.gross_savings)}</TableCell>
                              {isOpportunity && <TableCell>{formatCurrency((projection as OpportunityProjection).net_savings)}</TableCell>}
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => handleStartEdit(projection)}
                                    disabled={addingNew || !!editingId}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteId(projection.id)}
                                    disabled={addingNew || !!editingId}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      {addingNew && (
                        <TableRow>
                          <TableCell>{renderInput("year_number", "Year")}</TableCell>
                          <TableCell>{renderInput("gross_monthly_fee", "$0.00", true)}</TableCell>
                          {isOpportunity && <TableCell>{renderInput("net_monthly_fee", "$0.00", true)}</TableCell>}
                          <TableCell>{renderInput("gross_savings", "$0.00", true)}</TableCell>
                          {isOpportunity && <TableCell>{renderInput("net_savings", "$0.00", true)}</TableCell>}
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveAdd}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Year Projection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this year projection? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
