import { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type BrandingData = {
  company_name: string;
  tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
};

const defaultBranding: BrandingData = {
  company_name: "M&S Dynamics Business Center",
  tagline: "Powered by M & S Dynamics",
  logo_url: null,
  favicon_url: null,
  primary_color: "#008552",
  secondary_color: "#004d31",
  accent_color: "#00b371",
  support_email: null,
  support_phone: null,
};

const BrandingContext = createContext<BrandingData>(defaultBranding);

export function useBranding() {
  return useContext(BrandingContext);
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function darken(hex: string, amount: number): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = Math.max(0, parseInt(result[1], 16) - amount);
  const g = Math.max(0, parseInt(result[2], 16) - amount);
  const b = Math.max(0, parseInt(result[3], 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function lighten(hex: string, amount: number): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  const r = Math.min(255, parseInt(result[1], 16) + amount);
  const g = Math.min(255, parseInt(result[2], 16) + amount);
  const b = Math.min(255, parseInt(result[3], 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding } = useQuery({
    queryKey: ["branding-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branding_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!branding) return;
    const root = document.documentElement;

    const primary = branding.primary_color;
    const secondary = branding.secondary_color;
    const accent = branding.accent_color;

    if (primary) {
      const hsl = hexToHsl(primary);
      const hoverHsl = hexToHsl(darken(primary, 20) || primary);
      const lightHsl = hexToHsl(lighten(primary, 40) || primary);
      if (hsl) {
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--ring", hsl);
        root.style.setProperty("--chart-1", hsl);
        root.style.setProperty("--sidebar-background", hsl);
        root.style.setProperty("--sidebar-ring", "0 0% 100%");
        root.style.setProperty("--sidebar-primary", "0 0% 100%");
        root.style.setProperty("--sidebar-foreground", "0 0% 100%");
        root.style.setProperty("--sidebar-accent-foreground", "0 0% 100%");
      }
      if (hoverHsl) {
        root.style.setProperty("--primary-hover", hoverHsl);
        root.style.setProperty("--sidebar-accent", hoverHsl);
        root.style.setProperty("--sidebar-border", hoverHsl);
      }
      if (lightHsl) root.style.setProperty("--primary-light", lightHsl);
    }

    if (accent) {
      const hsl = hexToHsl(accent);
      if (hsl) {
        root.style.setProperty("--accent-foreground", hsl);
        root.style.setProperty("--success", hsl);
      }
    }

    if (secondary) {
      const hsl = hexToHsl(secondary);
      if (hsl) root.style.setProperty("--chart-2", hsl);
    }

    // Update page title
    if (branding.company_name) {
      document.title = branding.company_name;
    }
  }, [branding]);

  const value: BrandingData = branding
    ? {
        company_name: branding.company_name,
        tagline: branding.tagline,
        logo_url: branding.logo_url,
        favicon_url: branding.favicon_url,
        primary_color: branding.primary_color,
        secondary_color: branding.secondary_color,
        accent_color: branding.accent_color,
        support_email: branding.support_email,
        support_phone: branding.support_phone,
      }
    : defaultBranding;

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}
