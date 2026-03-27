import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Check, X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldType = "text" | "number" | "date" | "currency" | "select" | "checkbox" | "textarea";

interface SelectOption {
  value: string;
  label: string;
}

interface EditableFieldProps {
  label: string;
  value: string | number | boolean | null | undefined;
  type?: FieldType;
  options?: SelectOption[];
  onSave?: (value: any) => void;
  isLink?: boolean;
  onLinkClick?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const formatDisplayValue = (value: any, type: FieldType): string => {
  if (value === null || value === undefined || value === "") return "-";
  
  switch (type) {
    case "currency":
      return typeof value === "number" ? `$${value.toLocaleString()}` : value;
    case "date":
      if (!value) return "-";
      try {
        return new Date(value).toLocaleDateString("en-US", { 
          month: "numeric", 
          day: "numeric", 
          year: "numeric" 
        });
      } catch {
        return String(value);
      }
    case "checkbox":
      return value ? "Yes" : "No";
    default:
      return String(value);
  }
};

export const EditableField = ({
  label,
  value,
  type = "text",
  options = [],
  onSave,
  isLink = false,
  onLinkClick,
  disabled = false,
  placeholder,
  className,
}: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<any>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (!onSave) return;
    
    let processedValue = editValue;
    
    if (type === "currency" || type === "number") {
      processedValue = editValue === "" || editValue === null ? null : parseFloat(editValue);
    } else if (type === "date") {
      processedValue = editValue || null;
    }
    
    onSave(processedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  // Checkbox type - inline toggle
  if (type === "checkbox") {
    return (
      <div className={cn("flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]", className)}>
        <span className="text-sm text-muted-foreground">{label}</span>
        <Checkbox 
          checked={!!value} 
          disabled={disabled}
          onCheckedChange={(checked) => onSave?.(!!checked)}
        />
      </div>
    );
  }

  // Display mode
  if (!isEditing) {
    return (
      <div 
        className={cn(
          "flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px] group",
          !disabled && "cursor-pointer hover:bg-muted/50",
          className
        )}
        onClick={() => !disabled && setIsEditing(true)}
      >
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {isLink && onLinkClick ? (
            <span 
              className="text-sm text-primary cursor-pointer hover:underline" 
              onClick={(e) => {
                e.stopPropagation();
                onLinkClick();
              }}
            >
              {formatDisplayValue(value, type)}
            </span>
          ) : (
            <span className="text-sm">{formatDisplayValue(value, type)}</span>
          )}
          {!disabled && (
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className={cn("flex justify-between items-center border-b border-border/50 pb-2 min-h-[36px]", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {type === "select" ? (
          <Select
            value={editValue || ""}
            onValueChange={(val) => {
              setEditValue(val);
              onSave?.(val);
              setIsEditing(false);
            }}
          >
            <SelectTrigger className="h-7 w-[140px] text-sm">
              <SelectValue placeholder={placeholder || "Select..."} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            ref={inputRef}
            type={type === "currency" || type === "number" ? "number" : type === "date" ? "date" : "text"}
            value={editValue ?? ""}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 w-[140px] text-sm"
            step={type === "currency" ? "0.01" : undefined}
          />
        )}
        {type !== "select" && (
          <>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSave}>
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
              <X className="h-3 w-3 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

// Specialized variants for common patterns
export const EditableDetailRow = EditableField;
