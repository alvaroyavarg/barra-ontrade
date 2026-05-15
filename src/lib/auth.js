import { supabase, isSupabaseEnabled } from "./supabase.js";

export async function signIn(email, password) {
  if (!isSupabaseEnabled) throw new Error("Supabase no configurado");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (!isSupabaseEnabled) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!isSupabaseEnabled) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function fetchUserProfile(userId) {
  if (!isSupabaseEnabled) return null;
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export function onAuthStateChange(callback) {
  if (!isSupabaseEnabled) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription.unsubscribe;
}
