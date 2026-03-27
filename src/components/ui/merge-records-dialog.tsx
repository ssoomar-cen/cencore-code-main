import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MergeRecordsDialogProps<T extends Record<string, any>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: T[];
  idField: string;
  displayNameField: string | ((record: T) => string);
  fields: {
    key: string;
    label: string;
    render?: (value: any, record: T) => React.ReactNode;
  }[];
  onMerge: (masterId: string, mergedData: Partial<T>) => Promise<void>;
  isLoading?: boolean;
}

export function MergeRecordsDialog<T extends Record<string, any>>({
  open,
  onOpenChange,
  records,
  idField,
  displayNameField,
  fields,
  onMerge,
  isLoading,
}: MergeRecordsDialogProps<T>) {
  const [masterId, setMasterId] = useState<string>(records[0]?.[idField] || "");
  const [fieldSelections, setFieldSelections] = useState<Record<string, string>>({});

  const getDisplayName = (record: T) => {
    if (typeof displayNameField === "function") {
      return displayNameField(record);
    }
    return record[displayNameField] || "Unknown";
  };

  // Initialize field selections with master record values or first non-empty value
  useMemo(() => {
    const initialSelections: Record<string, string> = {};
    fields.forEach(({ key }) => {
      // Find first record with non-empty value for this field
      const recordWithValue = records.find(r => {
        const value = r[key];
        return value !== null && value !== undefined && value !== "";
      });
      if (recordWithValue) {
        initialSelections[key] = recordWithValue[idField];
      }
    });
    setFieldSelections(initialSelections);
  }, [records, fields, idField]);

  const handleMerge = async () => {
    const mergedData: Partial<T> = {};
    
    fields.forEach(({ key }) => {
      const selectedRecordId = fieldSelections[key] || masterId;
      const selectedRecord = records.find(r => r[idField] === selectedRecordId);
      if (selectedRecord) {
        mergedData[key as keyof T] = selectedRecord[key];
      }
    });

    await onMerge(masterId, mergedData);
  };

  const masterRecord = records.find(r => r[idField] === masterId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Merge {records.length} Records</DialogTitle>
          <DialogDescription>
            Choose the master record and select which field values to keep. Non-master records will be deleted after merge.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action cannot be undone. All related records will be updated to reference the master record.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">Select Master Record</Label>
            <p className="text-sm text-muted-foreground mb-3">
              The master record will be kept, others will be deleted
            </p>
            <RadioGroup value={masterId} onValueChange={setMasterId}>
              <div className="grid gap-2">
                {records.map((record) => (
                  <div
                    key={record[idField]}
                    className={cn(
                      "flex items-center space-x-2 rounded-lg border p-3",
                      masterId === record[idField] && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value={record[idField]} id={record[idField]} />
                    <Label
                      htmlFor={record[idField]}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getDisplayName(record)}</span>
                        {masterId === record[idField] && (
                          <Badge variant="default" className="ml-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Master
                          </Badge>
                        )}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-semibold">Select Field Values</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Choose which value to keep for each field (defaults to non-empty values)
            </p>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {fields.map(({ key, label, render }) => {
                  const hasConflict = new Set(
                    records.map(r => JSON.stringify(r[key]))
                  ).size > 1;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-lg border p-4",
                        hasConflict && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Label className="font-medium">{label}</Label>
                        {hasConflict && (
                          <Badge variant="outline" className="text-amber-600 border-amber-600">
                            Conflict
                          </Badge>
                        )}
                      </div>
                      <RadioGroup
                        value={fieldSelections[key] || masterId}
                        onValueChange={(value) =>
                          setFieldSelections((prev) => ({ ...prev, [key]: value }))
                        }
                      >
                        <div className="space-y-2">
                          {records.map((record) => {
                            const value = record[key];
                            const isEmpty = value === null || value === undefined || value === "";
                            
                            return (
                              <div
                                key={record[idField]}
                                className={cn(
                                  "flex items-start space-x-2 rounded border p-2",
                                  fieldSelections[key] === record[idField] && "border-primary bg-primary/5",
                                  isEmpty && "opacity-50"
                                )}
                              >
                                <RadioGroupItem
                                  value={record[idField]}
                                  id={`${key}-${record[idField]}`}
                                  disabled={isEmpty}
                                  className="mt-1"
                                />
                                <Label
                                  htmlFor={`${key}-${record[idField]}`}
                                  className="flex-1 cursor-pointer font-normal"
                                >
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {getDisplayName(record)}
                                    {masterId === record[idField] && " (Master)"}
                                  </div>
                                  <div className={cn("text-sm", isEmpty && "italic")}>
                                    {isEmpty
                                      ? "No value"
                                      : render
                                      ? render(value, record)
                                      : String(value)}
                                  </div>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </RadioGroup>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleMerge} disabled={isLoading || !masterId}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Merge Records
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
