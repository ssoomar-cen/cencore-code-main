/**
 * Business Central Project Accounting Calculations
 * 
 * Based on BC's Job module structure:
 * - Planning Lines: Budget/Schedule data (what we plan to do)
 * - Ledger Entries: Actual/Posted data (what actually happened)
 * 
 * Line Types:
 * - Budget: Cost tracking only
 * - Billable: Revenue tracking only
 * - Both Budget and Billable: Both cost and revenue tracking
 * 
 * Entry Types in Ledger:
 * - Usage: Actual costs incurred
 * - Sale: Revenue posted (invoiced)
 */

export interface PlanningLine {
  id: string;
  task_id?: string | null;
  line_type?: string | null; // 'Budget', 'Billable', 'Both Budget and Billable'
  type?: string | null; // 'Resource', 'Item', 'G/L Account'
  quantity?: number | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  line_amount?: number | null;
  invoiced_amount?: number | null;
  qty_to_transfer_to_journal?: number | null;
}

export interface LedgerEntry {
  id: string;
  task_id?: string | null;
  entry_type?: string | null; // 'Usage', 'Sale'
  type?: string | null; // 'Resource', 'Item', 'G/L Account'
  quantity?: number | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
}

export interface TimeEntry {
  time_entry_id: string;
  task_id?: string | null;
  hours?: number | null;
  billable?: boolean | null;
  hourly_rate?: number | null;
  status?: string | null;
}

export interface Task {
  task_id: string;
  status?: string | null;
  bc_task_number?: string | null;
}

export interface ProjectMetrics {
  // Hours
  scheduleHours: number;
  usageHours: number;
  billableScheduleHours: number;
  remainingHours: number;
  
  // Costs (from planning lines with Budget or Both)
  scheduleCost: number;
  usageCost: number;
  remainingCost: number;
  costVariance: number; // Positive = under budget
  
  // Revenue/Price (from planning lines with Billable or Both)
  schedulePrice: number;
  billableAmount: number;
  invoicedAmount: number;
  remainingToBill: number;
  
  // Derived metrics
  costPerformanceIndex: number; // CPI: Earned Value / Actual Cost
  profitMargin: number; // (Revenue - Cost) / Revenue
  utilizationRate: number; // Billable hours / Total hours
  
  // Task completion
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  
  // Team
  teamMembers: number;
  
  // Expenses (G/L Account type entries)
  scheduleExpenses: number;
  actualExpenses: number;
  
  // Resource costs (Resource type entries)
  scheduleResourceCost: number;
  actualResourceCost: number;
  
  // Item costs (Item type entries)
  scheduleItemCost: number;
  actualItemCost: number;
}

/**
 * Calculate project metrics from planning lines, ledger entries, time entries, and tasks
 */
export function calculateProjectMetrics(
  planningLines: PlanningLine[] = [],
  ledgerEntries: LedgerEntry[] = [],
  timeEntries: TimeEntry[] = [],
  tasks: Task[] = [],
  projectBudgetHours?: number | null,
  projectBudgetAmount?: number | null
): ProjectMetrics {
  
  // ============ SCHEDULE/BUDGET CALCULATIONS (from Planning Lines) ============
  
  // Budget lines: line_type = 'Budget' or 'Both Budget and Billable'
  const budgetLines = planningLines.filter(l => 
    l.line_type === 'Budget' || l.line_type === 'Both Budget and Billable'
  );
  
  // Billable lines: line_type = 'Billable' or 'Both Budget and Billable'
  const billableLines = planningLines.filter(l => 
    l.line_type === 'Billable' || l.line_type === 'Both Budget and Billable'
  );
  
  // Schedule hours (from Resource type budget lines - hours are in quantity)
  const scheduleHours = budgetLines
    .filter(l => l.type === 'Resource')
    .reduce((sum, l) => sum + (l.quantity || 0), 0);
  
  // Billable schedule hours
  const billableScheduleHours = billableLines
    .filter(l => l.type === 'Resource')
    .reduce((sum, l) => sum + (l.quantity || 0), 0);
  
  // Schedule cost (total_cost from all budget lines)
  const scheduleCost = budgetLines
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  // Schedule price/revenue (total_price or line_amount from billable lines)
  const schedulePrice = billableLines
    .reduce((sum, l) => sum + (l.line_amount || l.total_price || 0), 0);
  
  // Breakdown by type for budget lines
  const scheduleResourceCost = budgetLines
    .filter(l => l.type === 'Resource')
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  const scheduleItemCost = budgetLines
    .filter(l => l.type === 'Item')
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  const scheduleExpenses = budgetLines
    .filter(l => l.type === 'G/L Account')
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  // Invoiced amount from planning lines
  const invoicedFromPlanning = planningLines
    .reduce((sum, l) => sum + (l.invoiced_amount || 0), 0);
  
  // ============ ACTUAL/USAGE CALCULATIONS (from Ledger Entries) ============
  
  // Usage entries: entry_type = 'Usage' (actual costs)
  const usageEntries = ledgerEntries.filter(l => 
    l.entry_type === 'Usage' || !l.entry_type // Default to usage if not specified
  );
  
  // Sale entries: entry_type = 'Sale' (invoiced revenue)
  const saleEntries = ledgerEntries.filter(l => l.entry_type === 'Sale');
  
  // Usage hours (from Resource type usage entries)
  const usageHoursFromLedger = usageEntries
    .filter(l => l.type === 'Resource')
    .reduce((sum, l) => sum + (l.quantity || 0), 0);
  
  // Usage cost (total_cost from all usage entries)
  const usageCostFromLedger = usageEntries
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  // Actual costs by type
  const actualResourceCost = usageEntries
    .filter(l => l.type === 'Resource')
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  const actualItemCost = usageEntries
    .filter(l => l.type === 'Item')
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  const actualExpenses = usageEntries
    .filter(l => l.type === 'G/L Account')
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);
  
  // Invoiced from ledger sale entries
  const invoicedFromLedger = saleEntries
    .reduce((sum, l) => sum + (l.total_price || 0), 0);
  
  // ============ TIME ENTRY CALCULATIONS (fallback if no ledger data) ============
  
  const timeHours = timeEntries
    .reduce((sum, e) => sum + (e.hours || 0), 0);
  
  const billableTimeHours = timeEntries
    .filter(e => e.billable)
    .reduce((sum, e) => sum + (e.hours || 0), 0);
  
  const timeCost = timeEntries
    .reduce((sum, e) => sum + ((e.hours || 0) * (e.hourly_rate || 0)), 0);
  
  const billableAmount = timeEntries
    .filter(e => e.billable)
    .reduce((sum, e) => sum + ((e.hours || 0) * (e.hourly_rate || 0)), 0);
  
  // ============ DETERMINE WHICH SOURCE TO USE ============
  
  // Use ledger data if available, otherwise fall back to time entries
  const hasLedgerData = ledgerEntries.length > 0;
  const hasPlanningData = planningLines.length > 0;
  
  const usageHours = hasLedgerData ? usageHoursFromLedger : timeHours;
  const usageCost = hasLedgerData ? usageCostFromLedger : timeCost;
  const invoicedAmount = hasLedgerData ? invoicedFromLedger : (invoicedFromPlanning || 0);
  
  // Use project-level budget if no planning lines
  const effectiveScheduleHours = hasPlanningData ? scheduleHours : (projectBudgetHours || 0);
  const effectiveScheduleCost = hasPlanningData ? scheduleCost : (projectBudgetAmount || 0);
  
  // ============ DERIVED METRICS ============
  
  const remainingHours = Math.max(0, effectiveScheduleHours - usageHours);
  const remainingCost = effectiveScheduleCost - usageCost;
  const costVariance = effectiveScheduleCost - usageCost; // Positive = under budget
  
  const remainingToBill = schedulePrice - invoicedAmount;
  
  // Cost Performance Index (CPI): > 1 means under budget
  const costPerformanceIndex = usageCost > 0 
    ? effectiveScheduleCost / usageCost 
    : effectiveScheduleCost > 0 ? Infinity : 1;
  
  // Profit margin
  const totalRevenue = invoicedAmount || billableAmount || schedulePrice;
  const profitMargin = totalRevenue > 0 
    ? ((totalRevenue - usageCost) / totalRevenue) * 100 
    : 0;
  
  // Utilization rate
  const utilizationRate = usageHours > 0 
    ? (billableTimeHours / usageHours) * 100 
    : 0;
  
  // Task completion
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Done' || t.status === 'Completed').length;
  const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  
  // Team members (unique users from time entries)
  const teamMembers = new Set(timeEntries.map(e => (e as any).user_id).filter(Boolean)).size;
  
  return {
    // Hours
    scheduleHours: effectiveScheduleHours,
    usageHours,
    billableScheduleHours,
    remainingHours,
    
    // Costs
    scheduleCost: effectiveScheduleCost,
    usageCost,
    remainingCost,
    costVariance,
    
    // Revenue
    schedulePrice,
    billableAmount,
    invoicedAmount,
    remainingToBill,
    
    // Performance
    costPerformanceIndex: isFinite(costPerformanceIndex) ? costPerformanceIndex : 1,
    profitMargin,
    utilizationRate,
    
    // Tasks
    totalTasks,
    completedTasks,
    taskCompletionRate,
    
    // Team
    teamMembers,
    
    // By type
    scheduleExpenses,
    actualExpenses: hasLedgerData ? actualExpenses : 0,
    scheduleResourceCost,
    actualResourceCost: hasLedgerData ? actualResourceCost : timeCost,
    scheduleItemCost,
    actualItemCost: hasLedgerData ? actualItemCost : 0,
  };
}

/**
 * Calculate task-level metrics
 */
export function calculateTaskMetrics(
  taskId: string,
  planningLines: PlanningLine[] = [],
  ledgerEntries: LedgerEntry[] = [],
  timeEntries: TimeEntry[] = []
): ProjectMetrics {
  const taskPlanningLines = planningLines.filter(l => l.task_id === taskId);
  const taskLedgerEntries = ledgerEntries.filter(l => l.task_id === taskId);
  const taskTimeEntries = timeEntries.filter(e => e.task_id === taskId);
  
  return calculateProjectMetrics(taskPlanningLines, taskLedgerEntries, taskTimeEntries, []);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format hours
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

/**
 * Get status color based on variance
 */
export function getVarianceStatus(variance: number): 'positive' | 'negative' | 'neutral' {
  if (variance > 0) return 'positive'; // Under budget
  if (variance < 0) return 'negative'; // Over budget
  return 'neutral';
}

/**
 * Get completion status color
 */
export function getCompletionStatus(percentage: number): 'low' | 'medium' | 'high' | 'complete' {
  if (percentage >= 100) return 'complete';
  if (percentage >= 75) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}
