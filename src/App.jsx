import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBilan, setCurrentBilan] = useState(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchData()
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchData()
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: statsData } = await supabase.from('stats_labo').select('*').single()
    setStats(statsData)
    const { data: bilansData } = await supabase.from('bilans').select('*').order('created_at', { ascending: false })
    setBilans(bilansData || [])
    setLoading(false)
  }

  const openNewBilan = () => {
    setCurrentBilan({ nom_patient: '', prenom_patient: '', age_patient: '', type_analyse: '', statut: 'en_attente', resultat_analyse: '' })
    setIsModalOpen(true)
  }

  const openEditBilan = (bilan) => {
    setCurrentBilan(bilan)
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    const dataToSave = {
      nom_patient: currentBilan.nom_patient,
      prenom_patient: currentBilan.prenom_patient,
      age_patient: currentBilan.age_patient,
      type_analyse: currentBilan.type_analyse,
      statut: currentBilan.statut,
      resultat_analyse: currentBilan.resultat_analyse,
      date_fin_analyse: currentBilan.statut === 'termine' ? new Date() : null
    }

    if (currentBilan.id) {
      await supabase.from('bilans').update(dataToSave).eq('id', currentBilan.id)
    } else {
      await supabase.from('bilans').insert([{ ...dataToSave, cree_par: user.id }])
    }
    setIsModalOpen(false)
    fetchData()
  }

  const handleDelete = async (id) => {
    if (confirm("Supprimer ce dossier ?")) {
      await supabase.from('bilans').delete().eq('id', id)
      fetchData()
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Erreur connexion")
  }

  const filteredBilans = bilans.filter(b => 
    b.nom_patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.prenom_patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.includes(searchTerm)
  )

  // --- RENDU ---
  
  // LE BACKGROUND ANIMÉ (BACTÉRIES)
  const Background = () => (
    <div className="bio-background">
      <ul className="bacteria-list">
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
        <li className="bacteria"></li>
      </ul>
    </div>
  )

  if (!user) {
    return (
      <>
        <Background />
        <div className="login-container">
          <div className="login-card">
            <h1 style={{fontSize: '3rem', marginBottom: '10px'}}>🧬</h1>
            <h2 style={{color: 'white', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '3px'}}>Pasteur<span style={{color: 'var(--primary)'}}>Lab</span></h2>
            <p style={{color: '#94a3b8', marginBottom: '30px', fontSize: '0.9rem'}}>Secure LIMS Access</p>
            <form onSubmit={handleLogin}>
              <div style={{marginBottom: '15px'}}>
                <input className="search-input" style={{borderRadius: '12px', textAlign: 'center'}} type="email" placeholder="Identifiant" value={email} onChange={e=>setEmail(e.target.value)} />
              </div>
              <div style={{marginBottom: '20px'}}>
                <input className="search-input" style={{borderRadius: '12px', textAlign: 'center'}} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{width:'100%', padding: '15px'}}>Initialiser Connexion</button>
            </form>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Background />
      <div className="container">
        <nav className="navbar">
          <div className="logo"><h1>Pasteur<span>Algérie</span></h1></div>
          <div style={{display:'flex', gap:'15px', alignItems: 'center'}}>
            <span style={{fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px'}}>Système Connecté</span>
            <button className="btn btn-edit" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
          </div>
        </nav>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card" style={{'--color-glow': '#38bdf8'}}>
              <h3>En Attente</h3><p className="value">{stats.dossiers_en_attente}</p>
            </div>
            <div className="stat-card" style={{'--color-glow': '#fb923c'}}>
              <h3>En Cours</h3><p className="value">{stats.dossiers_en_cours}</p>
            </div>
            <div className="stat-card" style={{'--color-glow': '#4ade80'}}>
              <h3>Terminés</h3><p className="value">{stats.dossiers_termines}</p>
            </div>
          </div>
        )}

        <div style={{display: 'flex', gap: '20px', marginBottom: '30px'}}>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Rechercher un patient dans la base..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-primary" style={{whiteSpace: 'nowrap'}} onClick={openNewBilan}>
            + Nouveau Dossier
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Analyse</th>
                <th>Résultat / Statut</th>
                <th style={{textAlign: 'right'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBilans.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong style={{color: 'white', fontSize: '1rem'}}>{b.nom_patient} {b.prenom_patient}</strong>
                    <div style={{fontSize:'0.8em', color:'#64748b', marginTop: '5px'}}>ID: {b.id.slice(0,8)} • {b.age_patient} ans</div>
                  </td>
                  <td style={{color: 'var(--primary)', fontWeight: '600'}}>{b.type_analyse}</td>
                  <td>
                    <span className={`badge badge-${b.statut}`}>{b.statut.replace('_', ' ')}</span>
                    {b.resultat_analyse && (
                      <div style={{marginTop:'8px', fontSize:'0.85em', color: '#cbd5e1', borderLeft: '2px solid var(--primary)', paddingLeft: '8px'}}>
                        {b.resultat_analyse}
                      </div>
                    )}
                  </td>
                  <td style={{textAlign: 'right'}}>
                    <button className="btn btn-action btn-edit" style={{marginRight: '8px'}} onClick={() => openEditBilan(b)}>Éditer</button>
                    <button className="btn btn-action btn-danger" onClick={() => handleDelete(b.id)}>Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }} onClick={() => setIsModalOpen(false)}>
            <div className="modal" style={{padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '500px'}} onClick={e => e.stopPropagation()}>
              <h2 style={{marginTop:0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '1.2rem'}}>
                {currentBilan.id ? 'Mise à jour Dossier' : 'Création Dossier'}
              </h2>
              
              <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                <div style={{display:'flex', gap:'10px'}}>
                  <div style={{flex:1}}>
                    <label style={{color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'block'}}>Nom</label>
                    <input className="form-input" style={{width: '100%', boxSizing: 'border-box'}} required value={currentBilan.nom_patient} onChange={e => setCurrentBilan({...currentBilan, nom_patient: e.target.value})} />
                  </div>
                  <div style={{flex:1}}>
                    <label style={{color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'block'}}>Prénom</label>
                    <input className="form-input" style={{width: '100%', boxSizing: 'border-box'}} required value={currentBilan.prenom_patient} onChange={e => setCurrentBilan({...currentBilan, prenom_patient: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label style={{color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'block'}}>Type d'analyse</label>
                  <select className="form-input" style={{width: '100%', boxSizing: 'border-box'}} value={currentBilan.type_analyse} onChange={e => setCurrentBilan({...currentBilan, type_analyse: e.target.value})}>
                    <option value="">-- Sélectionner --</option>
                    <option value="FNS Completo">FNS Completo</option>
                    <option value="PCR Covid-19">PCR Covid-19</option>
                    <option value="Bilan Lipidique">Bilan Lipidique</option>
                    <option value="Sérologie">Sérologie</option>
                  </select>
                </div>

                <div>
                  <label style={{color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'block'}}>Statut du dossier</label>
                  <select className="form-input" style={{width: '100%', boxSizing: 'border-box'}} value={currentBilan.statut} onChange={e => setCurrentBilan({...currentBilan, statut: e.target.value})}>
                    <option value="en_attente">En Attente</option>
                    <option value="en_cours">En Cours (Analyse lancée)</option>
                    <option value="termine">Terminé (Résultats dispos)</option>
                  </select>
                </div>

                <div>
                  <label style={{color: '#94a3b8', fontSize: '0.8rem', marginBottom: '5px', display: 'block'}}>Données Techniques / Résultats</label>
                  <textarea 
                    className="form-textarea" 
                    style={{width: '100%', boxSizing: 'border-box', minHeight: '100px'}}
                    placeholder="Saisir les données brutes..."
                    value={currentBilan.resultat_analyse || ''}
                    onChange={e => setCurrentBilan({...currentBilan, resultat_analyse: e.target.value})}
                  />
                </div>

                <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px'}}>
                  <button type="button" className="btn btn-edit" onClick={() => setIsModalOpen(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">Sauvegarder</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
