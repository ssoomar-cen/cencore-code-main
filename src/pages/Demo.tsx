import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/cenergistic-api/client";
import { toast } from "sonner";

const Demo = () => {
  const navigate = useNavigate();
  const params = useParams();
  const path = params["*"] || "dashboard";

  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Check if already authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Already logged in, just navigate
          navigate(`/${path}`, { replace: true });
          return;
        }

        // Request a demo session token from the server-side edge function
        const { data: tokenData, error: tokenError } = await supabase.functions.invoke("demo-session", {
          body: { requestedPath: path },
        });

        if (tokenError || !tokenData?.access_token) {
          toast.error("Demo login failed. Please contact support.");
          console.error("Demo session error:", tokenError);
          navigate("/auth");
          return;
        }

        // Sign in with the server-issued session
        const { error } = await supabase.auth.setSession({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
        });

        if (error) {
          toast.error("Demo login failed. Please contact support.");
          console.error("Demo login error:", error);
          navigate("/auth");
          return;
        }

        // Navigate to the requested path
        navigate(`/${path}`, { replace: true });
      } catch (error) {
        console.error("Auto-login error:", error);
        toast.error("An error occurred during demo login");
        navigate("/auth");
      }
    };

    autoLogin();
  }, [navigate, path]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/20">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Loading demo environment...</p>
      </div>
    </div>
  );
};

export default Demo;
