
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project credentials
// You can find these in your Supabase Dashboard -> Project Settings -> API
const supabaseUrl = 'https://znolztujdzctyhcjlrge.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpub2x6dHVqZHpjdHloY2pscmdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzgwNTgsImV4cCI6MjA4MDk1NDA1OH0.f9ir6Fq1Q8GHnUXme-0dJkDi-hh6JePmlKKnQ2GEt20';

if (supabaseUrl.includes('YOUR_PROJECT_ID')) {
    console.warn("⚠️ Supabase credentials are missing in services/supabase.ts. The app will run in offline/fallback mode using LocalStorage.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
