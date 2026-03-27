import { useEffect } from "react";
import { useTenantBranding } from "@/hooks/useTenantBranding";

// Convert hex color to HSL format for CSS variables
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
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

// Allowlisted CSS properties for custom styling
const ALLOWED_CSS_PROPERTIES = new Set([
  // Colors
  'color', 'background-color', 'background', 'border-color', 'outline-color',
  // Typography
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 
  'letter-spacing', 'text-align', 'text-decoration', 'text-transform',
  // Spacing
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  // Borders
  'border', 'border-width', 'border-style', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  // Sizing
  'width', 'max-width', 'min-width', 'height', 'max-height', 'min-height',
  // Layout
  'display', 'flex', 'flex-direction', 'justify-content', 'align-items',
  'gap', 'grid-template-columns', 'grid-template-rows',
  // Other safe properties
  'opacity', 'visibility', 'overflow', 'box-shadow', 'transition',
  'transform', 'cursor', 'z-index',
]);

// Dangerous patterns that should never be allowed
const DANGEROUS_PATTERNS = [
  /url\s*\(/gi,           // url() can exfiltrate data
  /@import/gi,            // @import can load external resources
  /expression\s*\(/gi,    // IE expression() is dangerous
  /behavior\s*:/gi,       // IE behavior property
  /javascript\s*:/gi,     // javascript: protocol
  /-moz-binding/gi,       // Mozilla XBL binding
  /binding\s*:/gi,        // Generic binding
  /<\s*script/gi,         // script tags
  /<\s*style/gi,          // nested style tags
];

/**
 * Sanitizes custom CSS by:
 * 1. Blocking dangerous patterns (url(), @import, expression(), etc.)
 * 2. Only allowing safe CSS properties from allowlist
 */
function sanitizeCustomCSS(css: string): string {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(css)) {
      console.warn('Blocked dangerous CSS pattern:', pattern);
      return '/* Blocked: dangerous pattern detected */';
    }
  }

  // Parse and filter CSS rules
  try {
    const sanitizedRules: string[] = [];
    
    // Split by closing brace to get individual rule blocks
    const ruleBlocks = css.split('}');
    
    for (const block of ruleBlocks) {
      if (!block.trim()) continue;
      
      const selectorEnd = block.indexOf('{');
      if (selectorEnd === -1) continue;
      
      const selector = block.substring(0, selectorEnd).trim();
      const declarations = block.substring(selectorEnd + 1).trim();
      
      // Validate selector (basic check - no javascript, no external references)
      if (DANGEROUS_PATTERNS.some(p => p.test(selector))) {
        console.warn('Blocked dangerous selector:', selector);
        continue;
      }
      
      // Parse and filter declarations
      const sanitizedDeclarations: string[] = [];
      const declarationParts = declarations.split(';');
      
      for (const decl of declarationParts) {
        const colonIndex = decl.indexOf(':');
        if (colonIndex === -1) continue;
        
        const property = decl.substring(0, colonIndex).trim().toLowerCase();
        const value = decl.substring(colonIndex + 1).trim();
        
        // Check if property is allowed
        if (!ALLOWED_CSS_PROPERTIES.has(property)) {
          console.warn('Blocked non-allowlisted CSS property:', property);
          continue;
        }
        
        // Check value for dangerous patterns
        if (DANGEROUS_PATTERNS.some(p => p.test(value))) {
          console.warn('Blocked dangerous CSS value:', value);
          continue;
        }
        
        sanitizedDeclarations.push(`${property}: ${value}`);
      }
      
      if (sanitizedDeclarations.length > 0) {
        sanitizedRules.push(`${selector} { ${sanitizedDeclarations.join('; ')}; }`);
      }
    }
    
    return sanitizedRules.join('\n');
  } catch (error) {
    console.error('Error sanitizing CSS:', error);
    return '/* Error: could not parse CSS */';
  }
}

function isAllowedBrandAssetUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host === window.location.hostname ||
      host.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: branding } = useTenantBranding();

  useEffect(() => {
    if (!branding) return;

    // Update page title
    if (branding.company_name) {
      document.title = `${branding.company_name} - Business Center`;
    }

    // Update favicon
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'icon';
      link.href = isAllowedBrandAssetUrl(branding.favicon_url) ? branding.favicon_url : "/favicon.ico";
      if (!document.querySelector("link[rel*='icon']")) {
        document.head.appendChild(link);
      }
    }

    // Apply custom colors (convert hex to HSL)
    const root = document.documentElement;
    if (branding.primary_color) {
      try {
        const hslColor = hexToHSL(branding.primary_color);
        root.style.setProperty('--primary', hslColor);
      } catch (e) {
        console.warn('Invalid primary color format:', branding.primary_color);
      }
    }
    if (branding.secondary_color) {
      try {
        const hslColor = hexToHSL(branding.secondary_color);
        root.style.setProperty('--secondary', hslColor);
      } catch (e) {
        console.warn('Invalid secondary color format:', branding.secondary_color);
      }
    }
    if (branding.accent_color) {
      try {
        const hslColor = hexToHSL(branding.accent_color);
        root.style.setProperty('--accent', hslColor);
      } catch (e) {
        console.warn('Invalid accent color format:', branding.accent_color);
      }
    }

    // Apply font family
    if (branding.font_family) {
      root.style.setProperty('--font-sans', branding.font_family);
    }

    // Apply sidebar color
    if (branding.sidebar_color) {
      try {
        const hslColor = hexToHSL(branding.sidebar_color);
        root.style.setProperty('--sidebar-background', hslColor);
      } catch (e) {
        console.warn('Invalid sidebar color format:', branding.sidebar_color);
      }
    }

    // Apply heading font color
    if (branding.heading_font_color) {
      try {
        const hslColor = hexToHSL(branding.heading_font_color);
        root.style.setProperty('--sidebar-foreground', hslColor);
      } catch (e) {
        console.warn('Invalid heading font color format:', branding.heading_font_color);
      }
    }

    // Apply menu font color
    if (branding.menu_font_color) {
      try {
        const hslColor = hexToHSL(branding.menu_font_color);
        root.style.setProperty('--sidebar-accent-foreground', hslColor);
      } catch (e) {
        console.warn('Invalid menu font color format:', branding.menu_font_color);
      }
    }

    // Inject sanitized custom CSS
    if (branding.custom_css) {
      const styleId = 'tenant-custom-css';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      // Sanitize CSS before injecting
      const sanitizedCSS = sanitizeCustomCSS(branding.custom_css);
      styleElement.textContent = sanitizedCSS;
    }

    return () => {
      // Cleanup custom CSS on unmount
      const styleElement = document.getElementById('tenant-custom-css');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [branding]);

  return <>{children}</>;
}
