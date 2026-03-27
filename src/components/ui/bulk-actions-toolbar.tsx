import { Button } from "@/components/ui/button";
import { X, Edit, Trash2, Merge } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMerge?: () => void;
  className?: string;
  customActions?: React.ReactNode;
}

export function BulkActionsToolbar({
  selectedCount,
  onClear,
  onEdit,
  onDelete,
  onMerge,
  className,
  customActions,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "bg-primary text-primary-foreground rounded-lg shadow-lg",
        "px-6 py-3 flex items-center gap-4",
        "animate-in slide-in-from-bottom-5 duration-200",
        className
      )}
    >
      <span className="font-medium">
        {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
      </span>

      <div className="flex items-center gap-2">
        {onEdit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}

        {onMerge && selectedCount >= 2 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onMerge}
            className="gap-2"
          >
            <Merge className="h-4 w-4" />
            Merge
          </Button>
        )}

        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        )}

        {customActions}

        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-2 hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
