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
import { useAccounts, Account } from "@/hooks/useAccounts";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Phone, Merge } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AccountsModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

export function AccountsModule({ onOpenForm, onDelete }: AccountsModuleProps) {
  const navigate = useNavigate();
  const [accountsView, setAccountsView] = useState<"list" | "kanban">("list");
  const [accountsSearch, setAccountsSearch] = useState("");
  const [accountsTypeFilter, setAccountsTypeFilter] = useState<string>("all");
  const [accountsStatusFilter, setAccountsStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeAccountIds, setMergeAccountIds] = useState<string[]>([]);
  const accounts = useAccounts({
    page,
    pageSize,
    search: accountsSearch,
    type: accountsTypeFilter,
    status: accountsStatusFilter,
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setAccountsSearch(e.target.value);
  }, []);
  const filteredAccounts = accounts.accounts || [];

  const bulkEditFields: BulkEditField[] = [
    {
      name: "type",
      label: "Account Type",
      type: "select",
      options: [
        { value: "Customer", label: "Customer" },
        { value: "Prospect", label: "Prospect" },
        { value: "Vendor", label: "Vendor" },
        { value: "Partner", label: "Partner" },
        { value: "Competitor", label: "Competitor" },
      ],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Active", label: "Active" },
        { value: "Inactive", label: "Inactive" },
        { value: "Prospect", label: "Prospect" },
      ],
    },
    {
      name: "industry",
      label: "Industry",
      type: "text",
      placeholder: "Enter industry",
    },
    {
      name: "phone",
      label: "Phone",
      type: "text",
      placeholder: "Enter phone number",
    },
  ];

  const handleBulkEdit = useCallback((ids: string[]) => {
    setSelectedAccountIds(ids);
    setBulkEditOpen(true);
  }, []);

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedAccountIds.map((id) =>
          accounts.updateAccount({ account_id: id, ...values })
        )
      );
      toast.success(`Updated ${selectedAccountIds.length} organizations`);
      setBulkEditOpen(false);
      setSelectedAccountIds([]);
    } catch (error) {
      toast.error("Failed to update organizations");
    }
  };

  const handleMerge = useCallback((ids: string[]) => {
    if (ids.length < 2) {
      toast.error("Please select at least 2 organizations to merge");
      return;
    }
    setMergeAccountIds(ids);
    setMergeOpen(true);
  }, []);

  const handleMergeSave = async (masterId: string, mergedData: Partial<Account>) => {
    try {
      const duplicateIds = mergeAccountIds.filter(id => id !== masterId);

      // Update master account with merged data
      await accounts.updateAccount({ account_id: masterId, ...mergedData });

      // Update all related records to point to master account
      await Promise.all([
        supabase.from('contact').update({ account_id: masterId }).in('account_id', duplicateIds),
        supabase.from('opportunity').update({ account_id: masterId }).in('account_id', duplicateIds),
        supabase.from('contract').update({ account_id: masterId }).in('account_id', duplicateIds),
        supabase.from('activity').update({ account_id: masterId }).in('account_id', duplicateIds),
        supabase.from('support_case').update({ account_id: masterId }).in('account_id', duplicateIds),
        
        supabase.from('invoice').update({ account_id: masterId }).in('account_id', duplicateIds),
      ]);

      // Delete duplicate accounts
      await Promise.all(
        duplicateIds.map(id => accounts.deleteAccount(id))
      );

      toast.success(`Merged ${duplicateIds.length + 1} organizations successfully`);
      setMergeOpen(false);
      setMergeAccountIds([]);
    } catch (error) {
      console.error('Merge error:', error);
      toast.error("Failed to merge organizations");
    }
  };

  const mergeAccounts = useMemo(() => {
    return accounts.accounts?.filter(a => mergeAccountIds.includes(a.account_id)) || [];
  }, [accounts.accounts, mergeAccountIds]);

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <ViewToggle view={accountsView} onViewChange={setAccountsView} />
          <div className="flex w-full sm:w-auto gap-2">
            <Button variant="outline" onClick={() => navigate("/views/accounts")} size="default" className="w-full sm:w-auto">
              Open List Builder
            </Button>
            <Button onClick={() => onOpenForm("accounts")} size="default" className="gap-2 shadow-sm w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Organization
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search organizations..."
            value={accountsSearch}
            onChange={handleSearchChange}
            className="w-full sm:max-w-sm"
          />
          <Select value={accountsTypeFilter} onValueChange={(v) => { setAccountsTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Customer">Customer</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
              <SelectItem value="Vendor">Vendor</SelectItem>
              <SelectItem value="Partner">Partner</SelectItem>
              <SelectItem value="Competitor">Competitor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={accountsStatusFilter} onValueChange={(v) => { setAccountsStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {accountsView === "list" ? (
        <CRMTable
          data={filteredAccounts}
          columns={[
            { header: "Org Name", accessor: "name" },
            { header: "Org Record Type", accessor: "org_record_type" },
            { header: "Org Type", accessor: "org_type" },
            { header: "Physical State/Prov", accessor: (item: any) => {
              // Extract state/province from physical address
              const addr = item.physical_address || "";
              const parts = addr.split(/[,\n]/);
              return parts.length > 1 ? parts[parts.length - 2]?.trim() : "-";
            }},
            { header: "Association", accessor: (item: any) => {
              // Resolve association ID to account name
              if (!item.association) return "-";
              const associatedAccount = filteredAccounts.find(acc => acc.account_id === item.association);
              return associatedAccount?.name || item.association;
            }},
            { header: "Contract Status", accessor: "contract_status" },
            { header: "Created Date", accessor: (item: any) => item.created_at ? format(new Date(item.created_at), "M/d/yyyy, h:mm a") : "-" },
            { header: "Org Owner", accessor: (item: any) => item.owner_user_id ? "Owner" : "-" },
          ]}
          onEdit={(item) => onOpenForm("accounts", item)}
          onDelete={(id) => onDelete("accounts", id)}
          onBulkDelete={(ids) => ids.forEach(id => accounts.deleteAccount(id))}
          onBulkEdit={handleBulkEdit}
          onBulkMerge={handleMerge}
          onRecordClick={(id) => navigate(`/crm/accounts/${id}`)}
          isLoading={accounts.isLoading || accounts.isFetching}
          idField="account_id"
          manualPagination
          page={page}
          pageSize={pageSize}
          totalRows={accounts.totalRows}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      ) : (
        <GenericKanban
          items={filteredAccounts.map(acc => ({ ...acc, id: acc.account_id }))}
          columns={[
            { id: "Active", title: "Active", color: "bg-success/10 text-success border-success/20" },
            { id: "Inactive", title: "Inactive", color: "bg-muted text-muted-foreground border-border" },
            { id: "Prospect", title: "Prospect", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
          ]}
          onEdit={(item) => onOpenForm("accounts", accounts.accounts?.find(a => a.account_id === item.id))}
          onDelete={(id) => onDelete("accounts", id)}
          onStatusChange={(id, newStatus) => {
            accounts.updateAccount({ account_id: id, status: newStatus });
          }}
          renderCard={(item) => (
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <Badge variant="outline" className="text-xs">{item.status}</Badge>
                {item.type && <Badge variant="secondary" className="text-xs">{item.type}</Badge>}
              </div>
              <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
              {item.industry && (
                <p className="text-xs text-muted-foreground line-clamp-1">{item.industry}</p>
              )}
              {(item.phone || item.website) && (
                <div className="space-y-1">
                  {item.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="line-clamp-1">{item.phone}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>{item.account_number || 'N/A'}</span>
                {item.created_at && (
                  <span>{format(new Date(item.created_at), "MMM d")}</span>
                )}
              </div>
            </div>
          )}
        />
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Organizations"
        description="Update {count} selected organizations. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedAccountIds.length}
        onSave={handleBulkEditSave}
        isLoading={accounts.isLoading}
      />

      <MergeRecordsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        records={mergeAccounts}
        idField="account_id"
        displayNameField="name"
        fields={[
          { key: "name", label: "Organization Name" },
          { key: "account_number", label: "Account Number" },
          { key: "type", label: "Type" },
          { key: "industry", label: "Industry" },
          { key: "status", label: "Status" },
          { key: "phone", label: "Phone" },
          { key: "website", label: "Website" },
          { key: "billing_email", label: "Billing Email" },
          { key: "billing_address", label: "Billing Address" },
        ]}
        onMerge={handleMergeSave}
        isLoading={accounts.isLoading}
      />
    </div>
  );
}
