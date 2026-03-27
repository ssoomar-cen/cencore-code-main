import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedUserEmail: string | null;
  isImpersonating: boolean;
  isValidatingSession: boolean;
  startImpersonation: (userId: string, userEmail: string) => Promise<boolean>;
  stopImpersonation: () => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState<string | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);

  // Validate impersonation session on mount and when localStorage changes
  const validateSession = useCallback(async () => {
    const stored = localStorage.getItem("impersonation");
    if (!stored) {
      setImpersonatedUserId(null);
      setImpersonatedUserEmail(null);
      setIsValidatingSession(false);
      return;
    }

    try {
      const { userId, userEmail } = JSON.parse(stored);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        localStorage.removeItem("impersonation");
        setImpersonatedUserId(null);
        setImpersonatedUserEmail(null);
        setIsValidatingSession(false);
        return;
      }

      // Validate server-side impersonation session
      const { data: isValid, error } = await supabase
        .rpc('validate_impersonation_session', {
          _admin_user_id: user.id,
          _impersonated_user_id: userId
        });

      if (error || !isValid) {
        // Invalid or expired session - clear localStorage
        localStorage.removeItem("impersonation");
        setImpersonatedUserId(null);
        setImpersonatedUserEmail(null);
      } else {
        // Valid session
        setImpersonatedUserId(userId);
        setImpersonatedUserEmail(userEmail);
      }
    } catch (e) {
      localStorage.removeItem("impersonation");
      setImpersonatedUserId(null);
      setImpersonatedUserEmail(null);
    }
    setIsValidatingSession(false);
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  const startImpersonation = async (userId: string, userEmail: string): Promise<boolean> => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user");
        return false;
      }

      // Check if user can impersonate the target
      const { data: canImpersonate, error: permError } = await supabase
        .rpc('can_impersonate_user', {
          _admin_user_id: user.id,
          _target_user_id: userId
        });

      if (permError || !canImpersonate) {
        console.error("Not authorized to impersonate this user");
        return false;
      }

      // Deactivate any existing sessions for this admin
      await supabase
        .from('impersonation_sessions')
        .update({ is_active: false })
        .eq('admin_user_id', user.id)
        .eq('is_active', true);

      // Create new server-side impersonation session
      const { error: insertError } = await supabase
        .from('impersonation_sessions')
        .insert({
          admin_user_id: user.id,
          impersonated_user_id: userId,
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
        });

      if (insertError) {
        console.error("Failed to create impersonation session:", insertError);
        return false;
      }

      // Store in localStorage only after server-side session is created
      setImpersonatedUserId(userId);
      setImpersonatedUserEmail(userEmail);
      localStorage.setItem("impersonation", JSON.stringify({ userId, userEmail }));
      window.location.reload();
      return true;
    } catch (e) {
      console.error("Error starting impersonation:", e);
      return false;
    }
  };

  const stopImpersonation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Deactivate all impersonation sessions for this admin
        await supabase
          .from('impersonation_sessions')
          .update({ is_active: false })
          .eq('admin_user_id', user.id)
          .eq('is_active', true);
      }
    } catch (e) {
      console.error("Error stopping impersonation:", e);
    }
    
    setImpersonatedUserId(null);
    setImpersonatedUserEmail(null);
    localStorage.removeItem("impersonation");
    window.location.reload();
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId,
        impersonatedUserEmail,
        isImpersonating: !!impersonatedUserId,
        isValidatingSession,
        startImpersonation,
        stopImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}
