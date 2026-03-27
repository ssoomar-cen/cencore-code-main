import { supabase } from "@/integrations/supabase/client";

/**
 * Get display name for a user with email fallback
 * Priority: Full Name > Email > "Unknown"
 */
export const getUserDisplayName = (
  user: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined
): string => {
  if (!user) return "Unassigned";
  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  if (fullName) return fullName;
  if (user.email) return user.email;
  return "Unknown";
};

/**
 * Fetch single user display info including email from auth.users
 */
export const fetchUserDisplayInfo = async (userId: string | null | undefined) => {
  if (!userId) return null;
  
  const { data, error } = await supabase.rpc("get_user_display_info", { _user_id: userId });
  
  if (error) {
    console.error("Error fetching user display info:", error);
    return null;
  }
  
  return data?.[0] || null;
};

/**
 * Fetch multiple users display info including emails from auth.users
 */
export const fetchUsersDisplayInfo = async (userIds: (string | null | undefined)[]) => {
  const validIds = userIds.filter((id): id is string => !!id);
  if (validIds.length === 0) return [];
  
  const uniqueIds = [...new Set(validIds)];
  
  const { data, error } = await supabase.rpc("get_users_display_info", { _user_ids: uniqueIds });
  
  if (error) {
    console.error("Error fetching users display info:", error);
    return [];
  }
  
  return data || [];
};

/**
 * Merge email info into owner object
 */
export const mergeOwnerEmail = <T extends { owner?: { id?: string; first_name?: string | null; last_name?: string | null } | null }>(
  entity: T,
  userInfos: { id: string; email: string | null }[]
): T => {
  if (!entity?.owner?.id) return entity;
  
  const userInfo = userInfos.find(u => u.id === entity.owner?.id);
  if (userInfo) {
    return {
      ...entity,
      owner: {
        ...entity.owner,
        email: userInfo.email
      }
    };
  }
  return entity;
};
