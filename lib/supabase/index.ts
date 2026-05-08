import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

export const createSupabaseClient = () =>
  createClient(
    supabaseUrl!,
    supabaseKey!,
  );
