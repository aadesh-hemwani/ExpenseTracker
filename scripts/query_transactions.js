import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fiqixqxqlonbigqogjfz.supabase.co';
const supabaseKey = 'sb_publishable_Xw8Wt437ea76X7nw2WI2gQ_7uzmyc5B';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('transactions')
    .select('id, account_id, transaction_date, description, amount, category, created_at')
    .order('transaction_date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return;
  }

  console.log(`Total transactions in Supabase: ${data.length}`);
  console.log('Transactions summary by account:');
  const counts = {};
  data.forEach(t => {
    counts[t.account_id] = (counts[t.account_id] || 0) + 1;
  });
  console.log(counts);
}

run();
