import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css' // On charge le style qu'on vient de créer

function App() {
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // États pour le formulaire de connexion
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)

  // 1. Vérifier la connexion au chargement
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

  // 2. Récupérer les données (Stats et Liste)
  async function fetchData() {
    setLoading(true)
    const { data: dataStats } = await supabase.from('stats_labo').select('*').single()
    setStats(dataStats)
    const { data: dataBilans } = await supabase.from('bilans').select('*').order('created_at', { ascending: false })
    setBilans(dataBilans || [])
    setLoading(false)
  }

  // 3. Action : Changer statut
  async function changerStatut(id, nouveauStatut) {
    await supabase.from('bilans').update({ statut: nouveauStatut }).eq('id', id)
    fetchData()
  }

  // 4. Action : Connexion
  const handleLogin = async (e) => {
    e.preventDefault() // Empêche la page de recharger
    setLoading(true)
    setLoginError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError("Email ou mot de passe incorrect.")
    setLoading(false)
  }

  // 5. Action : Déconnexion
  const signOut = async () => {
    await supabase.auth.signOut()
    setBilans([])
    setStats(null)
    setEmail('')
    setPassword('')
  }

  // --- ECRAN DE CONNEXION (Si pas connecté) ---
  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div style={{marginBottom: '20px', fontSize: '50px'}}>🔬</div>
          <h2 style={{color: '#1e293b', marginBottom: '10px'}}>Institut Pasteur</h2>
          <p style={{color: '#64748b', marginBottom: '30px'}}>Portail des Biologistes</p>
          
          <form onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Email professionnel" 
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Mot de passe" 
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            {loginError && <p style={{color: 'red', fontSize: '0.9rem'}}>{loginError}</p>}
            
            <button type="submit" className="btn btn-primary" style={{width: '100%'}} disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- ECRAN PRINCIPAL (DASHBOARD) ---
  return (
    <div className="container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo">
          <h1>Pasteur<span>Lab</span></h1>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <span style={{fontSize: '0.9rem', color: '#64748b'}}>👤 {user.email}</span>
          <button onClick={signOut} className="btn btn-outline">Déconnexion</button>
        </div>
      </nav>

      {/* STATS */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card border-blue">
            <h3>En Attente</h3>
            <p className="value text-blue">{stats.dossiers_en_attente}</p>
          </div>
          <div className="stat-card border-orange">
            <h3>En Cours</h3>
            <p className="value text-orange">{stats.dossiers_en_cours}</p>
          </div>
          <div className="stat-card border-green">
            <h3>Terminés</h3>
            <p className="value text-green">{stats.dossiers_termines}</p>
          </div>
        </div>
      )}

      {/* TABLEAU */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Analyse Demandée</th>
              <th>Statut</th>
              <th>Action Requise</th>
            </tr>
          </thead>
          <tbody>
            {bilans.length === 0 ? (
              <tr><td colSpan="4" style={{textAlign: 'center', padding: '50px', color: '#94a3b8'}}>Aucun dossier en cours pour le moment.</td></tr>
            ) : (
              bilans.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.nom_patient} {b.prenom_patient}</strong>
                    <div style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px'}}>Dossier #{b.id.slice(0,8)}</div>
                  </td>
                  <td>{b.type_analyse}</td>
                  <td>
                    <span className={`badge badge-${b.statut}`}>
                      {b.statut.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    {b.statut === 'en_attente' && (
                      <button onClick={() => changerStatut(b.id, 'en_cours')} className="btn btn-action btn-start">
                        ▶️ Lancer
                      </button>
                    )}
                    {b.statut === 'en_cours' && (
                      <button onClick={() => changerStatut(b.id, 'termine')} className="btn btn-action btn-finish">
                        ✅ Terminer
                      </button>
                    )}
                    {b.statut === 'termine' && <span style={{color: '#cbd5e1'}}>Archivé</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default App
