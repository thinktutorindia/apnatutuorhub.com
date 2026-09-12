import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function run() {
  console.log('Connecting to Supabase URL:', url);
  const { count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  console.log('Total Rows in public.leads table on cloud:', count, error || '');

  const { data, error: err2 } = await supabase
    .from('leads')
    .select('inquiryNumber, classLevel, mode, area, notes')
    .ilike('notes', '%TODAY_PARENTS_SEP_2026%')
    .order('inquiryNumber', { ascending: true })
    .limit(3);

  console.log('Sample rows matching batch tag:', data, err2 || '');
}

run().catch(console.error);
