import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const planningLineSchema = z.object({
  line_number: z.coerce.number().min(1, "Line number is required"),
  line_type: z.string().min(1, "Line type is required"),
  type: z.string().optional(),
  description: z.string().optional(),
  resource_no: z.string().optional(),
  planning_date: z.date().optional(),
  quantity: z.coerce.number().optional(),
  unit_of_measure: z.string().optional(),
  unit_cost: z.coerce.number().optional(),
  unit_price: z.coerce.number().optional(),
});

type PlanningLineFormData = z.infer<typeof planningLineSchema>;

interface PlanningLineFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
  projectId: string;
  taskId?: string;
  planningLine?: any;
  nextLineNumber?: number;
}

export function PlanningLineForm({
  open,
  onClose,
  onSubmit,
  isSubmitting,
  projectId,
  taskId,
  planningLine,
  nextLineNumber = 10000,
}: PlanningLineFormProps) {
  const form = useForm<PlanningLineFormData>({
    resolver: zodResolver(planningLineSchema),
    defaultValues: {
      line_number: nextLineNumber,
      line_type: "Budget",
      type: "Resource",
      description: "",
      resource_no: "",
      quantity: 0,
      unit_of_measure: "HOUR",
      unit_cost: 0,
      unit_price: 0,
    },
  });

  useEffect(() => {
    if (planningLine) {
      form.reset({
        line_number: planningLine.line_number,
        line_type: planningLine.line_type || "Budget",
        type: planningLine.type || "Resource",
        description: planningLine.description || "",
        resource_no: planningLine.resource_no || "",
        planning_date: planningLine.planning_date ? new Date(planningLine.planning_date) : undefined,
        quantity: planningLine.quantity || 0,
        unit_of_measure: planningLine.unit_of_measure || "HOUR",
        unit_cost: planningLine.unit_cost || 0,
        unit_price: planningLine.unit_price || 0,
      });
    } else if (open) {
      form.reset({
        line_number: nextLineNumber,
        line_type: "Budget",
        type: "Resource",
        description: "",
        resource_no: "",
        planning_date: new Date(),
        quantity: 0,
        unit_of_measure: "HOUR",
        unit_cost: 0,
        unit_price: 0,
      });
    }
  }, [planningLine, open, nextLineNumber, form]);

  const handleSubmit = (data: PlanningLineFormData) => {
    const quantity = data.quantity || 0;
    const unitCost = data.unit_cost || 0;
    const unitPrice = data.unit_price || 0;

    onSubmit({
      ...data,
      project_id: projectId,
      task_id: taskId || null,
      planning_date: data.planning_date ? format(data.planning_date, "yyyy-MM-dd") : null,
      total_cost: quantity * unitCost,
      total_price: quantity * unitPrice,
      bc_sync_status: "pending",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {planningLine ? "Edit Planning Line" : "Add Planning Line"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="line_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line Number *</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="line_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select line type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Budget">Budget</SelectItem>
                        <SelectItem value="Billable">Billable</SelectItem>
                        <SelectItem value="Both Budget and Billable">Both Budget and Billable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Resource">Resource</SelectItem>
                        <SelectItem value="Item">Item</SelectItem>
                        <SelectItem value="G/L Account">G/L Account</SelectItem>
                        <SelectItem value="Text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="resource_no"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource/Item No.</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., RES001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="planning_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Planning Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_of_measure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measure</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="HOUR" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Calculated totals preview */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Cost</label>
                <p className="text-lg font-semibold">
                  ${((form.watch("quantity") || 0) * (form.watch("unit_cost") || 0)).toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Total Price</label>
                <p className="text-lg font-semibold">
                  ${((form.watch("quantity") || 0) * (form.watch("unit_price") || 0)).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : planningLine ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
