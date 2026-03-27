import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewToggle } from "./ViewToggle";
import { GenericKanban } from "./GenericKanban";
import { BulkEditDialog, BulkEditField } from "@/components/ui/bulk-edit-dialog";
import { useQuotes } from "@/hooks/useQuotes";
import { Plus, DollarSign, FileText, ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface QuotesModuleProps {
  onOpenForm: (type: string, data?: any) => void;
  onDelete: (type: string, id: string) => void;
}

type SortField = string;
type SortDirection = "asc" | "desc" | null;

export function QuotesModule({ onOpenForm, onDelete }: QuotesModuleProps) {
  const navigate = useNavigate();
  const [quotesView, setQuotesView] = useState<"list" | "kanban">("list");
  const [quotesSearch, setQuotesSearch] = useState("");
  const [quotesStatusFilter, setQuotesStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const quotes = useQuotes({
    page,
    pageSize,
    search: quotesSearch,
    status: quotesStatusFilter,
  });

  // Sorting state
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPage(1);
    setQuotesSearch(e.target.value);
  }, []);

  const filteredQuotes = useMemo(() => {
    return (quotes.quotes || []).filter((quote) => {
      const matchesSearch = quote.quote_number.toLowerCase().includes(quotesSearch.toLowerCase()) ||
        (quote.opportunity?.name && quote.opportunity.name.toLowerCase().includes(quotesSearch.toLowerCase()));
      const matchesStatus = quotesStatusFilter === "all" || quote.status === quotesStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotes.quotes, quotesSearch, quotesStatusFilter]);

  // Sort quotes
  const sortedQuotes = useMemo(() => {
    return [...filteredQuotes].sort((a, b) => {
      if (!sortDirection) return 0;

      let aVal: any, bVal: any;

      switch (sortField) {
        case "quote_number":
          aVal = a.quote_number;
          bVal = b.quote_number;
          break;
        case "opportunity":
          aVal = a.opportunity?.name || "";
          bVal = b.opportunity?.name || "";
          break;
        case "account":
          aVal = a.opportunity?.account?.name || "";
          bVal = b.opportunity?.account?.name || "";
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        case "total_amount":
          aVal = Number(a.total_amount || 0);
          bVal = Number(b.total_amount || 0);
          break;
        case "valid_until":
          aVal = a.valid_until ? new Date(a.valid_until) : new Date(0);
          bVal = b.valid_until ? new Date(b.valid_until) : new Date(0);
          break;
        case "created_at":
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredQuotes, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(
        sortDirection === "asc" ? "desc" : sortDirection === "desc" ? null : "asc"
      );
      if (sortDirection === "desc") {
        setSortField("created_at");
        setSortDirection("desc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    if (sortDirection === "asc") return <ArrowUp className="h-4 w-4 ml-1" />;
    if (sortDirection === "desc") return <ArrowDown className="h-4 w-4 ml-1" />;
    return <ArrowUpDown className="h-4 w-4 ml-1" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Accepted":
        return "bg-success/10 text-success border-success/20";
      case "Sent":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Rejected":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "Draft":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const handleSelectAllQuotes = (checked: boolean) => {
    if (checked && sortedQuotes) {
      setSelectedQuoteIds(sortedQuotes.map((q) => q.quote_id));
    } else {
      setSelectedQuoteIds([]);
    }
  };

  const handleSelectQuote = (quoteId: string, checked: boolean) => {
    if (checked) {
      setSelectedQuoteIds([...selectedQuoteIds, quoteId]);
    } else {
      setSelectedQuoteIds(selectedQuoteIds.filter(id => id !== quoteId));
    }
  };

  const bulkEditFields: BulkEditField[] = [
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Draft", label: "Draft" },
        { value: "Sent", label: "Sent" },
        { value: "Accepted", label: "Accepted" },
        { value: "Rejected", label: "Rejected" },
      ],
    },
  ];

  const handleBulkEdit = () => {
    if (selectedQuoteIds.length === 0) return;
    setBulkEditOpen(true);
  };

  const handleBulkEditSave = async (values: Record<string, any>) => {
    try {
      await Promise.all(
        selectedQuoteIds.map((id) =>
          quotes.updateQuote({ quote_id: id, ...values })
        )
      );
      toast.success(`Updated ${selectedQuoteIds.length} quotes`);
      setBulkEditOpen(false);
      setSelectedQuoteIds([]);
    } catch (error) {
      toast.error("Failed to update quotes");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuoteIds.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedQuoteIds.length} quote(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedQuoteIds.map((id) => quotes.deleteQuote(id))
      );
      toast.success(`Deleted ${selectedQuoteIds.length} quotes`);
      setSelectedQuoteIds([]);
    } catch (error) {
      toast.error("Failed to delete quotes");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quotes</h1>
        <p className="text-muted-foreground mt-1">Manage quote pricing and approvals</p>
      </div>

      {/* Search, filters, and actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search quotes..."
          value={quotesSearch}
          onChange={handleSearchChange}
          className="w-[200px]"
        />
        <Select value={quotesStatusFilter} onValueChange={(v) => { setQuotesStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Sent">Sent</SelectItem>
            <SelectItem value="Accepted">Accepted</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <ViewToggle view={quotesView} onViewChange={setQuotesView} />
          <Button onClick={() => onOpenForm("quotes")} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Quote
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedQuoteIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedQuoteIds.length} quote(s) selected
          </span>
          <Button onClick={handleBulkEdit} variant="outline" size="sm">
            Edit Selected
          </Button>
          <Button
            onClick={handleBulkDelete}
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      )}

      {quotesView === "list" ? (
        /* Quotes Table */
        <div className="border rounded-lg max-h-[calc(100vh-20rem)] overflow-y-auto overflow-x-auto">
          <table className="w-full caption-bottom text-sm border-collapse">
            <thead className="sticky top-0 z-20 bg-background">
              <tr className="bg-background border-b">
                <th className="sticky top-0 left-0 z-30 w-12 bg-background h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Checkbox
                    checked={selectedQuoteIds.length === sortedQuotes.length && sortedQuotes.length > 0}
                    onCheckedChange={handleSelectAllQuotes}
                  />
                </th>
                <th 
                  className="sticky top-0 left-12 z-30 bg-background cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("quote_number")}
                >
                  <div className="flex items-center">
                    Quote #
                    {getSortIcon("quote_number")}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-background cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("opportunity")}
                >
                  <div className="flex items-center">
                    Opportunity
                    {getSortIcon("opportunity")}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-background cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("account")}
                >
                  <div className="flex items-center">
                    Organization
                    {getSortIcon("account")}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-background cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status
                    {getSortIcon("status")}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-background text-right cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("total_amount")}
                >
                  <div className="flex items-center justify-end">
                    Amount
                    {getSortIcon("total_amount")}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-background cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("valid_until")}
                >
                  <div className="flex items-center">
                    Valid Until
                    {getSortIcon("valid_until")}
                  </div>
                </th>
                <th 
                  className="sticky top-0 z-20 bg-background cursor-pointer select-none hover:bg-muted/50 h-9 px-2.5 text-left align-middle text-xs font-medium text-muted-foreground uppercase tracking-wide"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center">
                    Created
                    {getSortIcon("created_at")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.isLoading || quotes.isFetching ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading quotes...
                  </td>
                </tr>
              ) : sortedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No quotes found
                  </td>
                </tr>
              ) : (
                sortedQuotes.map((quote) => (
                  <tr 
                    key={quote.quote_id} 
                    className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/crm/quotes/${quote.quote_id}`)}
                  >
                    <td className="sticky left-0 z-20 bg-background px-2.5 py-2 align-middle text-sm" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedQuoteIds.includes(quote.quote_id)}
                        onCheckedChange={(checked) => handleSelectQuote(quote.quote_id, checked as boolean)}
                      />
                    </td>
                    <td className="sticky left-12 z-20 bg-background px-2.5 py-2 align-middle text-sm font-medium text-primary hover:underline">{quote.quote_number}</td>
                    <td className="px-2.5 py-2 align-middle text-sm">{quote.opportunity?.name || "N/A"}</td>
                    <td className="px-2.5 py-2 align-middle text-sm">{quote.opportunity?.account?.name || "N/A"}</td>
                    <td className="px-2.5 py-2 align-middle text-sm">
                      <Badge variant="outline" className={getStatusColor(quote.status || "Draft")}>
                        {quote.status || "Draft"}
                      </Badge>
                    </td>
                    <td className="px-2.5 py-2 align-middle text-sm text-right font-medium">
                      {quote.total_amount ? `$${quote.total_amount.toLocaleString()}` : "N/A"}
                    </td>
                    <td className="px-2.5 py-2 align-middle text-sm">
                      {quote.valid_until ? format(new Date(quote.valid_until), "MMM d, yyyy") : "N/A"}
                    </td>
                    <td className="px-2.5 py-2 align-middle text-sm">
                      {quote.created_at ? format(new Date(quote.created_at), "MMM d, yyyy") : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <GenericKanban
          items={sortedQuotes.map(q => ({ ...q, id: q.quote_id }))}
          columns={[
            { id: "Draft", title: "Draft", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
            { id: "Sent", title: "Sent", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
            { id: "Accepted", title: "Accepted", color: "bg-success/10 text-success border-success/20" },
            { id: "Rejected", title: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20" },
          ]}
          onEdit={(item) => onOpenForm("quotes", quotes.quotes?.find(q => q.quote_id === item.id))}
          onDelete={(id) => onDelete("quotes", id)}
          onStatusChange={(id, newStatus) => {
            quotes.updateQuote({ quote_id: id, status: newStatus });
          }}
          renderCard={(item) => (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <Badge variant="outline" className="text-xs">{item.status}</Badge>
              </div>
              <h4 className="font-medium text-sm">{item.quote_number}</h4>
              {item.opportunity?.name && (
                <p className="text-xs text-muted-foreground line-clamp-1">{item.opportunity.name}</p>
              )}
              {item.opportunity?.account?.name && (
                <p className="text-xs font-medium text-muted-foreground line-clamp-1">
                  {item.opportunity.account.name}
                </p>
              )}
              {item.total_amount && (
                <div className="flex items-center gap-1 text-sm font-semibold text-success">
                  <DollarSign className="h-3 w-3" />
                  <span>{item.total_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                {item.created_at && (
                  <span>{format(new Date(item.created_at), "MMM d")}</span>
                )}
                {item.valid_until && (
                  <span>Valid: {format(new Date(item.valid_until), "MMM d")}</span>
                )}
              </div>
            </div>
          )}
        />
      )}
      {quotesView === "list" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {Math.max(1, Math.ceil((quotes.totalRows || 0) / pageSize))} ({(quotes.totalRows || 0).toLocaleString()} quotes)
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25/page</SelectItem>
                <SelectItem value="50">50/page</SelectItem>
                <SelectItem value="100">100/page</SelectItem>
                <SelectItem value="200">200/page</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.max(1, Math.ceil((quotes.totalRows || 0) / pageSize))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title="Edit Multiple Quotes"
        description="Update {count} selected quotes. Only modified fields will be updated."
        fields={bulkEditFields}
        selectedCount={selectedQuoteIds.length}
        onSave={handleBulkEditSave}
        isLoading={quotes.isLoading}
      />
    </div>
  );
}
