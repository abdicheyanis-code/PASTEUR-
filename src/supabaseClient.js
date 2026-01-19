import { createClient } from '@supabase/supabase-js'

// J'ai ajouté les guillemets ' ' et le début de l'URL https://
const supabaseUrl = 'https://mcjgmorvpzsbjlgqptdx.supabase.co'

// J'ai ajouté les guillemets ' ' au début et à la fin de la clé
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jamdtb3J2cHpzYmpsZ3FwdGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NDU5MDAsImV4cCI6MjA4NDQyMTkwMH0.4wx4c1LCycvx8BHQ8PQvxXY_Bf48qMD9mZ43k6f8RCo' 

export const supabase = createClient(supabaseUrl, supabaseKey)
