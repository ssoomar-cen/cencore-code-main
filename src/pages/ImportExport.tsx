import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, History, FileDown, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ImportHistoryItem {
  id: string;
  entity_type: string;
  file_name: string;
  records_count: number;
  status: "success" | "failed" | "processing";
  operation_type: "import" | "export";
  created_at: string;
  error_message?: string;
}

const ImportExport = () => {
  const [selectedEntity, setSelectedEntity] = useState<string>("accounts");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [salesforceCsvEntity, setSalesforceCsvEntity] = useState<string>("accounts");
  const [salesforceCsvFile, setSalesforceCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingSalesforceCsv, setIsImportingSalesforceCsv] = useState(false);
  const [sfImportResult, setSfImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);

  const entityTypes = [
    { value: "accounts", label: "Organizations" },
    { value: "contacts", label: "Contacts" },
    { value: "opportunities", label: "Opportunities" },
    { value: "quotes", label: "Quotes" },
    { value: "contracts", label: "Contracts" },
    { value: "invoices", label: "Invoices" },
    { value: "activities", label: "Activities" },
    { value: "projects", label: "Energy Programs" },
  ];

  const salesforceCsvEntityTypes = [
    { value: "accounts", label: "Account -> Organizations" },
    { value: "buildings", label: "Building -> Buildings" },
    { value: "commission_splits", label: "Commission_Split -> Commission Splits" },
    { value: "connections", label: "Connection -> Connections" },
    { value: "contacts", label: "Contact -> Contacts" },
    { value: "contracts", label: "Contract -> Contracts" },
    { value: "credentials", label: "Credentials -> Credentials" },
    { value: "email_messages", label: "EmailMessage -> Email Messages" },
    { value: "energy_programs", label: "Energy_Program -> Energy Programs" },
    { value: "events", label: "Event -> Activities/Calendar" },
    { value: "invoice_items", label: "Invoice_Item -> Invoice Items" },
    { value: "invoices", label: "Invoice -> Invoices" },
    { value: "opportunities", label: "Opportunity -> Opportunities" },
    { value: "quotes", label: "Quote -> Quotes" },
    { value: "quote_line_items", label: "QuoteLineItem -> Quote Line Items" },
    { value: "tasks", label: "Task -> Activities/Tasks" },
    { value: "users", label: "User -> Imported Users" },
  ];

  useEffect(() => {
    fetchImportHistory();
  }, []);

  const fetchImportHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("import_export_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setImportHistory((data || []) as ImportHistoryItem[]);
    } catch (error) {
      console.error("Error fetching history:", error);
      toast.error("Failed to load history");
    } finally {
      setLoadingHistory(false);
    }
  };
  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      const { error } = await supabase
        .from("import_export_history")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) throw error;
      setImportHistory([]);
      toast.success("Import/export history cleared");
    } catch (error: any) {
      console.error("Error clearing history:", error);
      toast.error(error.message || "Failed to clear history");
    } finally {
      setIsClearingHistory(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    values.push(current.trim());
    return values;
  };

  const splitCsvRecords = (text: string): string[] => {
    const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const records: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < normalized.length; i++) {
      const ch = normalized[i];
      const next = normalized[i + 1];

      if (ch === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
          continue;
        }
        inQuotes = !inQuotes;
        current += ch;
        continue;
      }

      if (ch === "\n" && !inQuotes) {
        records.push(current);
        current = "";
        continue;
      }

      current += ch;
    }

    if (current.length > 0) records.push(current);
    return records.filter((record, index) => record.trim() || index === 0);
  };

  const parseCSV = (text: string): Record<string, any>[] => {
    const lines = splitCsvRecords(text);
    if (lines.length < 2) {
      throw new Error("CSV file must have headers and at least one data row");
    }

    const headers = parseCSVLine(lines[0]);
    const records: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        console.warn(`Skipping row ${i + 1}: column count mismatch (got ${values.length}, expected ${headers.length})`);
        continue;
      }

      const record: Record<string, any> = {};
      headers.forEach((header, index) => {
        const value = values[index];
        record[header] = value === "" ? null : value;
      });
      records.push(record);
    }

    return records;
  };

  const toCsv = (rows: Record<string, any>[]): string => {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const esc = (value: unknown) => {
      const s = value == null ? "" : String(value);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const body = rows.map((row) => headers.map((h) => esc(row[h])).join(","));
    return [headers.join(","), ...body].join("\n");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];
      
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
        toast.error("Please select a CSV file");
        return;
      }

      setSelectedFile(file);
      toast.success(`File "${file.name}" selected`);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsImporting(true);
    try {
      const text = await selectedFile.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        throw new Error("No valid records found in file");
      }

      console.log(`Parsed ${records.length} records from CSV`);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("import-data", {
        body: {
          entityType: selectedEntity,
          data: records,
          fileName: selectedFile.name,
        },
      });

      if (error) throw error;

      toast.success(`Successfully imported ${data.recordsImported} records`);
      setSelectedFile(null);
      
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
      await fetchImportHistory();
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error(error.message || "Failed to import data");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("export-data", {
        body: {
          entityType: selectedEntity,
        },
      });

      if (response.error) throw response.error;

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedEntity}_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Successfully exported ${selectedEntity} data`);
      await fetchImportHistory();
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    
    switch (selectedEntity) {
      case "accounts":
        headers = [
          "name", "account_number", "legal_name", "org_type", "org_record_type", "industry", "type", 
          "status", "sales_status", "contract_status", "phone", "website", "billing_email",
          "mailing_address", "physical_address", "billing_address", "association", "faith_based",
          "key_reference", "client_id", "sharepoint_path", "est_annual_expenditures", 
          "minimum_utility_spend", "total_gross_square_feet", "cost_per_student", "membership_enrollment",
          "prospect_data_source", "push_to_d365"
        ];
        break;
      case "contacts":
        headers = [
          "first_name", "last_name", "goes_by", "email", "personal_email", "additional_email", "asst_email",
          "phone", "mobile", "fax", "title", "contact_type", "sales_role", "employee_id",
          "mailing_address", "home_address", "description", "is_primary", "is_active",
          "association", "key_reference", "key_reference_date", "reference_notes",
          "dallas_visit_date", "mc_commission", "recruiter_commission", "commission_notes",
          "agreement_notes", "commission_split_total", "actual_from_goals", "quota_over_goals",
          "amount_over_quota", "internal_search_owner"
        ];
        break;
      case "opportunities":
        headers = [
          "name", "amount", "stage", "probability", "close_date", "description", "next_step",
          "lead_source", "type", "loss_reason", "competitor", "sharepoint_path",
          "est_annual_expenditures", "proposal_submitted", "proposal_accepted", "verbal_commitment",
          "push_to_d365", "do_not_contact", "district_decision_date", "discovery_complete",
          "drf_status", "drf_submitted_date", "drf_approved_date", "drf_notes",
          "matrix_status", "matrix_submitted_date", "matrix_approved_date", "matrix_notes",
          "rfp_status", "rfp_due_date", "rfp_submitted_date", "rfp_notes",
          "mentor_user_id", "engineer_user_id", "co_salesperson_user_id", "market_consultant_user_id",
          "electricity_actual", "electricity_budgeted", "gas_actual", "gas_budgeted",
          "solar_actual", "solar_budgeted", "propane_actual", "propane_budgeted",
          "water_actual", "water_budgeted", "other_actual", "other_budgeted",
          "net_monthly_fee_py1", "net_monthly_fee_py2", "net_monthly_fee_py3", "net_monthly_fee_py4",
          "net_monthly_fee_py5", "net_monthly_fee_py6", "net_monthly_fee_py7", "net_monthly_fee_py8",
          "net_monthly_fee_py9", "net_monthly_fee_py10",
          "gross_monthly_fee_py1", "gross_monthly_fee_py2", "gross_monthly_fee_py3", "gross_monthly_fee_py4",
          "gross_monthly_fee_py5", "gross_monthly_fee_py6", "gross_monthly_fee_py7", "gross_monthly_fee_py8",
          "gross_monthly_fee_py9", "gross_monthly_fee_py10",
          "net_savings_py1", "net_savings_py2", "net_savings_py3", "net_savings_py4", "net_savings_py5",
          "net_savings_py6", "net_savings_py7", "net_savings_py8", "net_savings_py9", "net_savings_py10",
          "gross_savings_py1", "gross_savings_py2", "gross_savings_py3", "gross_savings_py4", "gross_savings_py5",
          "gross_savings_py6", "gross_savings_py7", "gross_savings_py8", "gross_savings_py9", "gross_savings_py10"
        ];
        break;
      case "quotes":
        headers = [
          "quote_number", "name", "status", "total_amount", "discount_amount", "tax_amount",
          "valid_until", "terms", "description", "notes"
        ];
        break;
      case "contracts":
        headers = [
          "contract_number", "name", "status", "contract_type", "value", "start_date", "end_date",
          "terms", "billing_type", "billing_frequency", "billing_cycle", "billing_start_date",
          "billing_schedule_end_date", "create_billing_schedule", "contract_term_months", "billable_term_months",
          "contract_fiscal_year", "auto_renew", "auto_renew_cancellation_deadline", "auto_renew_declined",
          "renewal", "renewal_declined", "base_year_start", "base_year_end", "last_py_end", "py_1_start",
          "qs_start", "qs_end", "qs_months", "fixed_monthly_fee", "fixed_annual_fee", 
          "gross_total_contract_value", "perf_fee_percent", "discount_percent",
          "client_specified_es_salary", "es_salary_recommendation", "es_ft", "es_pt", "total_ess",
          "es_employed_by", "visits_per_month", "matrix_cost_per_visit",
          "greenx_annual_allocation", "simulate_annual_allocation", "executive_annual_allocation",
          "measure_annual_allocation", "ecap_fee_payments", "ecap_maintenance_fee", "ecap_software_fee",
          "ecap_renewal_payments", "software_type",
          "year_1_gross_savings", "year_2_gross_savings", "year_3_gross_savings", "year_4_gross_savings",
          "year_5_gross_savings", "year_6_gross_savings", "year_7_gross_savings", "year_8_gross_savings",
          "year_9_gross_savings", "year_10_gross_savings",
          "gross_monthly_fee_py1", "gross_monthly_fee_py2", "gross_monthly_fee_py3", "gross_monthly_fee_py4",
          "gross_monthly_fee_py5", "gross_monthly_fee_py6", "proposal_total_gross_savings",
          "accounting_id", "legal_counsel", "accounting_changes_notes", "other_changes_notes",
          "pl_rs_special_provisions", "si_special_requirements", "unique_special_provisions",
          "sharepoint_path", "unique_contract_id", "d365_contract_guid", "push_to_d365"
        ];
        break;
      case "invoices":
        headers = [
          "invoice_number", "invoice_name", "document_type", "status", "description", "notes",
          "issue_date", "due_date", "post_date", "bill_month", "currency",
          "total_amount", "subtotal_amount", "tax_amount", "contract_amount", "credit_total",
          "applied_amount", "applied_payment_date", "ready_for_billing", "run_reconciliation",
          "intacct_status", "intacct_state", "unique_invoice_id", "unique_contract_id",
          "item_id", "generated_external_id"
        ];
        break;
      case "activities":
        headers = [
          "type", "subject", "description", "status", "priority", "due_date",
          "start_datetime", "end_datetime", "from_email", "to_email", "cc_email"
        ];
        break;
      case "projects":
        headers = [
          "name", "code", "status", "project_type", "start_date", "end_date",
          "budget_hours", "budget_amount", "description", "notes",
          "billing_type", "hourly_rate", "is_billable", "sharepoint_path"
        ];
        break;
    }

    const csvContent = headers.join(",") + "\n";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedEntity}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Template downloaded");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "processing":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Import & Export</h2>
          <p className="text-muted-foreground">
            Import data from CSV files or export your data
          </p>
        </div>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="salesforce">Salesforce Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Data</CardTitle>
              <CardDescription>
                Upload a CSV file to import records into your CRM
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="entity-select">Select Entity Type</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger id="entity-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((entity) => (
                      <SelectItem key={entity.value} value={entity.value}>
                        {entity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-input">Select File</Label>
                <div className="flex gap-2">
                  <Input
                    id="file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownloadTemplate}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Template
                  </Button>
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Data
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Import Guidelines:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>File must be in CSV format</li>
                  <li>First row should contain column headers</li>
                  <li>Column names should match the template</li>
                  <li>Empty values will be treated as NULL</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salesforce" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unified Salesforce CSV Import</CardTitle>
              <CardDescription>
                Import any cleaned Salesforce CSV into its mapped CenCore table.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salesforce-csv-entity-select">CSV Type</Label>
                  <Select value={salesforceCsvEntity} onValueChange={setSalesforceCsvEntity}>
                    <SelectTrigger id="salesforce-csv-entity-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {salesforceCsvEntityTypes.map((entity) => (
                        <SelectItem key={entity.value} value={entity.value}>
                          {entity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salesforce-csv-file-input">Select Salesforce CSV</Label>
                  <Input
                    id="salesforce-csv-file-input"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSalesforceCsvFile(file);
                        toast.success(`File "${file.name}" selected`);
                      }
                    }}
                  />
                  {salesforceCsvFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {salesforceCsvFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    if (!salesforceCsvFile) {
                      toast.error("Please select a file first");
                      return;
                    }

                    setIsImportingSalesforceCsv(true);
                    setSfImportResult(null);
                    try {
                      const csvData = await salesforceCsvFile.text();
                      const parsedRows = parseCSV(csvData);
                      if (!parsedRows.length) {
                        throw new Error("No data rows detected in CSV. Ensure the file has a header row and at least one record.");
                      }

                      const CHUNK_SIZE = 200;
                      let totalImported = 0;
                      let totalSkipped = 0;
                      let totalFailed = 0;
                      const importErrors: string[] = [];

                      for (let i = 0; i < parsedRows.length; i += CHUNK_SIZE) {
                        const chunkRows = parsedRows.slice(i, i + CHUNK_SIZE);
                        const chunkCsv = toCsv(chunkRows);

                        const { data, error } = await supabase.functions.invoke("import-salesforce-csv", {
                          body: {
                            entityType: salesforceCsvEntity,
                            csvData: chunkCsv,
                            fileName: salesforceCsvFile.name,
                          },
                        });

                        if (error) throw error;
                        if (!data?.success && !data?.imported && data?.imported !== 0) {
                          throw new Error(data?.error || "Import failed");
                        }

                        totalImported += (data.imported || 0);
                        totalSkipped += (data.skipped || 0);
                        totalFailed += (data.failed || 0);
                        if (Array.isArray(data?.errors)) {
                          importErrors.push(...data.errors.filter(Boolean));
                        }
                        
                        toast.info(`Progress: ${Math.min(i + CHUNK_SIZE, parsedRows.length)} / ${parsedRows.length} rows processed`);
                      }

                      setSfImportResult({ imported: totalImported, skipped: totalSkipped, failed: totalFailed });
                      if (totalImported > 0) {
                        toast.success(`Imported ${totalImported} records`);
                      } else if (totalFailed > 0) {
                        toast.error("No records imported. All rows failed.");
                      } else {
                        toast.warning("No records were imported from this file.");
                      }
                      if (totalSkipped) {
                        toast.info(`${totalSkipped} records skipped because required relationships were missing`);
                      }
                      if (totalFailed) {
                        toast.warning(`${totalFailed} records failed to import`);
                      }
                      if (importErrors.length) {
                        toast.error(`Import error: ${importErrors[0]}`);
                      }

                      setSalesforceCsvFile(null);
                      const fileInput = document.getElementById("salesforce-csv-file-input") as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                      await fetchImportHistory();
                    } catch (error: any) {
                      console.error("Unified Salesforce import error:", error);
                      toast.error(error.message || "Failed to import Salesforce CSV");
                    } finally {
                      setIsImportingSalesforceCsv(false);
                    }
                  }}
                  disabled={!salesforceCsvFile || isImportingSalesforceCsv}
                >
                  {isImportingSalesforceCsv ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import CSV
                    </>
                  )}
                </Button>
              </div>

              {sfImportResult && (
                <div className="mt-4 rounded-lg border border-border bg-muted/50 p-4 text-sm">
                  <div className="font-medium mb-1">Last Import Result</div>
                  <div className="flex gap-4 text-muted-foreground">
                    <span className="text-green-600 font-medium">{sfImportResult.imported} imported</span>
                    {sfImportResult.skipped > 0 && <span className="text-yellow-600 font-medium">{sfImportResult.skipped} skipped</span>}
                    {sfImportResult.failed > 0 && <span className="text-red-600 font-medium">{sfImportResult.failed} failed</span>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Salesforce Import Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Import Order:</strong> Import Accounts → Contacts → Opportunities → Contracts → Energy Programs</li>
                  <li>Records are linked using Salesforce IDs (Id field in exports)</li>
                  <li>Automatically maps Salesforce fields to CenCore fields</li>
                  <li>Large imports are processed in batches of 500 records</li>
                  <li>Check History tab for import status</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>
                Download your data as CSV files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="export-entity-select">Select Entity Type</Label>
                <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                  <SelectTrigger id="export-entity-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((entity) => (
                      <SelectItem key={entity.value} value={entity.value}>
                        {entity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Data
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/50 p-4">
                <h4 className="font-medium mb-2">Export Information:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Data will be exported in CSV format</li>
                  <li>All records from your tenant will be included</li>
                  <li>File will be downloaded automatically</li>
                  <li>Export operation is recorded in history</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Import/Export History
                </CardTitle>
                <CardDescription>
                  View your recent import and export operations
                </CardDescription>
              </div>
              {importHistory.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear History
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all import/export history records. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} disabled={isClearingHistory}>
                        {isClearingHistory ? "Clearing..." : "Clear All"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading history...
                </div>
              ) : importHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No import/export history yet
                </div>
              ) : (
                <div className="space-y-3">
                  {importHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(item.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {item.operation_type === "import" ? "Import" : "Export"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {item.entity_type}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.file_name && <span>{item.file_name} • </span>}
                            {item.records_count} records
                            {item.error_message && (
                              <span className="text-red-600 ml-2">
                                • {item.error_message}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(item.created_at), "MMM dd, yyyy HH:mm")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportExport;
