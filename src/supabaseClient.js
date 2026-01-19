import { createClient } from '@supabase/supabase-js'

// --- REMPLACE CES DEUX LIGNES PAR TES INFOS SUPABASE ---
const supabaseUrl = 'https://ton-url-ici.supabase.co' 
const supabaseKey = 'ta-cle-publique-ici'
// -------------------------------------------------------

export const supabase = createClient(supabaseUrl, supabaseKey)
