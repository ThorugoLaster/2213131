import { supabase } from "./supabase";

export async function buscarPerfil(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Erro ao buscar perfil:", error);
    return null;
  }

  return data;
}