import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  view: "list" | "kanban";
  onViewChange: (view: "list" | "kanban") => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex gap-1 border rounded-lg p-1">
      <Button
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onViewChange("list")}
        className="gap-2"
      >
        <List className="h-4 w-4" />
        List
      </Button>
      <Button
        variant={view === "kanban" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onViewChange("kanban")}
        className="gap-2"
      >
        <LayoutGrid className="h-4 w-4" />
        Kanban
      </Button>
    </div>
  );
}
