import { createClient } from "@supabase/supabase-js";

// --- フロントとサーバー両対応 ---
const supabaseUrl =
  import.meta?.env?.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  import.meta?.env?.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase initialized");
} else {
  console.warn("⚠️ Supabase credentials not found. Database disabled.");
}

export { supabase };
