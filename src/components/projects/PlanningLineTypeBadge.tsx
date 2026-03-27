import { Badge } from "@/components/ui/badge";

export function getLineTypeBadgeStyles(lineType: string | null | undefined) {
  const type = lineType || 'Budget';
  
  switch (type) {
    case 'Billable':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
    case 'Both Budget and Billable':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    case 'Budget':
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
  }
}

export function getLineTypeLabel(lineType: string | null | undefined) {
  const type = lineType || 'Budget';
  
  if (type === 'Both Budget and Billable') {
    return 'Budget & Billable';
  }
  return type;
}

interface PlanningLineTypeBadgeProps {
  lineType: string | null | undefined;
}

export function PlanningLineTypeBadge({ lineType }: PlanningLineTypeBadgeProps) {
  return (
    <Badge 
      variant="outline" 
      className={`${getLineTypeBadgeStyles(lineType)} font-medium`}
    >
      {getLineTypeLabel(lineType)}
    </Badge>
  );
}
