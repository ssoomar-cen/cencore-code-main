import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewToggle } from "./ViewToggle";
import { CRMTable } from "./CRMTable";
import { GenericKanban } from "./GenericKanban";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import { MergeRecordsDialog } from "@/components/ui/merge-records-dialog";
import { useContacts } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Mail, Phone, User, Merge } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface ContactsModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

export function ContactsModule({ onOpenForm, onDelete }: ContactsModuleProps) {
  const navigate = useNavigate();
  const [contactsView, setContactsView] = useState<"list" | "kanban">("list");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contactsIsPrimaryFilter, setContactsIsPrimaryFilter] = useState<string>("all");
  const [contactsIsActiveFilter, setContactsIsActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeContactIds, setMergeContactIds] = useState<string[]>([]);
  const contacts = useContacts({
    page,
    pageSize,
    search: contactsSearch,
    isPrimary: contactsIsPrimaryFilter as "all" | "primary" | "not-primary",
    isActive: contactsIsActiveFilter as "all" | "active" | "inactive",
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setContactsSearch(e.target.value);
  }, []);
  const filteredContacts = contacts.contacts || [];

  const bulkEditFields: BulkEditField[] = [
    {
      name: "title",
      label: "Title",
      type: "text",
      placeholder: "Enter title",
    },
    {
      name: "phone",
      label: "Phone",
      type: "text",
      placeholder: "Enter phone number",
    },
    {
      name: "is_primary",
      label: "Primary Contact",
      type: "select",
      options: [
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
    {
      name: "is_active",
      label: "Active",
      type: "select",
      options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Inactive" },
      ],
    },
  ];

  const handleBulkEdit = useCallback((ids: string[]) => {
    setSelectedContactIds(ids);
    setBulkEditOpen(true);
  }, []);

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      const updates = { ...values };
      if (updates.is_primary) updates.is_primary = updates.is_primary === "true";
      if (updates.is_active) updates.is_active = updates.is_active === "true";

      await Promise.all(
        selectedContactIds.map((id) =>
          contacts.updateContact({ contact_id: id, ...updates })
        )
      );
      toast.success(`Updated ${selectedContactIds.length} contacts`);
      setBulkEditOpen(false);
      setSelectedContactIds([]);
    } catch (error) {
      toast.error("Failed to update contacts");
    }
  };

  const handleMerge = useCallback((ids: string[]) => {
    if (ids.length < 2) {
      toast.error("Please select at least 2 contacts to merge");
      return;
    }
    setMergeContactIds(ids);
    setMergeOpen(true);
  }, []);

  const handleMergeSave = async (masterId: string, mergedData: any) => {
    try {
      const duplicateIds = mergeContactIds.filter(id => id !== masterId);

      // Update master contact with merged data
      await contacts.updateContact({ contact_id: masterId, ...mergedData });

      // Update all related records to point to master contact
      await Promise.all([
        supabase.from('opportunity').update({ primary_contact_id: masterId }).in('primary_contact_id', duplicateIds),
        supabase.from('activity').update({ contact_id: masterId }).in('contact_id', duplicateIds),
      ]);

      // Delete duplicate contacts
      await Promise.all(
        duplicateIds.map(id => contacts.deleteContact(id))
      );

      toast.success(`Merged ${duplicateIds.length + 1} contacts successfully`);
      setMergeOpen(false);
      setMergeContactIds([]);
    } catch (error) {
      console.error('Merge error:', error);
      toast.error("Failed to merge contacts");
    }
  };

  const mergeContacts = useMemo(() => {
    return contacts.contacts?.filter(c => mergeContactIds.includes(c.contact_id)) || [];
  }, [contacts.contacts, mergeContactIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground mt-1">Manage people and relationships</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search contacts..."
          value={contactsSearch}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <Select value={contactsIsPrimaryFilter} onValueChange={(v) => { setContactsIsPrimaryFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by primary" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            <SelectItem value="primary">Primary Only</SelectItem>
            <SelectItem value="not-primary">Not Primary</SelectItem>
          </SelectContent>
        </Select>
        <Select value={contactsIsActiveFilter} onValueChange={(v) => { setContactsIsActiveFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by active" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ViewToggle view={contactsView} onViewChange={setContactsView} />
          <Button onClick={() => onOpenForm("contacts")} size="default" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add Contact
          </Button>
        </div>
      </div>

      {contactsView === "list" ? (
        <CRMTable
          data={filteredContacts}
          columns={[
            { header: "First Name", accessor: "first_name" },
            { header: "Last Name", accessor: "last_name" },
            { header: "Email", accessor: "email" },
            { header: "Phone", accessor: "phone" },
            { header: "Title", accessor: "title" },
            { header: "Account", accessor: (item: any) => item.account?.name || "N/A" },
            { header: "Primary", accessor: (item: any) => item.is_primary ? "Yes" : "No" },
            { header: "Created", accessor: (item: any) => formatDate(item.created_at) },
          ]}
          onEdit={(item) => onOpenForm("contacts", item)}
          onDelete={(id) => onDelete("contacts", id)}
          onBulkDelete={(ids) => ids.forEach(id => contacts.deleteContact(id))}
          onBulkEdit={handleBulkEdit}
          onBulkMerge={handleMerge}
          onRecordClick={(id) => navigate(`/crm/contacts/${id}`)}
          isLoading={contacts.isLoading || contacts.isFetching}
          idField="contact_id"
          manualPagination
          page={page}
          pageSize={pageSize}
          totalRows={contacts.totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      ) : (
        <GenericKanban
          items={filteredContacts.map(c => ({ ...c, id: c.contact_id, status: c.is_active ? "Active" : "Inactive" }))}
          columns={[
            { id: "Active", title: "Active", color: "bg-success/10 text-success border-success/20" },
            { id: "Inactive", title: "Inactive", color: "bg-muted text-muted-foreground border-border" },
          ]}
          onEdit={(item) => onOpenForm("contacts", contacts.contacts?.find(c => c.contact_id === item.id))}
          onDelete={(id) => onDelete("contacts", id)}
          onStatusChange={(id, newStatus) => {
            contacts.updateContact({ contact_id: id, is_active: newStatus === "Active" });
          }}
          renderCard={(item) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1">
                    {item.first_name} {item.last_name}
                  </h4>
                  {item.title && <p className="text-xs text-muted-foreground line-clamp-1">{item.title}</p>}
                </div>
              </div>
              {item.account?.name && (
                <p className="text-xs font-medium text-muted-foreground">{item.account.name}</p>
              )}
              {(item.email || item.phone) && (
                <div className="space-y-1">
                  {item.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="line-clamp-1">{item.email}</span>
                    </div>
                  )}
                  {item.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="line-clamp-1">{item.phone}</span>
                    </div>
                  )}
                </div>
              )}
              {item.is_primary && (
                <Badge variant="secondary" className="text-xs">Primary Contact</Badge>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{item.contact_number || 'N/A'}</span>
                {item.created_at && (
                  <span>{formatDate(item.created_at)}</span>
                )}
              </div>
            </div>
          )}
        />
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Contacts"
        description="Update {count} selected contacts. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedContactIds.length}
        onSave={handleBulkEditSave}
        isLoading={contacts.isLoading}
      />

      <MergeRecordsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        records={mergeContacts}
        idField="contact_id"
        displayNameField={(contact) => `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown'}
        fields={[
          { key: "first_name", label: "First Name" },
          { key: "last_name", label: "Last Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          { key: "title", label: "Title" },
          { 
            key: "is_primary", 
            label: "Primary Contact",
            render: (value) => value ? "Yes" : "No"
          },
          { 
            key: "is_active", 
            label: "Active Status",
            render: (value) => value ? "Active" : "Inactive"
          },
        ]}
        onMerge={handleMergeSave}
        isLoading={contacts.isLoading}
      />
    </div>
  );
}
