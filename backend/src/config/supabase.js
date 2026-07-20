import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Variables faltantes:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  throw new Error('Missing Supabase environment variables');
}

// Cliente público (para operaciones autenticadas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente admin (para webhooks y operaciones privilegiadas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;