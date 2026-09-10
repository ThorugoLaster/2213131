import { supabase } from "./supabase";

export async function testarSupabase() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("Erro ao conectar com Supabase:", error);
    return false;
  }

  console.log("Supabase conectado com sucesso!");
  console.log("Sessão atual:", data.session);

  return true;
}