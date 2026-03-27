import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EnergyProgram } from "@/hooks/useEnergyPrograms";

type EnergyProgramFormData = {
  name: string;
  pgm_id: string;
  service_status: string;
  status: string;
  d365_energy_program_guid: string;
  contract_status: string;
  contract_type: string;
  contract_start_date: string;
  billing_schedule_end_date: string;
  contract_term: string;
  ct_hot_notes: string;
  key_reference_notes: string;
  sus_term_info: string;
};

const serviceStatuses = ["IC", "OOC", "Suspended", "Terminated", "Draft", "Inactive"];
const contractStatuses = [
  "Draft",
  "Active",
  "Expired",
  "Terminated",
  "Closed Lost",
  "Inactive",
  "Negotiation",
  "Signed",
  "Signed/Not Executed",
];
const contractTypes = [
  "Fixed",
  "Fixed-ES",
  "Var Fixed",
  "Var Fixed-ES",
  "Split Fee",
  "Performance Fee",
  "Turnkey",
  "Turnkey-R",
  "Turnkey-S",
];

interface EnergyProgramFormProps {
  energyProgram?: EnergyProgram;
  onSubmit: (data: Partial<EnergyProgram>) => void;
  onCancel: () => void;
}

export const EnergyProgramForm = ({
  energyProgram,
  onSubmit,
  onCancel,
}: EnergyProgramFormProps) => {
  const { register, handleSubmit, setValue, watch, reset } =
    useForm<EnergyProgramFormData>({
      defaultValues: energyProgram
        ? {
            name: energyProgram.name || "",
            pgm_id: energyProgram.pgm_id || "",
            service_status: energyProgram.service_status || "",
            status: energyProgram.status || "",
            d365_energy_program_guid:
              energyProgram.d365_energy_program_guid || "",
            contract_status: energyProgram.contract_status || "",
            contract_type: energyProgram.contract_type || "",
            contract_start_date: energyProgram.contract_start_date || "",
            billing_schedule_end_date:
              energyProgram.billing_schedule_end_date || "",
            contract_term: energyProgram.contract_term?.toString() || "",
            ct_hot_notes: energyProgram.ct_hot_notes || "",
            key_reference_notes: energyProgram.key_reference_notes || "",
            sus_term_info: energyProgram.sus_term_info || "",
          }
        : {
            name: "",
            pgm_id: "",
            service_status: "",
            status: "",
            d365_energy_program_guid: "",
            contract_status: "",
            contract_type: "",
            contract_start_date: "",
            billing_schedule_end_date: "",
            contract_term: "",
            ct_hot_notes: "",
            key_reference_notes: "",
            sus_term_info: "",
          },
    });

  useEffect(() => {
    if (energyProgram) {
      reset({
        name: energyProgram.name || "",
        pgm_id: energyProgram.pgm_id || "",
        service_status: energyProgram.service_status || "",
        status: energyProgram.status || "",
        d365_energy_program_guid: energyProgram.d365_energy_program_guid || "",
        contract_status: energyProgram.contract_status || "",
        contract_type: energyProgram.contract_type || "",
        contract_start_date: energyProgram.contract_start_date || "",
        billing_schedule_end_date:
          energyProgram.billing_schedule_end_date || "",
        contract_term: energyProgram.contract_term?.toString() || "",
        ct_hot_notes: energyProgram.ct_hot_notes || "",
        key_reference_notes: energyProgram.key_reference_notes || "",
        sus_term_info: energyProgram.sus_term_info || "",
      });
    } else {
      reset({
        name: "",
        pgm_id: "",
        service_status: "",
        status: "",
        d365_energy_program_guid: "",
        contract_status: "",
        contract_type: "",
        contract_start_date: "",
        billing_schedule_end_date: "",
        contract_term: "",
        ct_hot_notes: "",
        key_reference_notes: "",
        sus_term_info: "",
      });
    }
  }, [energyProgram, reset]);

  const serviceStatusValue = watch("service_status");
  const contractStatusValue = watch("contract_status");
  const contractTypeValue = watch("contract_type");

  const handleFormSubmit = (data: EnergyProgramFormData) => {
    const formattedData: Partial<EnergyProgram> = {
      name: data.name || null,
      pgm_id: data.pgm_id || null,
      service_status: data.service_status || null,
      status: data.status || null,
      d365_energy_program_guid: data.d365_energy_program_guid || null,
      contract_status: data.contract_status || null,
      contract_type: data.contract_type || null,
      contract_start_date: data.contract_start_date || null,
      billing_schedule_end_date: data.billing_schedule_end_date || null,
      contract_term: data.contract_term ? parseInt(data.contract_term) : null,
      ct_hot_notes: data.ct_hot_notes || null,
      key_reference_notes: data.key_reference_notes || null,
      sus_term_info: data.sus_term_info || null,
    };
    onSubmit(
      energyProgram
        ? { energy_program_id: energyProgram.energy_program_id, ...formattedData }
        : formattedData
    );
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Program Info */}
      <div>
        <h3 className="text-base font-semibold mb-4">Program Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} placeholder="Program name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pgm_id">Program ID</Label>
            <Input
              id="pgm_id"
              {...register("pgm_id")}
              placeholder="PGM identifier"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_status">Service Status</Label>
            <Select
              value={serviceStatusValue || undefined}
              onValueChange={(v) => setValue("service_status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service status" />
              </SelectTrigger>
              <SelectContent>
                {serviceStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input id="status" {...register("status")} placeholder="Status" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="d365_energy_program_guid">
              D365 Energy Program GUID
            </Label>
            <Input
              id="d365_energy_program_guid"
              {...register("d365_energy_program_guid")}
              placeholder="D365 GUID"
            />
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div>
        <h3 className="text-base font-semibold mb-4">Contract Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contract_status">Contract Status</Label>
            <Select
              value={contractStatusValue || undefined}
              onValueChange={(v) => setValue("contract_status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contract status" />
              </SelectTrigger>
              <SelectContent>
                {contractStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_type">Contract Type</Label>
            <Select
              value={contractTypeValue || undefined}
              onValueChange={(v) => setValue("contract_type", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contract type" />
              </SelectTrigger>
              <SelectContent>
                {contractTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_start_date">Contract Start Date</Label>
            <Input
              id="contract_start_date"
              type="date"
              {...register("contract_start_date")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_schedule_end_date">
              Billing Schedule End Date
            </Label>
            <Input
              id="billing_schedule_end_date"
              type="date"
              {...register("billing_schedule_end_date")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract_term">Contract Term (years)</Label>
            <Input
              id="contract_term"
              type="number"
              {...register("contract_term")}
              placeholder="e.g. 5"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <h3 className="text-base font-semibold mb-4">Notes</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ct_hot_notes">CT Hot Notes</Label>
            <Textarea
              id="ct_hot_notes"
              {...register("ct_hot_notes")}
              rows={3}
              placeholder="Hot notes..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_reference_notes">Key Reference Notes</Label>
            <Textarea
              id="key_reference_notes"
              {...register("key_reference_notes")}
              rows={3}
              placeholder="Key reference notes..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sus_term_info">Suspension/Termination Info</Label>
            <Textarea
              id="sus_term_info"
              {...register("sus_term_info")}
              rows={3}
              placeholder="Suspension or termination information..."
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {energyProgram ? "Update" : "Create"} Energy Program
        </Button>
      </div>
    </form>
  );
};
