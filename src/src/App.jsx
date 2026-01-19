import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

function App() {
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)

  // 1. Vérifier la connexion
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchData()
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchData()
    })
  }, [])

  // 2. Récupérer les données
  async function fetchData() {
    // Les stats
    const { data: dataStats } = await supabase.from('stats_labo').select('*').single()
    setStats(dataStats)
    // Les dossiers
    const { data: dataBilans } = await supabase.from('bilans').select('*').order('created_at', { ascending: false })
    setBilans(dataBilans || [])
  }

  // 3. Action : Changer statut
  async function changerStatut(id, nouveauStatut) {
    await supabase.from('bilans').update({ statut: nouveauStatut }).eq('id', id)
    fetchData()
  }

  // 4. Action : Connexion / Déconnexion
  const signIn = async () => {
     const email = prompt("Email")
     const password = prompt("Mot de passe")
     const { error } = await supabase.auth.signInWithPassword({ email, password })
     if (error) alert(error.message)
  }
  const signOut = async () => { await supabase.auth.signOut(); setBilans([]); setStats(null); }

  // 5. Affichage
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>🔬 Pasteur Algérie - Labo</h1>
        {user ? <button onClick={signOut}>Déconnexion</button> : <button onClick={signIn}>Connexion Staff</button>}
      </header>

      {!user ? <p>Connectez-vous pour voir les dossiers.</p> : (
        <>
          {stats && (
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <div style={{ background: '#e3f2fd', padding: '15px' }}>⏳ Attente: {stats.dossiers_en_attente}</div>
              <div style={{ background: '#fff3e0', padding: '15px' }}>⚙️ En cours: {stats.dossiers_en_cours}</div>
              <div style={{ background: '#e8f5e9', padding: '15px' }}>✅ Finis: {stats.dossiers_termines}</div>
            </div>
          )}
          <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#eee' }}><th>Patient</th><th>Analyse</th><th>Statut</th><th>Action</th></tr>
            </thead>
            <tbody>
              {bilans.map(b => (
                <tr key={b.id}>
                  <td>{b.nom_patient} {b.prenom_patient}</td>
                  <td>{b.type_analyse}</td>
                  <td>{b.statut}</td>
                  <td>
                    {b.statut === 'en_attente' && <button onClick={() => changerStatut(b.id, 'en_cours')}>Lancer</button>}
                    {b.statut === 'en_cours' && <button onClick={() => changerStatut(b.id, 'termine')}>Terminer</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

export default App
