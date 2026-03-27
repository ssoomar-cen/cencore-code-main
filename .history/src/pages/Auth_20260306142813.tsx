import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/cenergistic-logo.svg";
import logoLight from "@/assets/cenergistic-logo-green.svg";

const Auth = () => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? logo : logoLight;

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Try Supabase auth first
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If Supabase auth fails, try to get a dev token from backend
        const devTokenResponse = await fetch("/auth/dev-token?role=ADMIN");
        if (devTokenResponse.ok) {
          const { token } = await devTokenResponse.json();
          localStorage.setItem("dev_token", token);
          toast.success("Signed in with dev token!");
          navigate("/");
          return;
        }
        throw error;
      }
      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Error signing in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="space-y-4 text-center">
          <img src={logoSrc} alt="Cenergistic" className="h-12 mx-auto" />
          <CardTitle className="text-2xl text-primary">CenCore</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to access your all-in-one business management platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-muted border-border"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => setShowResetDialog(true)}
                className="text-sm text-primary hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              To reset your password, please contact your system administrator. They can update your
              password directly in CenCore.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
