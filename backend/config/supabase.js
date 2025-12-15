import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Create Supabase client with service role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper function to verify JWT token
export const verifyToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) throw error;

    return user;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

export default supabase;
