
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
console.log("Supabase URL check:", {
  present: Boolean(supabaseUrl),
  validFormat: /^https?:\/\//i.test(supabaseUrl || ""),
});
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
