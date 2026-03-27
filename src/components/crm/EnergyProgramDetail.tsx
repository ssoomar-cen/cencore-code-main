import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { EnergyProgram } from "@/hooks/useEnergyPrograms";
import { useEnergyProgramTeamMembers } from "@/hooks/useEnergyProgramTeamMembers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formatDate = (date: string | null | undefined) => {
  if (!date) return "-";
  return format(new Date(date), "M/d/yyyy");
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value ?? "-"}</span>
  </div>
);

const roleOptions = [
  "Account Manager",
  "Project Manager",
  "Engineer",
  "Field Technician",
  "Sales Representative",
  "Operations Lead",
  "Support Specialist",
  "Director",
  "Other",
];

export const EnergyProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [programInfoOpen, setProgramInfoOpen] = useState(true);
  const [contractInfoOpen, setContractInfoOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({
    role: "",
    is_primary: false,
    start_date: "",
    end_date: "",
    notes: "",
  });

  const { data: program, isLoading } = useQuery({
    queryKey: ["energy-program-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("energy_program")
        .select(`*, account:account_id(name), opportunity:opportunity_id(name)`)
        .eq("energy_program_id", id)
        .single();
      if (error) throw error;
      return data as EnergyProgram;
    },
    enabled: !!id,
  });

  const { teamMembers, isLoading: membersLoading, createTeamMember, isCreating } =
    useEnergyProgramTeamMembers({ energy_program_id: id || "", enabled: !!id });

  const handleAddMember = () => {
    if (!id) return;
    createTeamMember({
      energy_program_id: id,
      role: memberForm.role || null,
      is_primary: memberForm.is_primary,
      is_active: true,
      start_date: memberForm.start_date || null,
      end_date: memberForm.end_date || null,
      notes: memberForm.notes || null,
    });
    setAddMemberOpen(false);
    setMemberForm({ role: "", is_primary: false, start_date: "", end_date: "", notes: "" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Energy program not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/crm/energy-programs")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Energy Programs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/crm/energy-programs")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Energy Programs
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{program.name || "Unnamed Program"}</h1>
          <div className="flex items-center gap-2 mt-1">
            {program.account?.name && (
              <span className="text-muted-foreground text-sm">{program.account.name}</span>
            )}
            {program.service_status && (
              <Badge variant="outline">{program.service_status}</Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Program Info</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        {/* Program Info Tab */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <Collapsible open={programInfoOpen} onOpenChange={setProgramInfoOpen}>
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex w-full justify-between p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base">Program Info</CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${programInfoOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  <InfoRow label="Name" value={program.name} />
                  <InfoRow label="Program ID" value={program.pgm_id} />
                  <InfoRow label="Service Status" value={program.service_status ? <Badge variant="outline">{program.service_status}</Badge> : null} />
                  <InfoRow label="Status" value={program.status} />
                  <InfoRow label="Account" value={program.account?.name} />
                  <InfoRow label="Opportunity" value={program.opportunity?.name} />
                  <InfoRow label="D365 GUID" value={program.d365_energy_program_guid} />
                  <InfoRow label="Salesforce ID" value={program.salesforce_id} />
                  <InfoRow label="Push to D365" value={program.push_to_d365 !== null ? (program.push_to_d365 ? "Yes" : "No") : null} />
                  <InfoRow label="Send Contacts" value={program.send_contacts !== null ? (program.send_contacts ? "Yes" : "No") : null} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={contractInfoOpen} onOpenChange={setContractInfoOpen}>
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex w-full justify-between p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base">Contract Info</CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${contractInfoOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  <InfoRow label="Contract Status" value={program.contract_status} />
                  <InfoRow label="Contract Type" value={program.contract_type} />
                  <InfoRow label="Contract Start Date" value={formatDate(program.contract_start_date)} />
                  <InfoRow label="Billing Schedule End Date" value={formatDate(program.billing_schedule_end_date)} />
                  <InfoRow label="Contract Term" value={program.contract_term != null ? `${program.contract_term} year(s)` : null} />
                  <InfoRow label="Related Contract SF ID" value={program.related_contract_sf_id} />
                  <InfoRow label="Sus/Term Date" value={formatDate(program.sus_term_date)} />
                  <InfoRow label="Sus/Term Reason" value={program.sus_term_reason} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <Card>
              <CardHeader className="pb-2">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex w-full justify-between p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base">Notes</CardTitle>
                    <ChevronDown className={`h-4 w-4 transition-transform ${notesOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">CT Hot Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{program.ct_hot_notes || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Key Reference Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{program.key_reference_notes || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Suspension/Termination Info</p>
                    <p className="text-sm whitespace-pre-wrap">{program.sus_term_info || "-"}</p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Card>
            <CardContent className="pt-4 space-y-2">
              <InfoRow label="Created" value={formatDate(program.created_at)} />
              <InfoRow label="Updated" value={formatDate(program.updated_at)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Members Tab */}
        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Team Members</CardTitle>
              <Button size="sm" className="gap-2" onClick={() => setAddMemberOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No team members added yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.ep_team_member_id}>
                        <TableCell>
                          {member.contact
                            ? `${member.contact.first_name} ${member.contact.last_name}`
                            : member.name || "-"}
                        </TableCell>
                        <TableCell>{member.role || "-"}</TableCell>
                        <TableCell>{member.is_primary ? "Yes" : "No"}</TableCell>
                        <TableCell>{member.is_active ? "Yes" : "No"}</TableCell>
                        <TableCell>{formatDate(member.start_date)}</TableCell>
                        <TableCell>{formatDate(member.end_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                View invoices in the Invoices module.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <Select
                value={memberForm.role || undefined}
                onValueChange={(v) => setMemberForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="member-primary"
                checked={memberForm.is_primary}
                onCheckedChange={(checked) =>
                  setMemberForm((f) => ({ ...f, is_primary: !!checked }))
                }
              />
              <Label htmlFor="member-primary">Is Primary</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-start">Start Date</Label>
              <Input
                id="member-start"
                type="date"
                value={memberForm.start_date}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-end">End Date</Label>
              <Input
                id="member-end"
                type="date"
                value={memberForm.end_date}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-notes">Notes</Label>
              <Textarea
                id="member-notes"
                value={memberForm.notes}
                onChange={(e) =>
                  setMemberForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddMemberOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={isCreating}>
                Add Member
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
