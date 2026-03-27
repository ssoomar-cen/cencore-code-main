import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileText, Download, Printer, ChevronDown, ChevronRight,
  Copy, Upload, X, FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface MailMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: any;
}

// ── Field reference ────────────────────────────────────────────────────────────
const FIELD_CATEGORIES = [
  {
    label: "Contract",
    fields: [
      { key: "contract_number",                  label: "Contract Number" },
      { key: "salesforce_id",                    label: "Salesforce ID" },
      { key: "contract_name",                    label: "Contract Name" },
      { key: "status",                           label: "Status" },
      { key: "contract_type",                    label: "Contract Type" },
      { key: "auto_renew",                       label: "Auto Renew" },
      { key: "renewal",                          label: "Renewal" },
      { key: "legal_counsel",                    label: "Legal Counsel" },
      { key: "accounting_id",                    label: "Accounting ID" },
      { key: "terms",                            label: "Terms" },
      { key: "contract_term_months",             label: "Contract Term (Months)" },
      { key: "billing_cycle",                    label: "Billing Cycle" },
      { key: "billing_type",                     label: "Billing Type" },
      { key: "start_date",                       label: "Start Date" },
      { key: "end_date",                         label: "End Date" },
      { key: "billing_start_date",               label: "Billing Start Date" },
      { key: "billing_schedule_end_date",        label: "Billing Schedule End Date" },
      { key: "base_year_start",                  label: "Base Year Start" },
      { key: "base_year_end",                    label: "Base Year End" },
      { key: "auto_renew_cancellation_deadline", label: "Auto Renew Cancellation Deadline" },
      { key: "contract_fiscal_year",             label: "Contract Fiscal Year" },
      { key: "contract_value",                   label: "Contract Value" },
      { key: "fixed_monthly_fee",                label: "Fixed Monthly Fee" },
      { key: "fixed_annual_fee",                 label: "Fixed Annual Fee" },
      { key: "gross_total_contract_value",       label: "Gross Total Contract Value" },
      { key: "perf_fee_percent",                 label: "Performance Fee %" },
      { key: "discount_percent",                 label: "Discount %" },
      { key: "visits_per_month",                 label: "Visits Per Month" },
      { key: "es_employed_by",                   label: "ES Employed By" },
      { key: "unique_contract_id",               label: "Unique Contract ID" },
      { key: "contract_date",                    label: "Today's Date" },
    ],
  },
  {
    label: "Organization",
    fields: [
      { key: "org_name",            label: "Organization Name" },
      { key: "org_type",            label: "Type" },
      { key: "org_status",          label: "Status" },
      { key: "org_billing_address", label: "Billing Address" },
      { key: "org_phone",           label: "Phone" },
      { key: "org_website",         label: "Website" },
      { key: "org_account_number",  label: "Account Number" },
    ],
  },
  {
    label: "Opportunity",
    fields: [
      { key: "opp_name",        label: "Opportunity Name" },
      { key: "opp_number",      label: "Opportunity Number" },
      { key: "opp_stage",       label: "Stage" },
      { key: "opp_amount",      label: "Amount" },
      { key: "opp_probability", label: "Probability" },
      { key: "opp_close_date",  label: "Close Date" },
      { key: "opp_description", label: "Description" },
    ],
  },
  {
    label: "Primary Contact",
    fields: [
      { key: "primary_contact_name",       label: "Full Name" },
      { key: "primary_contact_first_name", label: "First Name" },
      { key: "primary_contact_last_name",  label: "Last Name" },
      { key: "primary_contact_email",      label: "Email" },
      { key: "primary_contact_phone",      label: "Phone" },
      { key: "primary_contact_title",      label: "Title" },
      { key: "primary_contact_role",       label: "Role" },
    ],
  },
  {
    label: "Contacts (indexed)",
    description: "Replace N with 1, 2, 3…",
    fields: [
      { key: "contact_N_name",       label: "Full Name" },
      { key: "contact_N_first_name", label: "First Name" },
      { key: "contact_N_last_name",  label: "Last Name" },
      { key: "contact_N_email",      label: "Email" },
      { key: "contact_N_phone",      label: "Phone" },
      { key: "contact_N_title",      label: "Title" },
      { key: "contact_N_role",       label: "Role" },
    ],
  },
  {
    label: "Connections (indexed)",
    description: "Replace N with 1, 2, 3…",
    fields: [
      { key: "connection_N_role",         label: "Role" },
      { key: "connection_N_contact_name", label: "Contact Name" },
      { key: "connection_N_start_date",   label: "Start Date" },
      { key: "connection_N_end_date",     label: "End Date" },
      { key: "connection_N_notes",        label: "Notes" },
    ],
  },
];

const DEFAULT_TEMPLATE = `CONTRACT AGREEMENT

Contract Number: {{contract_number}}
Contract Date: {{contract_date}}
Contract Name: {{contract_name}}

PARTIES

Organization: {{org_name}}
Address: {{org_billing_address}}
Phone: {{org_phone}}

PRIMARY CONTACT

Name: {{primary_contact_name}}
Title: {{primary_contact_title}}
Email: {{primary_contact_email}}
Phone: {{primary_contact_phone}}

CONTRACT TERMS

Status: {{status}}
Contract Type: {{contract_type}}
Contract Term: {{contract_term_months}} months
Billing Cycle: {{billing_cycle}}
Contract Value: {{contract_value}}
Fixed Monthly Fee: {{fixed_monthly_fee}}

KEY DATES

Start Date: {{start_date}}
End Date: {{end_date}}
Billing Start Date: {{billing_start_date}}
Billing Schedule End Date: {{billing_schedule_end_date}}
Base Year Start: {{base_year_start}}
Base Year End: {{base_year_end}}

RENEWAL

Auto Renew: {{auto_renew}}
Renewal Cancellation Deadline: {{auto_renew_cancellation_deadline}}
Legal Counsel: {{legal_counsel}}

RELATED OPPORTUNITY

Opportunity: {{opp_name}}
Stage: {{opp_stage}}
Amount: {{opp_amount}}

TERMS AND CONDITIONS

{{terms}}

This contract is binding upon execution by both parties.`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data URL prefix, keep only the base64 part
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBase64(base64: string, filename: string, mime: string) {
  const link = document.createElement("a");
  link.href = `data:${mime};base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── Field sidebar (shared between tabs) ───────────────────────────────────────
function FieldPanel({
  onInsert,
}: {
  onInsert?: (key: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ Contract: true });
  const toggle = (label: string) => setOpen((p) => ({ ...p, [label]: !p[label] }));

  const copyOrInsert = (key: string) => {
    if (onInsert) {
      onInsert(key);
    } else {
      navigator.clipboard.writeText(`{{${key}}}`);
      toast.success(`Copied {{${key}}} to clipboard`);
    }
  };

  return (
    <div className="w-60 shrink-0 border-r flex flex-col">
      <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Merge Fields
        </p>
        {!onInsert && (
          <p className="text-xs text-muted-foreground mt-0.5">Click to copy to clipboard</p>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 py-2 space-y-0.5">
          {FIELD_CATEGORIES.map((cat) => (
            <Collapsible
              key={cat.label}
              open={!!open[cat.label]}
              onOpenChange={() => toggle(cat.label)}
            >
              <CollapsibleTrigger asChild>
                <button type="button" className="flex w-full items-center justify-between px-2 py-1.5 rounded hover:bg-muted text-sm font-medium text-left">
                  {cat.label}
                  {open[cat.label]
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {cat.description && (
                  <p className="px-2 pb-1 text-xs text-muted-foreground italic">{cat.description}</p>
                )}
                <div className="pl-2 pb-1 space-y-0.5">
                  {cat.fields.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => copyOrInsert(f.key)}
                      title={`{{${f.key}}}`}
                      className="flex w-full items-center gap-1.5 px-2 py-1 rounded text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors group"
                    >
                      <Copy className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-primary" />
                      <span className="truncate">{f.label}</span>
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function MailMergeDialog({ open, onOpenChange, contract }: MailMergeDialogProps) {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insert merge field at cursor in textarea
  const insertField = useCallback((key: string) => {
    const tag = `{{${key}}}`;
    const el = textareaRef.current;
    if (!el) { setTemplate((t) => t + tag); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setTemplate(template.substring(0, start) + tag + template.substring(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    });
  }, [template]);

  // File drop / select
  const handleFile = (file: File) => {
    if (!file.name.endsWith(".docx")) {
      toast.error("Please upload a .docx file");
      return;
    }
    setUploadedFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Generate from text template (existing approach) ────────────────────────
  const generateFromText = async (asPdf: boolean) => {
    if (asPdf) setIsPdfGenerating(true); else setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-contract-document", {
        body: { contractId: contract.contract_id, template },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (asPdf && data?.htmlDocument) {
        const win = window.open("", "_blank", "width=900,height=700");
        if (win) {
          win.document.write(data.htmlDocument);
          win.document.close();
          win.onload = () => { win.focus(); win.print(); };
          toast.success("Print dialog opened — choose 'Save as PDF'");
        } else {
          toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        }
      } else if (!asPdf && data?.documentUrl) {
        downloadBase64(
          data.documentUrl.split(",")[1],
          data.filename ?? `Contract_${contract.contract_number}.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        toast.success("Word document downloaded");
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      if (asPdf) setIsPdfGenerating(false); else setIsGenerating(false);
    }
  };

  // ── Generate from uploaded .docx template ─────────────────────────────────
  const generateFromUpload = async () => {
    if (!uploadedFile) { toast.error("Please upload a template file first"); return; }
    setIsGenerating(true);
    try {
      const templateBase64 = await fileToBase64(uploadedFile);
      const { data, error } = await supabase.functions.invoke("generate-contract-document", {
        body: { contractId: contract.contract_id, templateBase64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.documentBase64) {
        downloadBase64(
          data.documentBase64,
          `Contract_${contract.contract_number}.docx`,
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        toast.success("Merged document downloaded");
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const busy = isGenerating || isPdfGenerating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mail Merge — Generate Contract Document
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">{contract.contract_number}</Badge>
            <Badge variant="outline" className="text-xs">{contract.account?.name}</Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="upload" className="flex flex-col flex-1 overflow-hidden">
          {/* Tab bar */}
          <div className="border-b px-6 shrink-0">
            <TabsList className="h-10 bg-transparent p-0 gap-4 rounded-none">
              <TabsTrigger
                value="upload"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-10"
              >
                Upload Word Template
              </TabsTrigger>
              <TabsTrigger
                value="text"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 h-10"
              >
                Text Template
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Upload Template Tab ── */}
          <TabsContent value="upload" className="flex flex-1 overflow-hidden mt-0">
            <FieldPanel />

            <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
              <div>
                <h3 className="text-sm font-semibold mb-1">Upload a .docx template</h3>
                <p className="text-sm text-muted-foreground">
                  Create your contract template in Word using{" "}
                  <code className="bg-muted px-1 rounded text-xs font-mono">{"{{field_name}}"}</code>{" "}
                  as placeholders anywhere in the document — in paragraphs, tables, headers,
                  footers, or text boxes. All formatting, styles, and layout are preserved exactly.
                </p>
              </div>

              {/* Drop zone */}
              {!uploadedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed cursor-pointer transition-colors
                    ${isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                >
                  <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Drop your .docx template here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    title="Upload .docx template"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-4">
                  {/* File card */}
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                    <FileCheck className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB · Ready to merge
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setUploadedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                    <p className="font-medium">How it works</p>
                    <ul className="space-y-1 text-muted-foreground list-disc list-inside text-xs">
                      <li>All contract data is merged into your template exactly where the tags are placed</li>
                      <li>Formatting, fonts, tables, headers/footers, and page layout are fully preserved</li>
                      <li>Use the field panel on the left to copy field names into your template</li>
                      <li>To convert to PDF: open the downloaded file in Word or Google Docs and export</li>
                    </ul>
                  </div>

                  {/* Replace file button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Replace Template
                    <input
                      ref={fileInputRef}
                      type="file"
                      title="Replace .docx template"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Text Template Tab ── */}
          <TabsContent value="text" className="flex flex-1 overflow-hidden mt-0">
            <FieldPanel onInsert={insertField} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Document Template — click a field to insert at cursor
                </Label>
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <Textarea
                  ref={textareaRef}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="h-full font-mono text-sm resize-none"
                  placeholder="Enter your contract template with {{merge_fields}}…"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0 flex-row items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Upload tab: preserves full Word formatting · Text tab: generates basic .docx or PDF
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            {/* Text tab PDF button — only meaningful for text template */}
            <Tabs>
              <TabsContent value="text" className="m-0 p-0 contents">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => generateFromText(true)}
                  disabled={busy}
                >
                  {isPdfGenerating ? "Preparing…" : <><Printer className="h-4 w-4 mr-2" />Download PDF</>}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Primary download button — adapts to active tab */}
            <DownloadButton
              contract={contract}
              uploadedFile={uploadedFile}
              template={template}
              isGenerating={isGenerating}
              isPdfGenerating={isPdfGenerating}
              onTextDownload={() => generateFromText(false)}
              onUploadDownload={generateFromUpload}
              onTextPdf={() => generateFromText(true)}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Footer button that adapts to which tab is visible ─────────────────────────
// Since Tabs context doesn't expose active tab to siblings easily, we track it here
// via a simpler approach: render both buttons and let CSS/tab state handle visibility.
// Instead, we just expose both actions clearly.
function DownloadButton({
  contract,
  uploadedFile,
  template,
  isGenerating,
  isPdfGenerating,
  onTextDownload,
  onUploadDownload,
  onTextPdf,
}: {
  contract: any;
  uploadedFile: File | null;
  template: string;
  isGenerating: boolean;
  isPdfGenerating: boolean;
  onTextDownload: () => void;
  onUploadDownload: () => void;
  onTextPdf: () => void;
}) {
  // We can't easily read active tab from a sibling, so render the primary
  // action based on whether a file is uploaded (upload tab) or not (text tab).
  // Users can still explicitly switch tabs regardless.
  const busy = isGenerating || isPdfGenerating;

  if (uploadedFile) {
    return (
      <Button type="button" onClick={onUploadDownload} disabled={busy} className="gap-2">
        {isGenerating ? "Merging…" : <><Download className="h-4 w-4" />Merge &amp; Download Word</>}
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={onTextPdf} disabled={busy}>
        {isPdfGenerating ? "Preparing…" : <><Printer className="h-4 w-4 mr-2" />PDF</>}
      </Button>
      <Button type="button" onClick={onTextDownload} disabled={busy} className="gap-2">
        {isGenerating ? "Generating…" : <><Download className="h-4 w-4" />Download Word</>}
      </Button>
    </>
  );
}
