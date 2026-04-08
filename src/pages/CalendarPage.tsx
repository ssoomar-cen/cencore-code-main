import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, RefreshCw, ArrowRightLeft, ArrowRight, Cloud } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { useOutlookCalendar, OutlookEvent } from "@/hooks/useOutlookCalendar";
import { useTenant } from "@/hooks/useTenant";

type UnifiedEvent = {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  type: string;
  source: "crm" | "outlook";
  location?: string;
  description?: string;
  webLink?: string;
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { activeTenantId } = useTenant();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<UnifiedEvent | null>(null);
  const [syncToOutlook, setSyncToOutlook] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", start_time: "", end_time: "", event_type: "meeting", location: "" });

  const {
    outlookEvents,
    loadingEvents: loadingOutlook,
    refetchEvents,
    pushToOutlook,
    isM365Configured,
    syncDirection,
    setSyncDirection,
  } = useOutlookCalendar();

  // CRM events
  const { data: crmEvents } = useQuery({
    queryKey: ["calendar_events"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("calendar_events").select("*").order("start_time", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  // Create CRM event
  const create = useMutation({
    mutationFn: async (event: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("calendar_events").insert({
        ...event,
        user_id: user?.id,
        tenant_id: activeTenantId,
      });
      if (error) throw error;

      // If sync to Outlook is enabled and M365 configured, push the event
      if (syncToOutlook && isM365Configured && user) {
        try {
          await pushToOutlook.mutateAsync({
            subject: event.title,
            body: event.description || "",
            startDateTime: event.start_time,
            endDateTime: event.end_time || event.start_time,
            userId: user.email || user.id,
          });
        } catch {
          // CRM event created but Outlook sync failed — user already notified by hook
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar_events"] });
      toast.success("Event created");
      setDialogOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Merge CRM + Outlook events
  const unifiedEvents = useMemo<UnifiedEvent[]>(() => {
    const crm: UnifiedEvent[] = (crmEvents || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      start: new Date(e.start_time),
      end: e.end_time ? new Date(e.end_time) : undefined,
      type: e.event_type || "meeting",
      source: "crm" as const,
      location: e.location,
      description: e.description,
    }));

    const outlook: UnifiedEvent[] = (syncDirection === "two-way" ? outlookEvents : []).map((e: OutlookEvent) => ({
      id: e.id,
      title: e.subject,
      start: parseISO(e.start.dateTime),
      end: parseISO(e.end.dateTime),
      type: "outlook",
      source: "outlook" as const,
      location: e.location?.displayName,
      description: e.bodyPreview,
      webLink: e.webLink,
    }));

    return [...crm, ...outlook].sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [crmEvents, outlookEvents, syncDirection]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = monthStart.getDay();
  const paddedDays = [...Array(startPad).fill(null), ...days];

  const getEventsForDay = (day: Date) =>
    unifiedEvents.filter((e) => isSameDay(e.start, day));

  const eventColors: Record<string, string> = {
    meeting: "bg-primary/80",
    call: "bg-blue-500",
    task: "bg-amber-500",
    outlook: "bg-sky-600",
    other: "bg-muted-foreground",
  };

  const handleCreate = () => {
    if (!form.title || !form.start_time) {
      toast.error("Title and start time are required");
      return;
    }
    create.mutate(form);
  };

  const openNewEvent = (date?: Date) => {
    const d = date || new Date();
    setForm({
      title: "",
      description: "",
      start_time: format(d, "yyyy-MM-dd'T'HH:mm"),
      end_time: "",
      event_type: "meeting",
      location: "",
    });
    setSyncToOutlook(isM365Configured);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Calendar</h2>
          <p className="text-muted-foreground">Schedule and manage events</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Sync controls */}
          {isM365Configured && (
            <TooltipProvider>
              <div className="flex items-center gap-2 mr-3 px-3 py-1.5 rounded-md bg-muted/50 border border-border">
                <Cloud className="h-4 w-4 text-sky-500" />
                <span className="text-xs text-muted-foreground">Outlook Sync:</span>
                <Select value={syncDirection} onValueChange={(v) => setSyncDirection(v as any)}>
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-way">
                      <span className="flex items-center gap-1"><ArrowRight className="h-3 w-3" /> CRM → Outlook</span>
                    </SelectItem>
                    <SelectItem value="two-way">
                      <span className="flex items-center gap-1"><ArrowRightLeft className="h-3 w-3" /> Two-way</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchEvents()} disabled={loadingOutlook}>
                      <RefreshCw className={`h-3.5 w-3.5 ${loadingOutlook ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh Outlook events</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          )}
          <Button onClick={() => openNewEvent()}>
            <Plus className="mr-2 h-4 w-4" /> Add Event
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-primary/80" /> Meeting
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Call
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Task
        </div>
        {isM365Configured && syncDirection === "two-way" && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2.5 w-2.5 rounded-full bg-sky-600" /> Outlook
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-px">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
            {paddedDays.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="min-h-[80px] bg-muted/20 rounded" />;
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[80px] p-1 border rounded cursor-pointer hover:bg-accent/50 transition-colors ${
                    isToday ? "bg-primary/5 border-primary/30" : "border-border/50"
                  }`}
                  onClick={() => openNewEvent(day)}
                >
                  <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "d")}
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate text-white cursor-pointer ${eventColors[evt.source === "outlook" ? "outlook" : evt.type] || "bg-primary/60"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailEvent(evt);
                        }}
                      >
                        {evt.source === "outlook" && "📅 "}{evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* New Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>

            {/* Outlook sync toggle */}
            {isM365Configured && (
              <div className="flex items-center justify-between rounded-md border border-border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-sky-500" />
                  <div>
                    <Label className="text-sm">Sync to Outlook</Label>
                    <p className="text-xs text-muted-foreground">Also create this event in your Outlook calendar</p>
                  </div>
                </div>
                <Switch checked={syncToOutlook} onCheckedChange={setSyncToOutlook} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={create.isPending}>
                {create.isPending ? "Creating..." : "Create Event"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={!!detailEvent} onOpenChange={() => setDetailEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailEvent?.title}
              <Badge variant={detailEvent?.source === "outlook" ? "secondary" : "default"} className="text-xs">
                {detailEvent?.source === "outlook" ? "Outlook" : "CRM"}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {detailEvent && (
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Start:</span>
                  <p>{format(detailEvent.start, "PPP p")}</p>
                </div>
                {detailEvent.end && (
                  <div>
                    <span className="text-muted-foreground">End:</span>
                    <p>{format(detailEvent.end, "PPP p")}</p>
                  </div>
                )}
              </div>
              {detailEvent.location && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Location:</span>
                  <p>{detailEvent.location}</p>
                </div>
              )}
              {detailEvent.description && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Description:</span>
                  <p className="whitespace-pre-wrap">{detailEvent.description}</p>
                </div>
              )}
              {detailEvent.webLink && (
                <a href={detailEvent.webLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Open in Outlook →
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
