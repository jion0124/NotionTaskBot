import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!; // サーバーサイドはService Key推奨

export const supabase = createClient(supabaseUrl, supabaseKey); 