import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Building2, UserSquare2, UserPlus, TrendingUp, Zap, ScrollText, Receipt, Gauge, FolderKanban, CalendarDays, FileText, SplitSquareHorizontal, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  entity: string;
  url: string;
  icon: React.ElementType;
};

type EntityConfig = {
  table: string;
  label: string;
  icon: React.ElementType;
  url: string;
  fields: string[];
  titleField?: string;
  titleFn?: (r: any) => string;
  subtitleField?: string;
};

const ENTITY_CONFIG: EntityConfig[] = [
  { table: "accounts", label: "Account", icon: Building2, url: "/crm/accounts", fields: ["name", "email", "phone", "industry"], titleField: "name", subtitleField: "industry" },
  { table: "contacts", label: "Contact", icon: UserSquare2, url: "/crm/contacts", fields: ["first_name", "last_name", "email", "phone"], titleFn: (r: any) => `${r.first_name} ${r.last_name}`, subtitleField: "email" },
  { table: "leads", label: "Lead", icon: UserPlus, url: "/crm/leads", fields: ["first_name", "last_name", "email", "company"], titleFn: (r: any) => `${r.first_name} ${r.last_name}`, subtitleField: "company" },
  { table: "opportunities", label: "Opportunity", icon: TrendingUp, url: "/crm/opportunities", fields: ["name", "stage", "description"], titleField: "name", subtitleField: "stage" },
  { table: "contracts", label: "Contract", icon: ScrollText, url: "/crm/contracts", fields: ["name", "contract_number", "status"], titleField: "name", subtitleField: "contract_number" },
  { table: "invoices", label: "Invoice", icon: Receipt, url: "/crm/invoices", fields: ["invoice_number", "status"], titleField: "invoice_number", subtitleField: "status" },
  { table: "projects", label: "Program", icon: ClipboardList, url: "/projects", fields: ["name", "program_type", "utility", "status"], titleField: "name", subtitleField: "program_type" },
  { table: "measures", label: "Measure", icon: Gauge, url: "/crm/measures", fields: ["name", "measure_type", "status"], titleField: "name", subtitleField: "measure_type" },
  { table: "buildings", label: "Building", icon: FolderKanban, url: "/crm/buildings", fields: ["name", "building_type", "address_city"], titleField: "name", subtitleField: "building_type" },
  { table: "activities", label: "Activity", icon: CalendarDays, url: "/crm/activities", fields: ["subject", "activity_type", "status"], titleField: "subject", subtitleField: "activity_type" },
  { table: "quotes", label: "Quote", icon: FileText, url: "/crm/quotes", fields: ["name", "quote_number", "status"], titleField: "name", subtitleField: "quote_number" },
  { table: "commission_splits", label: "Commission", icon: SplitSquareHorizontal, url: "/crm/commission-splits", fields: ["sales_rep_name", "sales_rep_email", "status"], titleField: "sales_rep_name", subtitleField: "status" },
];

const entityColors: Record<string, string> = {
  Account: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Contact: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Lead: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Opportunity: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  Contract: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  Invoice: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  Program: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  Measure: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  Building: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  Activity: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  Quote: "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  Commission: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
};

interface GlobalSearchProps {
  brandingColor?: string | null;
}

export default function GlobalSearch({ brandingColor }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const showDropdown = focused && query.length >= 1;

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const searchTerm = `%${q}%`;
    try {
      const promises = ENTITY_CONFIG.map(async (entity) => {
        const orFilters = entity.fields.map(f => `${f}.ilike.${searchTerm}`).join(",");
        const { data } = await (supabase.from(entity.table as any).select("*").or(orFilters).limit(5) as any);
        if (!data || data.length === 0) return [];
        return data.map((row: any): SearchResult => ({
          id: row.id,
          title: entity.titleFn ? entity.titleFn(row) : row[entity.titleField || "name"] || "Untitled",
          subtitle: entity.subtitleField ? (row[entity.subtitleField] || "") : "",
          entity: entity.label,
          url: entity.url,
          icon: entity.icon,
        }));
      });
      const allResults = (await Promise.all(promises)).flat();
      setResults(allResults.slice(0, 25));
      setSelectedIndex(0);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const selectResult = (result: SearchResult) => {
    navigate(result.url);
    setQuery("");
    setFocused(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const hasBranding = !!brandingColor;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-md">
      {/* Search Input */}
      <div
        className="flex items-center gap-2 h-9 rounded-full px-3 transition-colors"
        style={{
          backgroundColor: hasBranding
            ? (focused ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)')
            : (focused ? 'hsl(var(--accent))' : 'hsl(var(--muted))'),
          border: hasBranding
            ? '1px solid rgba(255,255,255,0.25)'
            : '1px solid hsl(var(--border))',
        }}
      >
        <Search
          className="h-4 w-4 flex-shrink-0"
          style={{ color: hasBranding ? 'rgba(255,255,255,0.6)' : 'hsl(var(--muted-foreground))' }}
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search accounts, contacts..."
          className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:opacity-60"
          style={{
            color: hasBranding ? '#ffffff' : 'hsl(var(--foreground))',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: hasBranding ? '#ffffff' : 'hsl(var(--muted-foreground))' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!query && (
          <kbd
            className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded px-1.5 font-mono text-[10px] font-medium flex-shrink-0"
            style={{
              backgroundColor: hasBranding ? 'rgba(255,255,255,0.15)' : 'hsl(var(--muted))',
              color: hasBranding ? 'rgba(255,255,255,0.5)' : 'hsl(var(--muted-foreground))',
              border: hasBranding ? '1px solid rgba(255,255,255,0.2)' : '1px solid hsl(var(--border))',
            }}
          >
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown Results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-[100] overflow-hidden">
          <div ref={listRef} className="max-h-[360px] overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results for "{query}"
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}

            {!loading && results.map((result, i) => {
              const Icon = result.icon;
              return (
                <button
                  key={`${result.entity}-${result.id}`}
                  onClick={() => selectResult(result)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0",
                    i === selectedIndex && "bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", entityColors[result.entity])}>
                    {result.entity}
                  </Badge>
                </button>
              );
            })}
          </div>

          {results.length > 0 && (
            <div className="border-t px-3 py-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↵</kbd> open</span>
              <span className="ml-auto">{results.length} result{results.length !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
