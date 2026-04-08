
-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "System can insert audit logs" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_audit_log_entity ON public.audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON public.audit_log (user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log (created_at DESC);

-- ============================================
-- WORKFLOW RULES
-- ============================================
CREATE TABLE public.workflow_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  entity_type TEXT NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'create',
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workflow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view workflow rules" ON public.workflow_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert workflow rules" ON public.workflow_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update workflow rules" ON public.workflow_rules FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete workflow rules" ON public.workflow_rules FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_workflow_rules_updated_at BEFORE UPDATE ON public.workflow_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SUPPORT TICKETS
-- ============================================
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- CALENDAR EVENTS
-- ============================================
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  event_type TEXT DEFAULT 'meeting',
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own events" ON public.calendar_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create events" ON public.calendar_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own events" ON public.calendar_events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own events" ON public.calendar_events FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
