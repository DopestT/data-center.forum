import { createSupabaseServerClient } from "./supabase/server";

export async function requireRevenueAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,display_name,role")
    .eq("user_id", user.id)
    .single();

  if (error || !profile || !["moderator", "admin"].includes(profile.role)) {
    throw new Error("Admin access required");
  }

  return { supabase, user, profile };
}
