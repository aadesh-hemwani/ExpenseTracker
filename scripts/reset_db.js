import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reset() {
  console.log("Deleting all transfers...");
  await supabase.from('transfers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleting all transactions...");
  await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Deleting all statements...");
  await supabase.from('statements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Done.");
}
reset();
