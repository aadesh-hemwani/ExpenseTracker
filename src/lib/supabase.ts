import { createClient } from '@supabase/supabase-js';

// These environment variables will need to be set in .env
// Defaults are provided for now so the app won't crash before setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
