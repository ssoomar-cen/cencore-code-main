import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Measure } from "@/hooks/useMeasures";

type MeasureFormData = {
  name: string;
  c360_account_id: string;
  c360_measure_id: string;
  measure_program_id: string;
  conversion_bill_period: string;
  conversion_date: string;
};

interface MeasureFormProps {
  measure?: Measure;
  onSubmit: (data: Partial<Measure>) => void;
  onCancel: () => void;
}

export const MeasureForm = ({
  measure,
  onSubmit,
  onCancel,
}: MeasureFormProps) => {
  const { register, handleSubmit, reset } = useForm<MeasureFormData>({
    defaultValues: measure
      ? {
          name: measure.name || "",
          c360_account_id: measure.c360_account_id || "",
          c360_measure_id: measure.c360_measure_id || "",
          measure_program_id: measure.measure_program_id || "",
          conversion_bill_period: measure.conversion_bill_period || "",
          conversion_date: measure.conversion_date || "",
        }
      : {
          name: "",
          c360_account_id: "",
          c360_measure_id: "",
          measure_program_id: "",
          conversion_bill_period: "",
          conversion_date: "",
        },
  });

  useEffect(() => {
    if (measure) {
      reset({
        name: measure.name || "",
        c360_account_id: measure.c360_account_id || "",
        c360_measure_id: measure.c360_measure_id || "",
        measure_program_id: measure.measure_program_id || "",
        conversion_bill_period: measure.conversion_bill_period || "",
        conversion_date: measure.conversion_date || "",
      });
    } else {
      reset({
        name: "",
        c360_account_id: "",
        c360_measure_id: "",
        measure_program_id: "",
        conversion_bill_period: "",
        conversion_date: "",
      });
    }
  }, [measure, reset]);

  const handleFormSubmit = (data: MeasureFormData) => {
    const formattedData: Partial<Measure> = {
      name: data.name || null,
      c360_account_id: data.c360_account_id || null,
      c360_measure_id: data.c360_measure_id || null,
      measure_program_id: data.measure_program_id || null,
      conversion_bill_period: data.conversion_bill_period || null,
      conversion_date: data.conversion_date || null,
    };
    onSubmit(
      measure ? { measure_id: measure.measure_id, ...formattedData } : formattedData
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <h3 className="text-base font-semibold mb-4">Measure Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="Measure name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c360_account_id">C360 Account ID</Label>
            <Input
              id="c360_account_id"
              {...register("c360_account_id")}
              placeholder="C360 account identifier"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="c360_measure_id">C360 Measure ID</Label>
            <Input
              id="c360_measure_id"
              {...register("c360_measure_id")}
              placeholder="C360 measure identifier"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="measure_program_id">Measure Program ID</Label>
            <Input
              id="measure_program_id"
              {...register("measure_program_id")}
              placeholder="Program identifier"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversion_bill_period">
              Conversion Bill Period
            </Label>
            <Input
              id="conversion_bill_period"
              {...register("conversion_bill_period")}
              placeholder="e.g. 2024-01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="conversion_date">Conversion Date</Label>
            <Input
              id="conversion_date"
              type="date"
              {...register("conversion_date")}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{measure ? "Update" : "Create"} Measure</Button>
      </div>
    </form>
  );
};
