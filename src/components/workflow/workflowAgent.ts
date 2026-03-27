export interface AgentWorkflow {
  name: string;
  description: string;
  entity_type: "account" | "contact" | "opportunity" | "contract" | "activity" | "project";
  trigger_type: "record_created" | "record_updated" | "field_changed";
  conditions: Record<string, unknown> | null;
  actions: Array<Record<string, unknown>>;
}

export interface WorkflowAgentDiagnostics {
  confidence: number;
  warnings: string[];
}

const ENTITY_FIELDS: Record<AgentWorkflow["entity_type"], string[]> = {
  account: ["name", "status", "type", "industry", "phone", "website", "rating", "sales_status", "contract_status"],
  contact: ["first_name", "last_name", "email", "phone", "title", "status", "is_active", "contact_type"],
  opportunity: ["name", "stage", "amount", "probability", "close_date", "forecast_category", "description"],
  contract: ["name", "contract_number", "status", "end_date", "start_date", "auto_renew", "value", "billing_frequency"],
  activity: ["type", "subject", "description", "status", "priority", "due_date", "start_datetime", "end_datetime"],
  project: ["name", "status", "start_date", "end_date", "budget_amount", "code"],
};

const ENTITY_ALIASES: Array<{ entity: AgentWorkflow["entity_type"]; patterns: RegExp[] }> = [
  { entity: "contract", patterns: [/\bcontract(s)?\b/i, /\bagreement(s)?\b/i] },
  { entity: "opportunity", patterns: [/\bopportunit(y|ies)\b/i, /\bdeal(s)?\b/i] },
  { entity: "account", patterns: [/\baccount(s)?\b/i, /\borganization(s)?\b/i, /\borg(s)?\b/i] },
  { entity: "contact", patterns: [/\bcontact(s)?\b/i] },
  { entity: "activity", patterns: [/\bactivit(y|ies)\b/i, /\bevent(s)?\b/i, /\btask(s)?\b/i] },
  { entity: "project", patterns: [/\bproject(s)?\b/i, /\bprogram(s)?\b/i, /\benergy program(s)?\b/i] },
];

function detectEntity(input: string): AgentWorkflow["entity_type"] {
  for (const alias of ENTITY_ALIASES) {
    if (alias.patterns.some((p) => p.test(input))) return alias.entity;
  }
  return "opportunity";
}

function detectTrigger(input: string): AgentWorkflow["trigger_type"] {
  if (/\b(created|create|new)\b/i.test(input)) return "record_created";
  if (/\b(changes?\s+to|changed\s+to|field changed|updated to)\b/i.test(input)) return "field_changed";
  return "record_updated";
}

function parseCondition(input: string): Record<string, unknown> | null {
  const changedTo = input.match(/\b([a-z_][a-z0-9_]*)\s+(?:changes?\s+to|changed\s+to|updated to)\s+["']?([^"'\n,.;]+)["']?/i);
  if (changedTo) {
    return { field: changedTo[1], operator: "changed_to", value: changedTo[2].trim() };
  }

  const eq = input.match(/\b(?:if|when)\s+([a-z_][a-z0-9_]*)\s+(?:is|equals?)\s+["']?([^"'\n,.;]+)["']?/i);
  if (eq) {
    return { field: eq[1], operator: "equals", value: eq[2].trim() };
  }

  const gt = input.match(/\b([a-z_][a-z0-9_]*)\s*(?:>|greater than)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (gt) {
    return { field: gt[1], operator: "greater_than", value: Number(gt[2]) };
  }

  const lt = input.match(/\b([a-z_][a-z0-9_]*)\s*(?:<|less than)\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (lt) {
    return { field: lt[1], operator: "less_than", value: Number(lt[2]) };
  }

  const boolTrue = input.match(/\b([a-z_][a-z0-9_]*)\s+(?:is checked|is true|true)\b/i);
  if (boolTrue) {
    return { field: boolTrue[1], operator: "is_true", value: null };
  }

  const boolFalse = input.match(/\b([a-z_][a-z0-9_]*)\s+(?:is unchecked|is false|false)\b/i);
  if (boolFalse) {
    return { field: boolFalse[1], operator: "is_false", value: null };
  }

  return null;
}

function parseActions(input: string, entity: AgentWorkflow["entity_type"]): Array<Record<string, unknown>> {
  const actions: Array<Record<string, unknown>> = [];
  const lower = input.toLowerCase();

  const notifyEmail = input.match(/\b(?:notify|email)\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (notifyEmail) {
    const recipient = notifyEmail[1];
    const quotedMessage = input.match(/that\s+"([^"]+)"/i)?.[1]
      || input.match(/message\s+"([^"]+)"/i)?.[1]
      || `A new ${entity} has been added`;

    const routeMap: Record<AgentWorkflow["entity_type"], string> = {
      account: "/crm/accounts",
      contact: "/crm/contacts",
      opportunity: "/crm/opportunities",
      contract: "/crm/contracts",
      activity: "/crm/activities",
      project: "/crm/projects",
    };
    const idFieldMap: Record<AgentWorkflow["entity_type"], string> = {
      account: "account_id",
      contact: "contact_id",
      opportunity: "opportunity_id",
      contract: "contract_id",
      activity: "activity_id",
      project: "project_id",
    };

    const route = routeMap[entity];
    const idField = idFieldMap[entity];
    const title = entity === "account" ? "Account" : entity.charAt(0).toUpperCase() + entity.slice(1);

    const lines = [quotedMessage];
    if (/name/i.test(lower)) {
      if (entity === "contact") {
        lines.push(`${title} Name: {{first_name}} {{last_name}}`);
      } else {
        lines.push(`${title} Name: {{name}}`);
      }
    }
    if (/link|record/i.test(lower)) {
      lines.push(`Record Link: ${route}/{{${idField}}}`);
    }

    actions.push({
      type: "create_record",
      target_entity: "activity",
      field_mappings: {
        type: "Email",
        subject: quotedMessage,
        to_email: recipient,
        status: "Open",
        priority: "Normal",
        description: lines.join("\n"),
      },
    });
    return actions;
  }

  const createRecord = input.match(/\bcreate\s+(?:a\s+)?new\s+(account|contact|opportunity|contract|activity|project|program)\b/i);
  if (createRecord) {
    const target = createRecord[1].toLowerCase() === "program" ? "project" : createRecord[1].toLowerCase();
    actions.push({
      type: "create_record",
      target_entity: target,
      field_mappings: {},
    });
  }

  const setField = input.match(/\bset\s+([a-z_][a-z0-9_]*)\s+to\s+["']?([^"'\n,.;]+)["']?/i);
  if (setField) {
    actions.push({
      type: "update_field",
      entity,
      field: setField[1],
      value: setField[2].trim(),
      value_type: "static",
    });
  }

  const dateCalc = input.match(/\bset\s+([a-z_][a-z0-9_]*)\s+to\s+([0-9]+)\s+(day|days|week|weeks|month|months|year|years)\s+(before|after)\s+([a-z_][a-z0-9_]*)/i);
  if (dateCalc) {
    const operation = dateCalc[4].toLowerCase() === "before" ? "subtract" : "add";
    const unit = dateCalc[3].toLowerCase().endsWith("s") ? dateCalc[3].toLowerCase() : `${dateCalc[3].toLowerCase()}s`;
    actions.push({
      type: "update_field",
      entity,
      field: dateCalc[1],
      value_type: "date_calc",
      value: {
        source_field: dateCalc[5],
        operation,
        amount: Number(dateCalc[2]),
        unit,
      },
    });
  }

  if (!actions.length) {
    actions.push({
      type: "update_field",
      entity,
      field: "status",
      value: "Updated",
      value_type: "static",
    });
  }

  return actions;
}

export function parseWorkflowWithAgent(prompt: string): AgentWorkflow {
  const text = prompt.trim();
  const entity = detectEntity(text);
  const trigger = detectTrigger(text);
  const conditions = parseCondition(text);
  const actions = parseActions(text, entity);

  return {
    name: `Auto ${entity} workflow`,
    description: text,
    entity_type: entity,
    trigger_type: trigger,
    conditions,
    actions,
  };
}

export function diagnoseWorkflowDraft(prompt: string, workflow: AgentWorkflow): WorkflowAgentDiagnostics {
  const warnings: string[] = [];
  let confidence = 0.9;

  if (!workflow.conditions) {
    warnings.push("No explicit condition detected. Workflow may run on every trigger.");
    confidence -= 0.15;
  }

  const validFields = new Set(ENTITY_FIELDS[workflow.entity_type]);

  const conditionField = String((workflow.conditions as Record<string, unknown> | null)?.field ?? "");
  if (conditionField && !validFields.has(conditionField)) {
    warnings.push(`Condition field "${conditionField}" may not exist on ${workflow.entity_type}.`);
    confidence -= 0.2;
  }

  for (const action of workflow.actions) {
    const type = String(action.type ?? "");
    if (type === "update_field") {
      const actionEntity = String(action.entity ?? workflow.entity_type) as AgentWorkflow["entity_type"];
      const actionField = String(action.field ?? "");
      const actionFieldSet = new Set(ENTITY_FIELDS[actionEntity] ?? []);
      if (!actionField) {
        warnings.push("An update action is missing a target field.");
        confidence -= 0.2;
      } else if (actionFieldSet.size > 0 && !actionFieldSet.has(actionField)) {
        warnings.push(`Action field "${actionField}" may not exist on ${actionEntity}.`);
        confidence -= 0.15;
      }
    }
  }

  if (/before|after|days|weeks|months|years/i.test(prompt) && !workflow.actions.some((a) => a.value_type === "date_calc")) {
    warnings.push("Date calculation intent detected, but no date-calc action was inferred.");
    confidence -= 0.1;
  }

  if (!workflow.actions.length) {
    warnings.push("No actions detected.");
    confidence -= 0.3;
  }

  confidence = Math.max(0.1, Math.min(0.99, Number(confidence.toFixed(2))));
  return { confidence, warnings };
}
