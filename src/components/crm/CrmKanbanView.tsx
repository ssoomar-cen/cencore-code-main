import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KanbanColumn {
  value: string;
  label: string;
}

interface CrmKanbanViewProps {
  data: any[];
  groupField: string;
  columns: KanbanColumn[];
  titleField: string;
  subtitleField?: string;
  badgeField?: string;
  amountField?: string;
  onEdit: (item: any) => void;
  onDelete?: (id: string) => void;
}

export function CrmKanbanView({
  data, groupField, columns, titleField, subtitleField,
  badgeField, amountField, onEdit, onDelete,
}: CrmKanbanViewProps) {
  const grouped = columns.map((col) => ({
    ...col,
    items: data.filter((item) => {
      const val = item[groupField];
      // Handle nested objects (e.g., accounts.name)
      return (val || "").toString().toLowerCase() === col.value.toLowerCase();
    }),
  }));

  // Catch ungrouped items
  const allGroupedValues = columns.map(c => c.value.toLowerCase());
  const ungrouped = data.filter((item) => {
    const val = (item[groupField] || "").toString().toLowerCase();
    return !allGroupedValues.includes(val);
  });

  const allColumns = ungrouped.length > 0
    ? [...grouped, { value: "_other", label: "Other", items: ungrouped }]
    : grouped;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {allColumns.map((col) => (
        <div key={col.value} className="flex-shrink-0 w-72">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
            <Badge variant="secondary" className="text-xs">{col.items.length}</Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="space-y-2 pr-2">
              {col.items.length === 0 ? (
                <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
                  No items
                </div>
              ) : (
                col.items.map((item) => (
                  <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onDoubleClick={() => onEdit(item)}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm leading-tight truncate flex-1">
                          {item[titleField] || "Untitled"}
                        </p>
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(item)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          {onDelete && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(item.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {subtitleField && item[subtitleField] && (
                        <p className="text-xs text-muted-foreground truncate">
                          {typeof item[subtitleField] === "object" ? item[subtitleField]?.name : item[subtitleField]}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        {badgeField && item[badgeField] && (
                          <Badge variant="outline" className="text-xs">{item[badgeField]}</Badge>
                        )}
                        {amountField && item[amountField] && (
                          <span className="text-xs font-medium text-muted-foreground ml-auto">
                            ${Number(item[amountField]).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}
