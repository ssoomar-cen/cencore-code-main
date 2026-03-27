import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}

interface KanbanItem {
  id: string;
  status: string;
  [key: string]: any;
}

interface GenericKanbanProps<T extends KanbanItem> {
  items: T[];
  columns: KanbanColumn[];
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: string) => void;
  renderCard: (item: T) => React.ReactNode;
  getItemTitle?: (item: T) => string;
  onView?: (item: T) => void;
}

function SortableCard<T extends KanbanItem>({
  item,
  onEdit,
  onDelete,
  onView,
  color,
  renderCard,
}: {
  item: T;
  onEdit: (item: T) => void;
  onDelete: (id: string) => void;
  onView?: (item: T) => void;
  color: string;
  renderCard: (item: T) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className="p-3 bg-card rounded-lg border shadow-sm space-y-2 cursor-pointer hover:shadow-md transition-shadow"
        onClick={(e) => {
          e.stopPropagation();
          if (onView) {
            onView(item);
          } else {
            onEdit(item);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">{renderCard(item)}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(item);
                  }}
                >
                  View Details
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function DroppableColumn({ 
  columnId, 
  children 
}: { 
  columnId: string; 
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: columnId,
  });

  return (
    <div ref={setNodeRef} className="space-y-3 min-h-[200px]">
      {children}
    </div>
  );
}

export function GenericKanban<T extends KanbanItem>({
  items,
  columns,
  onEdit,
  onDelete,
  onStatusChange,
  renderCard,
  onView,
}: GenericKanbanProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getItemsByStatus = (status: string) =>
    items.filter((item) => item.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeItem = items.find((item) => item.id === active.id);
    const overId = over.id as string;
    
    // Check if we're over a column
    const overColumn = columns.find((col) => col.id === overId);
    
    if (activeItem && overColumn && activeItem.status !== overColumn.id) {
      onStatusChange(activeItem.id, overColumn.id);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeItem = items.find((item) => item.id === active.id);
      const overId = over.id as string;
      
      // Check if we're over a column
      const overColumn = columns.find((col) => col.id === overId);
      
      if (activeItem && overColumn && activeItem.status !== overColumn.id) {
        onStatusChange(activeItem.id, overColumn.id);
      }
    }
    
    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnItems = getItemsByStatus(column.id);
          return (
            <div key={column.id} className="space-y-3">
              <div
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  {column.title}
                  <Badge variant="secondary" className="text-xs">
                    {columnItems.length}
                  </Badge>
                </h3>
              </div>

              <DroppableColumn columnId={column.id}>
                <SortableContext items={columnItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  {columnItems.map((item) => (
                    <SortableCard
                      key={item.id}
                      item={item}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onView={onView}
                      color={column.color}
                      renderCard={renderCard}
                    />
                  ))}
                </SortableContext>
              </DroppableColumn>
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="p-3 bg-card rounded-lg border shadow-lg opacity-90">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
