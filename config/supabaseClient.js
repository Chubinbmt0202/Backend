import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Đã khởi tạo Supabase Client.');
} else {
  console.warn('WARNING: SUPABASE_URL hoặc SUPABASE_KEY chưa được thiết lập trong file .env');
}

export default supabase;
