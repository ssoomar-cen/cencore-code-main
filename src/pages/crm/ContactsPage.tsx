import { useState, useEffect, useMemo, useCallback } from "react";
import { useContacts, useContactsList } from "@/hooks/useContacts";
import { useAccounts } from "@/hooks/useAccounts";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useActivities, useConnections, useCredentials } from "@/hooks/useCrmEntities";
import { useOutlookContacts, OutlookContact } from "@/hooks/useOutlookContacts";
import { usePicklistSelectOptions } from "@/hooks/usePicklistOptions";
import { CrmDataTable, Column, FormField } from "@/components/crm/CrmDataTable";
import { FilterConfig } from "@/components/crm/CrmToolbar";
import { RelatedTab, LookupLink } from "@/components/crm/CrmRecordDetail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Download, Upload, Users, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 250;

const columns: Column[] = [
  { key: "first_name", label: "First Name" },
  { key: "last_name", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "job_title", label: "Job Title" },
  { key: "contact_type", label: "Type" },
  { key: "accounts", label: "Organization", render: (v) => v?.name || "—" },
  { key: "status", label: "Status", render: (v) => <Badge variant={v === "active" ? "default" : "secondary"}>{v}</Badge> },
];

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showOutlookPanel, setShowOutlookPanel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: listResult, isLoading } = useContactsList({ search: debouncedSearch, page, limit: PAGE_SIZE });

  const { data, create, update, remove } = useContacts();
  const { data: accounts } = useAccounts();
  const { data: opportunities, create: createOpp } = useOpportunities();
  const { data: activities, create: createActivity } = useActivities();
  const { data: connections } = useConnections();
  const { data: credentials, create: createCredential } = useCredentials();
  const { outlookContacts, loadingContacts, refetchContacts, importContact, pushToOutlook, isM365Configured } = useOutlookContacts();

  const { options: contactTypeOptions } = usePicklistSelectOptions("contacts", "contact_type");
  const { options: statusOptions } = usePicklistSelectOptions("contacts", "status");
  const { options: mcStatusOptions } = usePicklistSelectOptions("contacts", "mc_status");
  const { options: mcRecruitmentStageOptions } = usePicklistSelectOptions("contacts", "mc_recruitment_stage");
  const { options: mcTypeOptions } = usePicklistSelectOptions("contacts", "mc_type");

  const filters: FilterConfig[] = useMemo(() => [
    { key: "status", label: "Status", options: statusOptions },
    { key: "contact_type", label: "Contact Type", options: contactTypeOptions },
  ], [statusOptions, contactTypeOptions]);

  const formFields: FormField[] = useMemo(() => [
    // Contact Information
    { key: "contact_type", label: "Contact Type", type: "select", section: "Contact Information", options: contactTypeOptions },
    { key: "sales_role", label: "Sales Role", section: "Contact Information" },
    { key: "first_name", label: "First Name", required: true, section: "Contact Information" },
    { key: "phone", label: "Phone", section: "Contact Information" },
    { key: "last_name", label: "Last Name", required: true, section: "Contact Information" },
    { key: "email", label: "Email", type: "email", section: "Contact Information" },
    { key: "goes_by", label: "Goes By", section: "Contact Information" },
    { key: "personal_email", label: "Personal Email", type: "email", section: "Contact Information" },
    { key: "job_title", label: "Title", section: "Contact Information" },
    { key: "additional_email", label: "Additional Email", type: "email", section: "Contact Information" },
    { key: "account_id", label: "Org Name", type: "select", section: "Contact Information", options: (accounts || []).map((a) => ({ label: a.name, value: a.id })) },
    { key: "mobile", label: "Mobile", section: "Contact Information" },
    { key: "association", label: "Association", section: "Contact Information" },
    { key: "fax", label: "Fax", section: "Contact Information" },
    { key: "asst_email", label: "Asst Email", type: "email", section: "Contact Information" },
    { key: "department", label: "Department", section: "Contact Information" },
    { key: "commission_split_total", label: "Commission Split Total", type: "number", section: "Contact Information" },
    { key: "mc_commission", label: "MC Commission", section: "Contact Information" },
    { key: "mc_status", label: "MC Status", type: "select", section: "Contact Information", options: mcStatusOptions },
    { key: "status", label: "Status", type: "select", section: "Contact Information", options: statusOptions },

    // MC Recruiting
    { key: "mc_recruitment_stage", label: "MC Recruitment Stage", type: "select", section: "MC Recruiting", options: mcRecruitmentStageOptions },
    { key: "mc_orientation_date", label: "MC Orientation Date", type: "date", section: "MC Recruiting" },
    { key: "mc_rating", label: "MC Rating", section: "MC Recruiting" },
    { key: "mc_assigned_state", label: "MC Assigned State", section: "MC Recruiting" },
    { key: "mc_start_date", label: "MC Start Date", type: "date", section: "MC Recruiting" },
    { key: "mc_compensation_plan", label: "MC Compensation Plan", section: "MC Recruiting" },
    { key: "mc_type", label: "MC Type", type: "select", section: "MC Recruiting", options: mcTypeOptions },
    { key: "mc_comments", label: "MC Comments", type: "textarea", section: "MC Recruiting" },
    { key: "mc_recruiter", label: "MC Recruiter", type: "select", section: "MC Recruiting", options: [
      { label: "Yes", value: "true" }, { label: "No", value: "false" },
    ]},
    { key: "reports_to", label: "Reports To", section: "MC Recruiting" },
    { key: "mc_management_notes", label: "MC Management Notes", type: "textarea", section: "MC Recruiting" },

    // Commission & Quota Info
    { key: "contact_number", label: "Contact Number", section: "Commission & Quota Info" },
    { key: "actual_from_goals", label: "Actual from Goals", type: "number", section: "Commission & Quota Info" },
    { key: "recruiter_commission", label: "Recruiter Commission", type: "number", section: "Commission & Quota Info" },
    { key: "quota_over_goals", label: "Quota Over Goals", type: "number", section: "Commission & Quota Info" },
    { key: "internal_search_owner", label: "Internal Search Owner", section: "Commission & Quota Info" },
    { key: "amount_over_quota", label: "Amount Over Quota", type: "number", section: "Commission & Quota Info" },
    { key: "recruited_by", label: "Recruited By", section: "Commission & Quota Info" },
    { key: "dallas_visit_date", label: "Dallas Visit Date", type: "date", section: "Commission & Quota Info" },
    { key: "agreement_notes", label: "Agreement Notes", type: "textarea", section: "Commission & Quota Info" },
    { key: "commission_notes", label: "Commission Notes", type: "textarea", section: "Commission & Quota Info" },

    // Address Information
    { key: "address_street", label: "Mailing Street", section: "Address Information" },
    { key: "home_address_street", label: "Home Street", section: "Address Information" },
    { key: "address_city", label: "Mailing City", section: "Address Information" },
    { key: "home_address_city", label: "Home City", section: "Address Information" },
    { key: "address_state", label: "Mailing State", section: "Address Information" },
    { key: "home_address_state", label: "Home State", section: "Address Information" },
    { key: "address_zip", label: "Mailing ZIP", section: "Address Information" },
    { key: "home_address_zip", label: "Home ZIP", section: "Address Information" },

    // Ad hoc Notes / Description
    { key: "description", label: "Description", type: "textarea", section: "Notes" },
    { key: "employee_id", label: "Employee ID", section: "Notes" },
    { key: "notes", label: "Notes", type: "textarea", section: "Notes" },
  ], [accounts, contactTypeOptions, statusOptions, mcStatusOptions, mcRecruitmentStageOptions, mcTypeOptions]);

  const lookupLinks: LookupLink[] = useMemo(() => [
    { key: "account_id", route: "/crm/accounts", data: accounts || [], labelFn: (a) => a.name },
  ], [accounts]);

  const loadContactDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/contacts/${id}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  }, []);

  const relatedTabs: RelatedTab[] = useMemo(() => [
    {
      key: "opportunities", label: "Opportunities", foreignKey: ["contact_id", "primary_contact_id"], panel: "left" as const,
      route: "/crm/opportunities", data: opportunities || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "stage", label: "Stage", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "amount", label: "Amount", render: (v: any) => v ? `$${Number(v).toLocaleString()}` : "—" },
      ],
      createFields: [
        { key: "contact_id", label: "Contact", type: "text" },
        { key: "name", label: "Opportunity Name", required: true },
        { key: "stage", label: "Stage", type: "select", options: [
          { label: "Prospecting", value: "prospecting" }, { label: "Qualification", value: "qualification" },
        ]},
        { key: "amount", label: "Amount", type: "number" },
      ],
      onCreate: (d: any) => createOpp.mutate(d),
    },
    {
      key: "credentials", label: "Credentials", foreignKey: "contact_id", panel: "left" as const,
      data: credentials || [],
      columns: [
        { key: "name", label: "Name" },
        { key: "credential_type", label: "Type" },
        { key: "status", label: "Status", render: (v: any) => <Badge variant="outline">{v || "—"}</Badge> },
        { key: "valid_to", label: "Valid To" },
      ],
      createFields: [
        { key: "contact_id", label: "Contact", type: "text" },
        { key: "name", label: "Credential Name" },
        { key: "credential_type", label: "Type" },
        { key: "credential_number", label: "Number" },
        { key: "certified_date", label: "Certified Date", type: "date" },
        { key: "valid_to", label: "Valid To", type: "date" },
      ],
      onCreate: (d: any) => createCredential.mutate(d),
    },
    {
      key: "connections", label: "Connections", foreignKey: "contact_id", panel: "right" as const,
      route: "/crm/connections", data: connections || [],
      columns: [
        { key: "connected_contact", label: "Connected To", render: (_v: any, row: any) => row.connected_contact ? `${row.connected_contact.first_name} ${row.connected_contact.last_name}` : "—" },
        { key: "relationship_type", label: "Relationship" },
      ],
    },
    {
      key: "activities", label: "Activities", foreignKey: "contact_id", panel: "right" as const,
      route: "/crm/activities", data: activities || [],
      columns: [
        { key: "subject", label: "Subject" },
        { key: "activity_type", label: "Type", render: (v: any) => <Badge variant="outline">{v}</Badge> },
        { key: "status", label: "Status" },
        { key: "due_date", label: "Due", render: (v: any) => v ? new Date(v).toLocaleDateString() : "—" },
      ],
      createFields: [
        { key: "contact_id", label: "Contact", type: "text" },
        { key: "subject", label: "Subject", required: true },
        { key: "activity_type", label: "Type", type: "select", options: [
          { label: "Task", value: "task" }, { label: "Call", value: "call" },
          { label: "Email", value: "email" }, { label: "Meeting", value: "meeting" },
        ]},
        { key: "due_date", label: "Due Date", type: "date" },
      ],
      onCreate: (d: any) => createActivity.mutate(d),
    },
  ], [opportunities, connections, activities, credentials, createOpp, createActivity, createCredential]);


  const handlePushToOutlook = (contact: any) => {
    pushToOutlook.mutate({
      firstName: contact.first_name, lastName: contact.last_name,
      email: contact.email || undefined, phone: contact.phone || undefined,
      mobile: contact.mobile || undefined, jobTitle: contact.job_title || undefined,
      company: contact.accounts?.name || undefined, department: contact.department || undefined,
    });
  };

  const handleImport = (oc: OutlookContact) => {
    const primaryEmail = oc.emailAddresses?.[0]?.address;
    if (primaryEmail && data?.some((c) => c.email?.toLowerCase() === primaryEmail.toLowerCase())) {
      toast.info("Contact with this email already exists in CRM");
      return;
    }
    importContact.mutate(oc);
  };

  const extraActions = isM365Configured ? (
    <Button variant="outline" size="sm" className="h-9" onClick={() => setShowOutlookPanel(true)}>
      <Download className="h-4 w-4 mr-1" /> Import from Outlook
    </Button>
  ) : null;

  return (
    <>
      <CrmDataTable
        title="Contacts"
        description="Manage your contacts"
        entityLabel="Contact"
        columns={columns}
        data={listResult?.data || []}
        detailData={data || []}
        loadDetailRecord={loadContactDetail}
        isLoading={isLoading}
        formFields={formFields}
        onCreate={(d) => create.mutate(d)}
        onUpdate={(d) => update.mutate(d)}
        onDelete={(id) => remove.mutate(id)}
        createLabel="Add Contact"
        extraActions={extraActions}
        filters={filters}
        lookupLinks={lookupLinks}
        headerFields={[
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "job_title", label: "Title" },
          { key: "account_id", label: "Organization" },
          { key: "contact_type", label: "Type" },
          { key: "status", label: "Status" },
        ]}
        relatedTabs={relatedTabs}
        serverSide={{
          search,
          onSearchChange: setSearch,
          page,
          pageSize: PAGE_SIZE,
          total: listResult?.total ?? 0,
          onPageChange: setPage,
        }}
        rowActions={isM365Configured ? (row: any) => (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handlePushToOutlook(row); }} title="Sync to Outlook">
            <Upload className="h-4 w-4" />
          </Button>
        ) : undefined}
      />

      <Dialog open={showOutlookPanel} onOpenChange={setShowOutlookPanel}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Outlook Contacts</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{outlookContacts.length} contacts found in Outlook</p>
            <Button variant="outline" size="sm" onClick={() => refetchContacts()} disabled={loadingContacts}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loadingContacts ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
          <ScrollArea className="h-[50vh]">
            <div className="space-y-2">
              {loadingContacts ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading Outlook contacts...</p>
              ) : outlookContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No contacts found in Outlook</p>
              ) : (
                outlookContacts.map((oc) => {
                  const primaryEmail = oc.emailAddresses?.[0]?.address;
                  const alreadyExists = primaryEmail && data?.some((c) => c.email?.toLowerCase() === primaryEmail.toLowerCase());
                  return (
                    <Card key={oc.id} className="p-0">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {oc.displayName || `${oc.givenName || ""} ${oc.surname || ""}`.trim() || "Unknown"}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                            {primaryEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {primaryEmail}</span>}
                            {oc.businessPhones?.[0] && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {oc.businessPhones[0]}</span>}
                            {oc.companyName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {oc.companyName}</span>}
                          </div>
                        </div>
                        <Button variant={alreadyExists ? "ghost" : "outline"} size="sm"
                          disabled={!!alreadyExists || importContact.isPending} onClick={() => handleImport(oc)} className="ml-2 shrink-0">
                          {alreadyExists ? "Exists" : "Import"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
