import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // États pour la Recherche et les Modales
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBilan, setCurrentBilan] = useState(null) // Si null = Création, sinon = Modification

  // États pour le formulaire Login
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

  // --- ACTIONS ---

  // Ouvrir le formulaire pour CRÉER
  const openNewBilan = () => {
    setCurrentBilan({ nom_patient: '', prenom_patient: '', age_patient: '', type_analyse: '', statut: 'en_attente', resultat_analyse: '' })
    setIsModalOpen(true)
  }

  // Ouvrir le formulaire pour MODIFIER
  const openEditBilan = (bilan) => {
    setCurrentBilan(bilan)
    setIsModalOpen(true)
  }

  // SAUVEGARDER (Création ou Mise à jour)
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
      // Si on termine, on met la date de fin
      date_fin_analyse: currentBilan.statut === 'termine' ? new Date() : null
    }

    if (currentBilan.id) {
      // MODE UPDATE
      await supabase.from('bilans').update(dataToSave).eq('id', currentBilan.id)
    } else {
      // MODE CREATE
      // On lie le créateur à l'utilisateur connecté
      await supabase.from('bilans').insert([{ ...dataToSave, cree_par: user.id }])
    }

    setIsModalOpen(false)
    fetchData()
  }

  // SUPPRIMER
  const handleDelete = async (id) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce dossier définitivement ?")) {
      await supabase.from('bilans').delete().eq('id', id)
      fetchData()
    }
  }

  // LOGIN
  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Erreur connexion")
  }

  // FILTRAGE (Recherche)
  const filteredBilans = bilans.filter(b => 
    b.nom_patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.prenom_patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.id.includes(searchTerm)
  )

  // --- RENDER ---

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h2 style={{marginBottom: '20px'}}>🔬 Pasteur Lab</h2>
          <form onSubmit={handleLogin}>
            <input className="login-input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="login-input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button className="btn btn-primary" style={{width:'100%'}}>Connexion</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <nav className="navbar">
        <div className="logo"><h1>Pasteur<span>Manager</span></h1></div>
        <div style={{display:'flex', gap:'10px'}}>
          <button className="btn btn-outline" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
        </div>
      </nav>

      {/* STATS */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card border-blue"><h3>En Attente</h3><p className="value text-blue">{stats.dossiers_en_attente}</p></div>
          <div className="stat-card border-orange"><h3>En Cours</h3><p className="value text-orange">{stats.dossiers_en_cours}</p></div>
          <div className="stat-card border-green"><h3>Terminés</h3><p className="value text-green">{stats.dossiers_termines}</p></div>
        </div>
      )}

      {/* BARRE D'OUTILS */}
      <div className="toolbar">
        <input 
          type="text" 
          className="search-input" 
          placeholder="🔍 Rechercher un patient (Nom, Prénom, ID)..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="btn btn-primary" onClick={openNewBilan}>+ Nouveau Dossier</button>
      </div>

      {/* TABLEAU */}
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
                  <strong>{b.nom_patient} {b.prenom_patient}</strong>
                  <div style={{fontSize:'0.8em', color:'#64748b'}}>{b.age_patient} ans</div>
                </td>
                <td>{b.type_analyse}</td>
                <td>
                  <span className={`badge badge-${b.statut}`}>{b.statut}</span>
                  {b.resultat_analyse && (
                    <div style={{marginTop:'5px', fontSize:'0.85em', fontWeight:'bold'}}>
                      Résultat: {b.resultat_analyse}
                    </div>
                  )}
                </td>
                <td style={{textAlign: 'right'}}>
                  <button className="btn-edit" onClick={() => openEditBilan(b)}>✏️ Modifier</button>
                  <button className="btn-danger" onClick={() => handleDelete(b.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (FORMULAIRE POP-UP) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{marginTop:0}}>{currentBilan.id ? 'Modifier Dossier' : 'Nouveau Dossier'}</h2>
            
            <form onSubmit={handleSave}>
              <div style={{display:'flex', gap:'10px'}}>
                <div className="form-group" style={{flex:1}}>
                  <label>Nom</label>
                  <input className="form-input" required value={currentBilan.nom_patient} onChange={e => setCurrentBilan({...currentBilan, nom_patient: e.target.value})} />
                </div>
                <div className="form-group" style={{flex:1}}>
                  <label>Prénom</label>
                  <input className="form-input" required value={currentBilan.prenom_patient} onChange={e => setCurrentBilan({...currentBilan, prenom_patient: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Type d'analyse</label>
                <select className="form-input" value={currentBilan.type_analyse} onChange={e => setCurrentBilan({...currentBilan, type_analyse: e.target.value})}>
                  <option value="">-- Choisir --</option>
                  <option value="FNS Completo">FNS Completo</option>
                  <option value="PCR Covid-19">PCR Covid-19</option>
                  <option value="Bilan Lipidique">Bilan Lipidique</option>
                  <option value="Sérologie">Sérologie</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select className="form-input" value={currentBilan.statut} onChange={e => setCurrentBilan({...currentBilan, statut: e.target.value})}>
                  <option value="en_attente">En Attente</option>
                  <option value="en_cours">En Cours (Analyse lancée)</option>
                  <option value="termine">Terminé (Résultats dispos)</option>
                  <option value="archive">Archivé</option>
                </select>
              </div>

              {/* ZONE DE RÉSULTATS (Pour l'automate ou saisie manuelle) */}
              <div className="form-group">
                <label>Résultats Techniques (Saisie manuelle ou Automate)</label>
                <textarea 
                  className="form-textarea" 
                  placeholder="Ex: Hémoglobine: 13g/dL, Glycémie: 0.90..."
                  value={currentBilan.resultat_analyse || ''}
                  onChange={e => setCurrentBilan({...currentBilan, resultat_analyse: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
