import { createClient } from "@supabase/supabase-js";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";

export const supabase = createClient(supabaseUrl, supabaseKey);