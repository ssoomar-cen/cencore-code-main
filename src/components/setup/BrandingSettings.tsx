import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveUser } from "@/hooks/useEffectiveUser";
import { Loader2, Palette, Upload, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Arial",
  "Helvetica",
];

export function BrandingSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const { tenantId, isLoading: isTenantLoading } = useEffectiveUser();

  // Fetch branding settings
  const { data: branding, isLoading } = useQuery({
    queryKey: ['tenant-branding', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('tenant_branding')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Form state
  const [formData, setFormData] = useState({
    company_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#0ea5e9',
    secondary_color: '#8b5cf6',
    accent_color: '#10b981',
    sidebar_color: '#1e293b',
    heading_font_color: '#ffffff',
    menu_font_color: '#94a3b8',
    font_family: 'Inter',
    custom_css: '',
    show_powered_by: true,
    support_email: '',
    support_phone: '',
  });

  // Update form when branding data loads
  useEffect(() => {
    if (branding) {
      setFormData({
        company_name: branding.company_name || '',
        logo_url: branding.logo_url || '',
        favicon_url: branding.favicon_url || '',
        primary_color: branding.primary_color || '#0ea5e9',
        secondary_color: branding.secondary_color || '#8b5cf6',
        accent_color: branding.accent_color || '#10b981',
        sidebar_color: branding.sidebar_color || '#1e293b',
        heading_font_color: branding.heading_font_color || '#ffffff',
        menu_font_color: branding.menu_font_color || '#94a3b8',
        font_family: branding.font_family || 'Inter',
        custom_css: branding.custom_css || '',
        show_powered_by: branding.show_powered_by ?? true,
        support_email: branding.support_email || '',
        support_phone: branding.support_phone || '',
      });
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('Tenant not found');

      const payload = {
        ...formData,
        tenant_id: tenantId,
      };

      if (branding) {
        // Update existing
        const { error } = await supabase
          .from('tenant_branding')
          .update(payload)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('tenant_branding')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-branding'] });
      toast({
        title: "Branding updated",
        description: "Your branding settings have been saved successfully.",
      });
      setIsSaving(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    if (!tenantId) {
      toast({
        title: "Tenant not available",
        description: "Wait for your tenant context to finish loading, then try again.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    saveMutation.mutate();
  };

  if (isTenantLoading || isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Branding & Theme</CardTitle>
          </div>
          <CardDescription>
            Customize your application's appearance and branding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Company Information</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <div className="flex gap-2">
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended size: 200x50px (PNG or SVG)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon_url">Favicon URL</Label>
              <div className="flex gap-2">
                <Input
                  id="favicon_url"
                  value={formData.favicon_url}
                  onChange={(e) => setFormData({ ...formData, favicon_url: e.target.value })}
                  placeholder="https://example.com/favicon.ico"
                />
                <Button variant="outline" size="icon">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended size: 32x32px or 64x64px (ICO, PNG)
              </p>
            </div>
          </div>

          {/* Support Contact */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-4">Support Contact</h3>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="support_email">Support Email</Label>
              <Input
                id="support_email"
                type="email"
                value={formData.support_email}
                onChange={(e) => setFormData({ ...formData, support_email: e.target.value })}
                placeholder="support@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Email address for customer support inquiries
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_phone">Support Phone</Label>
              <Input
                id="support_phone"
                type="tel"
                value={formData.support_phone}
                onChange={(e) => setFormData({ ...formData, support_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
              <p className="text-xs text-muted-foreground">
                Phone number for customer support
              </p>
            </div>
          </div>

          {/* Color Theme */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-4">Color Theme</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    placeholder="#0ea5e9"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="secondary_color"
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    placeholder="#8b5cf6"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accent_color">Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="accent_color"
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    placeholder="#10b981"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sidebar_color">Sidebar Background</Label>
                <div className="flex gap-2">
                  <Input
                    id="sidebar_color"
                    type="color"
                    value={formData.sidebar_color}
                    onChange={(e) => setFormData({ ...formData, sidebar_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.sidebar_color}
                    onChange={(e) => setFormData({ ...formData, sidebar_color: e.target.value })}
                    placeholder="#1e293b"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="heading_font_color">Heading Font Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="heading_font_color"
                    type="color"
                    value={formData.heading_font_color}
                    onChange={(e) => setFormData({ ...formData, heading_font_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.heading_font_color}
                    onChange={(e) => setFormData({ ...formData, heading_font_color: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="menu_font_color">Menu Font Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="menu_font_color"
                    type="color"
                    value={formData.menu_font_color}
                    onChange={(e) => setFormData({ ...formData, menu_font_color: e.target.value })}
                    className="w-20 h-10 cursor-pointer"
                  />
                  <Input
                    value={formData.menu_font_color}
                    onChange={(e) => setFormData({ ...formData, menu_font_color: e.target.value })}
                    placeholder="#94a3b8"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-4">Typography</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font_family">Font Family</Label>
              <Select
                value={formData.font_family}
                onValueChange={(value) => setFormData({ ...formData, font_family: value })}
              >
                <SelectTrigger id="font_family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font} value={font}>
                      <span style={{ fontFamily: font }}>{font}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-4">Advanced</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom_css">Custom CSS</Label>
              <Textarea
                id="custom_css"
                value={formData.custom_css}
                onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                placeholder="/* Add your custom CSS here */"
                className="font-mono text-sm"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Add custom CSS to further customize your application's appearance
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="space-y-0.5">
                <Label htmlFor="show_powered_by">Show "Powered By" Badge</Label>
                <p className="text-sm text-muted-foreground">
                  Display attribution badge in the application footer
                </p>
              </div>
              <Switch
                id="show_powered_by"
                checked={formData.show_powered_by}
                onCheckedChange={(checked) => setFormData({ ...formData, show_powered_by: checked })}
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving || isTenantLoading || !tenantId}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your branding will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-lg border-2 border-dashed space-y-4">
            <div className="flex items-center justify-between">
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="h-10" />
              ) : (
                <div className="h-10 px-4 bg-muted rounded flex items-center">
                  {formData.company_name || 'Your Logo'}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button style={{ backgroundColor: formData.primary_color }}>Primary</Button>
              <Button style={{ backgroundColor: formData.secondary_color }}>Secondary</Button>
              <Button style={{ backgroundColor: formData.accent_color }}>Accent</Button>
            </div>

            <p style={{ fontFamily: formData.font_family }} className="text-sm">
              This is how your text will appear using {formData.font_family}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
