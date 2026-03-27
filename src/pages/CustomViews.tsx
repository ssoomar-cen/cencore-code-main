import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, Trash2, Play, Download, Save, GripVertical, LayoutList, X, Filter, ArrowUpDown, Columns3, Share2, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

// Declarations moved below (expanded versions)

type ColMeta = { label: string; type: "text" | "number" | "date" | "boolean" };

const SCHEMA: Record<string, { label: string; cols: Record<string, ColMeta>; relations: string[] }> = {
  account: {
    label: "Organizations", relations: [],
    cols: {
      name:                { label: "Name",            type: "text"   },
      account_number:      { label: "Account Number",  type: "text"   },
      legal_name:          { label: "Legal Name",      type: "text"   },
      org_type:            { label: "Org Type",        type: "text"   },
      industry:            { label: "Industry",        type: "text"   },
      type:                { label: "Type",            type: "text"   },
      city:                { label: "City",            type: "text"   },
      state:               { label: "State",           type: "text"   },
      country:             { label: "Country",         type: "text"   },
      phone:               { label: "Phone",           type: "text"   },
      email:               { label: "Email",           type: "text"   },
      annual_revenue:      { label: "Annual Revenue",  type: "number" },
      number_of_employees: { label: "Employees",       type: "number" },
      created_at:          { label: "Created",         type: "date"   },
      updated_at:          { label: "Updated",         type: "date"   },
    },
  },
  contact: {
    label: "Contacts", relations: ["account"],
    cols: {
      first_name: { label: "First Name", type: "text" },
      last_name:  { label: "Last Name",  type: "text" },
      email:      { label: "Email",      type: "text" },
      phone:      { label: "Phone",      type: "text" },
      title:      { label: "Title",      type: "text" },
      department: { label: "Department", type: "text" },
      status:     { label: "Status",     type: "text" },
      city:       { label: "City",       type: "text" },
      state:      { label: "State",      type: "text" },
      country:    { label: "Country",    type: "text" },
      created_at: { label: "Created",    type: "date" },
      updated_at: { label: "Updated",    type: "date" },
    },
  },
  opportunity: {
    label: "Opportunities", relations: ["account", "contact"],
    cols: {
      name:                 { label: "Name",           type: "text"   },
      stage:                { label: "Stage",          type: "text"   },
      amount:               { label: "Amount",         type: "number" },
      close_date:           { label: "Close Date",     type: "date"   },
      opp_type:             { label: "Type",           type: "text"   },
      sub_type:             { label: "Sub Type",       type: "text"   },
      total_contract_value: { label: "TCV",            type: "number" },
      probability:          { label: "Probability",    type: "number" },
      forecast_category:    { label: "Forecast",       type: "text"   },
      loss_reason:          { label: "Loss Reason",    type: "text"   },
      number_of_buildings:  { label: "Buildings",      type: "number" },
      square_footage:       { label: "Sq Footage",     type: "number" },
      annual_utility_costs: { label: "Annual Utility", type: "number" },
      created_at:           { label: "Created",        type: "date"   },
      updated_at:           { label: "Updated",        type: "date"   },
    },
  },
  contract: {
    label: "Contracts", relations: ["account", "opportunity"],
    cols: {
      contract_number:      { label: "Contract Number", type: "text"   },
      status:               { label: "Status",          type: "text"   },
      start_date:           { label: "Start Date",      type: "date"   },
      end_date:             { label: "End Date",        type: "date"   },
      total_contract_value: { label: "TCV",             type: "number" },
      monthly_fee:          { label: "Monthly Fee",     type: "number" },
      contract_term:        { label: "Term",            type: "number" },
      created_at:           { label: "Created",         type: "date"   },
      updated_at:           { label: "Updated",         type: "date"   },
    },
  },
  project: {
    label: "Energy Programs", relations: ["account", "contract"],
    cols: {
      name:           { label: "Name",           type: "text" },
      code:           { label: "Code",           type: "text" },
      status:         { label: "Status",         type: "text" },
      service_status: { label: "Service Status", type: "text" },
      start_date:     { label: "Start Date",     type: "date" },
      end_date:       { label: "End Date",       type: "date" },
      created_at:     { label: "Created",        type: "date" },
      updated_at:     { label: "Updated",        type: "date" },
    },
  },
  building: {
    label: "Buildings", relations: ["account", "contract"],
    cols: {
      name:           { label: "Name",          type: "text"   },
      status:         { label: "Status",        type: "text"   },
      city:           { label: "City",          type: "text"   },
      state:          { label: "State",         type: "text"   },
      country:        { label: "Country",       type: "text"   },
      square_footage: { label: "Sq Footage",    type: "number" },
      status_reason:  { label: "Status Reason", type: "text"   },
      created_at:     { label: "Created",       type: "date"   },
      updated_at:     { label: "Updated",       type: "date"   },
    },
  },
  activity: {
    label: "Activities", relations: ["account", "contact", "opportunity"],
    cols: {
      subject:     { label: "Subject",     type: "text"    },
      type:        { label: "Type",        type: "text"    },
      status:      { label: "Status",      type: "text"    },
      due_date:    { label: "Due Date",    type: "date"    },
      priority:    { label: "Priority",   type: "text"    },
      description: { label: "Description", type: "text"   },
      is_closed:   { label: "Closed",      type: "boolean" },
      created_at:  { label: "Created",    type: "date"    },
      updated_at:  { label: "Updated",    type: "date"    },
    },
  },
  invoice: {
    label: "Invoices", relations: ["account", "contract"],
    cols: {
      invoice_number:  { label: "Invoice Number", type: "text"   },
      status:          { label: "Status",         type: "text"   },
      issue_date:      { label: "Issue Date",     type: "date"   },
      due_date:        { label: "Due Date",       type: "date"   },
      total_amount:    { label: "Total Amount",   type: "number" },
      subtotal_amount: { label: "Subtotal",       type: "number" },
      created_at:      { label: "Created",        type: "date"   },
      updated_at:      { label: "Updated",        type: "date"   },
    },
  },
  invoice_item: {
    label: "Invoice Items", relations: ["invoice", "project"],
    cols: {
      invoice_item_type:      { label: "Type",            type: "text"   },
      period_date:            { label: "Period Date",     type: "date"   },
      savings:                { label: "Savings",         type: "number" },
      current_cost_avoidance: { label: "Cost Avoidance",  type: "number" },
      special_savings:        { label: "Special Savings", type: "number" },
      fee_amount:             { label: "Fee Amount",      type: "number" },
      created_at:             { label: "Created",         type: "date"   },
      updated_at:             { label: "Updated",         type: "date"   },
    },
  },
  commission_split: {
    label: "Commissions", relations: ["contract", "opportunity"],
    cols: {
      name:               { label: "Name",          type: "text"   },
      commission_type:    { label: "Type",          type: "text"   },
      role:               { label: "Role",          type: "text"   },
      status:             { label: "Status",        type: "text"   },
      percentage:         { label: "Percentage",    type: "number" },
      commission_percent: { label: "Commission Pct",type: "number" },
      tcv:                { label: "TCV",           type: "number" },
      ncv:                { label: "NCV",           type: "number" },
      created_at:         { label: "Created",       type: "date"   },
      updated_at:         { label: "Updated",       type: "date"   },
    },
  },
  quote: {
    label: "Quotes", relations: ["opportunity"],
    cols: {
      quote_number:         { label: "Quote Number",  type: "text"   },
      name:                 { label: "Name",          type: "text"   },
      status:               { label: "Status",        type: "text"   },
      total_amount:         { label: "Total Amount",  type: "number" },
      total_contract_value: { label: "TCV",           type: "number" },
      expiration_date:      { label: "Expires",       type: "date"   },
      created_at:           { label: "Created",       type: "date"   },
      updated_at:           { label: "Updated",       type: "date"   },
    },
  },
};

const AGGREGATES = ["none", "COUNT", "SUM", "AVG", "MIN", "MAX"];
const OPERATORS = [
  { value: "eq", label: "equals" }, { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" }, { value: "gte", label: ">=" },
  { value: "lt", label: "less than" }, { value: "lte", label: "<=" },
  { value: "like", label: "contains" }, { value: "starts", label: "starts with" },
  { value: "is_null", label: "is empty" }, { value: "not_null", label: "is not empty" },
];

interface ViewColumn { id: string; table: string; column: string; alias: string; aggregate: string; }
interface ViewFilter { id: string; table: string; column: string; operator: string; value: string; }
interface ViewSort   { id: string; table: string; column: string; direction: string; }
interface ViewConfig { baseTable: string; columns: ViewColumn[]; filters: ViewFilter[]; sort: ViewSort[]; limit: number; }
interface SavedView  { id: string; name: string; description: string; config: ViewConfig; is_shared: boolean; created_at: string; }

const defaultConfig = (): ViewConfig => ({ baseTable: "account", columns: [], filters: [], sort: [], limit: 500 });
const uid = () => Math.random().toString(36).slice(2, 9);
