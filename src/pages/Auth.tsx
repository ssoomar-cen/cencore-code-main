import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useBranding } from "@/components/BrandingProvider";
import { Mail, Lock } from "lucide-react";



export default function Auth() {
  const navigate = useNavigate();
  const branding = useBranding();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) navigate("/");
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Signed in successfully");
        navigate("/");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Check your email to confirm your account");
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Check your email for a password reset link");
    }
    setLoading(false);
  };

  const primaryColor = branding.primary_color || "#008552";
  const secondaryColor = branding.secondary_color || "#004d31";
  const accentColor = branding.accent_color || "#00b371";

  const inputClass =
    "h-12 rounded-full border border-gray-200 bg-gray-50/50 pl-12 pr-4 text-base placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-offset-0";

  const buttonGradient = {
    background: `linear-gradient(135deg, ${accentColor}, ${primaryColor})`,
  };

  const renderTagline = () => {
    if (!branding.tagline) return null;
    const parts = branding.tagline.split(/M\s*&\s*S\s*Dynamics/i);
    if (parts.length > 1) {
      return (
        <p className="text-xs text-white/60 mt-2">
          {parts[0]}
          <a
            href="https://mnsdynamics.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 hover:text-white/90 hover:underline transition-colors"
          >
            M &amp; S Dynamics
          </a>
          {parts[1]}
        </p>
      );
    }
    return <p className="text-xs text-white/60 mt-2">{branding.tagline}</p>;
  };

  if (showForgotPassword) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: `linear-gradient(160deg, ${secondaryColor} 0%, ${primaryColor} 100%)` }}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <img src={branding.logo_url || ''} alt={branding.company_name} className="h-14 w-auto object-contain" />

          <div className="w-full rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-xl">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-light tracking-tight text-gray-800">
                Reset Password
              </h1>
              <p className="text-sm text-gray-400 mt-1">Enter your email to receive a reset link</p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-full text-white text-sm font-semibold tracking-wider uppercase border-0"
                disabled={loading}
                style={buttonGradient}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-gray-700 hover:underline"
                onClick={() => setShowForgotPassword(false)}
              >
                Back to Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(160deg, ${secondaryColor} 0%, ${primaryColor} 100%)` }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="text-center">
          <img src={branding.logo_url || ''} alt={branding.company_name} className="h-14 w-auto object-contain mx-auto" />
          <p className="text-sm tracking-wide text-white/80 mt-4">
            {branding.company_name}
          </p>
          {renderTagline()}
        </div>

        {/* Form Card */}
        <div className="w-full rounded-2xl bg-white/95 backdrop-blur-sm p-8 shadow-xl">
          <h1 className="text-2xl font-light tracking-tight text-gray-800 text-center mb-6">
            {isLogin ? "Sign In" : "Create Account"}
          </h1>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot password?
                </button>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 rounded-full text-white text-sm font-semibold tracking-wider uppercase border-0"
              disabled={loading}
              style={buttonGradient}
            >
              {loading ? "Loading..." : isLogin ? "Continue" : "Sign Up"}
            </Button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-5">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              className="font-medium hover:underline"
              style={{ color: primaryColor }}
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
