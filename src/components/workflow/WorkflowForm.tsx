import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Wand2, Loader2, CheckCircle, Pencil, Save } from "lucide-react";
import { diagnoseWorkflowDraft, parseWorkflowWithAgent, WorkflowAgentDiagnostics } from "./workflowAgent";

interface ParsedWorkflow {
  name: string;
  description: string;
  entity_type: string;
  trigger_type: string;
  conditions: any;
  actions: any[];
}

interface WorkflowFormProps {
  workflow?: any;
  onSuccess?: () => void;
}

export function WorkflowForm({ workflow, onSuccess }: WorkflowFormProps) {
  const [prompt, setPrompt] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkflow | null>(
    workflow
      ? {
          name: workflow.name,
          description: workflow.description || "",
          entity_type: workflow.entity_type,
          trigger_type: workflow.trigger_type,
          conditions: workflow.conditions,
          actions: workflow.actions,
        }
      : null
  );
  const [editName, setEditName] = useState(false);
  const [customName, setCustomName] = useState(workflow?.name || "");
  const [diagnostics, setDiagnostics] = useState<WorkflowAgentDiagnostics | null>(null);

  const extractFunctionError = async (err: any): Promise<string> => {
    const fallback = err?.message || "Failed to parse workflow";
    try {
      const response = err?.context as Response | undefined;
      if (!response) return fallback;
      const text = await response.text();
      if (!text) return fallback;
      try {
        const parsed = JSON.parse(text) as { error?: string; message?: string };
        return parsed.error || parsed.message || text;
      } catch {
        return text;
      }
    } catch {
      return fallback;
    }
  };

  const handleParse = async () => {
    if (!prompt.trim()) {
      toast.error("Please describe what you want the workflow to do");
      return;
    }

    setIsParsing(true);
    setParsed(null);

    try {
      // Primary parser is local to avoid runtime JWT/deployment/provider failures.
      const local = parseWorkflowWithAgent(prompt.trim());
      const nextDiagnostics = diagnoseWorkflowDraft(prompt.trim(), local);
      setParsed(local);
      setDiagnostics(nextDiagnostics);
      setCustomName(local.name);
      toast.success("Workflow interpreted. Review and save below.");
    } catch (err: any) {
      const reason = await extractFunctionError(err);
      toast.error(reason || "Failed to interpret workflow");
    } finally {
      setIsParsing(false);
    }
  };

  const handleSave = async () => {
    if (!parsed) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profile")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const workflowData = {
        name: customName || parsed.name,
        description: parsed.description || null,
        entity_type: parsed.entity_type,
        trigger_type: parsed.trigger_type,
        conditions: parsed.conditions || null,
        actions: parsed.actions,
        tenant_id: profile.tenant_id,
        is_active: true,
      };

      if (workflow) {
        const { error } = await supabase
          .from("workflows")
          .update(workflowData)
          .eq("id", workflow.id);
        if (error) throw error;
        toast.success("Workflow updated");
      } else {
        const { error } = await supabase
          .from("workflows")
          .insert(workflowData);
        if (error) throw error;
        toast.success("Workflow created");
      }

      onSuccess?.();
      setPrompt("");
      setParsed(null);
      setDiagnostics(null);
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const formatCondition = (cond: any): string => {
    if (!cond) return "Always (no conditions)";
    const { field, operator, value } = cond;
    const opMap: Record<string, string> = {
      equals: "is equal to",
      not_equals: "is not equal to",
      contains: "contains",
      changed_to: "changes to",
      is_true: "is checked / true",
      is_false: "is unchecked / false",
      greater_than: "is greater than",
      less_than: "is less than",
    };
    const opText = opMap[operator] || operator;
    if (operator === "is_true" || operator === "is_false") {
      return `"${field}" ${opText}`;
    }
    return `"${field}" ${opText} "${value}"`;
  };

  const formatAction = (action: any): string => {
    if (action.type === "update_field") {
      let valueText: string;
      if (action.value_type === "date_calc" && typeof action.value === "object") {
        const { source_field, operation, amount, unit } = action.value;
        const opText = operation === "subtract" ? "minus" : "plus";
        valueText = `${source_field} ${opText} ${amount} ${unit}`;
      } else if (action.value_type === "field_ref") {
        valueText = `value of "${action.value}"`;
      } else {
        valueText = `"${action.value}"`;
      }
      const entity = action.entity ? `on ${action.entity}` : "";
      return `Set "${action.field}" ${entity} to ${valueText}`;
    }
    if (action.type === "create_record") {
      const target = action.target_entity || action.entity;
      const mappings = action.field_mappings || {};
      if (target === "activity" && mappings?.to_email) {
        return `Send email notification to "${mappings.to_email}" with subject "${mappings.subject || "Notification"}"`;
      }
      return `Create a new ${action.target_entity || action.entity} record`;
    }
    return JSON.stringify(action);
  };

  const triggerLabel = (t: string) => {
    const map: Record<string, string> = {
      record_created: "When a record is created",
      record_updated: "When a record is updated",
      field_changed: "When a specific field changes",
      scheduled: "On a schedule",
    };
    return map[t] || t;
  };

  return (
    <div className="space-y-6">
      {/* Natural Language Input */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Describe your workflow in plain English</label>
        <Textarea
          placeholder={`Examples:\n• "When an opportunity stage changes to Closed Won, create a new contract linked to the same account"\n• "Check if auto renew is checked on a contract. If it is, update the auto renew deadline to 90 days before contract end date"\n• "When a contact is created, set status to Active"`}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="resize-none"
        />
        <Button onClick={handleParse} disabled={isParsing || !prompt.trim()}>
          {isParsing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Interpreting...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Interpret Workflow
            </>
          )}
        </Button>
      </div>

      {/* Parsed Preview */}
      {parsed && (
        <>
          <Separator />
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Workflow Parsed</span>
                </div>
                <Badge variant="outline" className="capitalize">{parsed.entity_type}</Badge>
              </div>

              {/* Editable Name */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Name</span>
                <div className="flex items-center gap-2">
                  {editName ? (
                    <>
                      <Input
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="h-8"
                      />
                      <Button size="sm" variant="ghost" onClick={() => setEditName(false)}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium">{customName || parsed.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setEditName(true)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {parsed.description && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <p className="text-sm">{parsed.description}</p>
                </div>
              )}

              {diagnostics && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Interpretation Quality</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={diagnostics.confidence >= 0.8 ? "default" : diagnostics.confidence >= 0.6 ? "secondary" : "destructive"}>
                      Confidence {Math.round(diagnostics.confidence * 100)}%
                    </Badge>
                    {diagnostics.warnings.length === 0 ? (
                      <span className="text-xs text-muted-foreground">No obvious issues detected.</span>
                    ) : null}
                  </div>
                  {diagnostics.warnings.length > 0 ? (
                    <ul className="list-disc pl-5 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      {diagnostics.warnings.map((w, idx) => (
                        <li key={`${w}-${idx}`}>{w}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}

              {/* Trigger */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Trigger</span>
                <p className="text-sm">{triggerLabel(parsed.trigger_type)}</p>
              </div>

              {/* Condition */}
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Condition</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">IF</Badge>
                  <span className="text-sm">{formatCondition(parsed.conditions)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Actions</span>
                {(Array.isArray(parsed.actions) ? parsed.actions : [parsed.actions]).map((action, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">THEN</Badge>
                    <span className="text-sm">{formatAction(action)}</span>
                  </div>
                ))}
              </div>

              {/* Raw JSON (collapsible) */}
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View raw configuration
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto text-xs font-mono">
                  {JSON.stringify({ parsed, diagnostics }, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {workflow ? "Update Workflow" : "Save Workflow"}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setParsed(null);
                setPrompt("");
              }}
            >
              Start Over
            </Button>
            {onSuccess && (
              <Button type="button" variant="ghost" onClick={onSuccess}>
                Cancel
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
