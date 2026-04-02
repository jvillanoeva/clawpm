import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  'https://oownaladfcjpibmfesmm.supabase.co'

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vd25hbGFkZmNqcGlibWZlc21tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzkzMDksImV4cCI6MjA4ODY1NTMwOX0.Tgj-YtV1caFIBoxXjo5zjTaCerQ2w8KxZTMNHtSyiy0'

export function createServerClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
