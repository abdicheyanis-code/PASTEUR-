import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Gestion Modale
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBilan, setCurrentBilan] = useState(null)
  const [parametres, setParametres] = useState([])
  const [typeAnalyseInput, setTypeAnalyseInput] = useState('') // Pour stocker le choix "Autre"

  // Login
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Liste des analyses prédéfinies
  const LISTE_ANALYSES = [
    "FNS Completo", 
    "PCR Covid-19", 
    "Biochimie Sanguine", 
    "Bilan Lipidique", 
    "Sérologie Virale",
    "Bilan Hormonal",
    "Autre" // Déclencheur du champ libre
  ]

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

  // --- LOGIQUE PARAMETRES ---
  const ajouterParametre = () => setParametres([...parametres, { nom: '', valeur: '' }])
  const supprimerParametre = (i) => { const n = [...parametres]; n.splice(i, 1); setParametres(n); }
  const modifierParametre = (i, champ, val) => { const n = [...parametres]; n[i][champ] = val; setParametres(n); }

  // --- ACTIONS MODALES ---
  const openNewBilan = () => {
    setCurrentBilan({ nom_patient: '', prenom_patient: '', age_patient: '', type_analyse: 'FNS Completo', statut: 'en_attente' })
    setTypeAnalyseInput('FNS Completo')
    setParametres([{ nom: 'Observation', valeur: '' }])
    setIsModalOpen(true)
  }

  const openEditBilan = (bilan) => {
    setCurrentBilan(bilan)
    
    // Gestion intelligente du type d'analyse (Est-ce que c'est dans la liste ou un truc perso ?)
    if (LISTE_ANALYSES.includes(bilan.type_analyse)) {
      setTypeAnalyseInput(bilan.type_analyse)
    } else {
      setTypeAnalyseInput("Autre")
    }

    try {
      if (bilan.resultat_analyse && bilan.resultat_analyse.startsWith('[')) {
        setParametres(JSON.parse(bilan.resultat_analyse))
      } else if (bilan.resultat_analyse) {
        setParametres([{ nom: 'Résultat Global', valeur: bilan.resultat_analyse }])
      } else {
        setParametres([])
      }
    } catch { setParametres([]) }
    
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    
    // Si l'utilisateur a choisi "Autre", on prend ce qu'il a écrit dans le champ libre (nom_analyse_custom)
    // Sinon on prend la valeur du select
    let typeFinal = typeAnalyseInput
    if (typeAnalyseInput === 'Autre') {
      typeFinal = currentBilan.type_analyse_custom || 'Analyse Spéciale'
    } else {
      typeFinal = typeAnalyseInput
    }

    const dataToSave = {
      nom_patient: currentBilan.nom_patient,
      prenom_patient: currentBilan.prenom_patient,
      age_patient: currentBilan.age_patient,
      type_analyse: typeFinal,
      statut: currentBilan.statut,
      resultat_analyse: JSON.stringify(parametres),
      date_fin_analyse: currentBilan.statut === 'termine' ? new Date() : null
    }

    if (currentBilan.id) await supabase.from('bilans').update(dataToSave).eq('id', currentBilan.id)
    else await supabase.from('bilans').insert([{ ...dataToSave, cree_par: user.id }])
    
    setIsModalOpen(false)
    fetchData()
  }

  const handleDelete = async (id) => {
    if (confirm("Supprimer ce dossier ?")) {
      await supabase.from('bilans').delete().eq('id', id)
      fetchData()
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert("Erreur connexion")
  }

  const filteredBilans = bilans.filter(b => b.nom_patient.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.includes(searchTerm))

  // --- RENDU ---
  const Background = () => (
    <div className="bio-background">
      <ul className="bacteria-list">{[...Array(10)].map((_, i) => <li key={i} className="bacteria"></li>)}</ul>
    </div>
  )

  if (!user) return (
    <>
      <Background />
      <div className="login-container">
        <div className="login-card">
          <h1 style={{fontSize: '3rem', marginBottom: '10px'}}>🧬</h1>
          <h2>Pasteur<span style={{color: 'var(--primary)'}}>Lab</span></h2>
          <form onSubmit={handleLogin}>
            <input className="search-input" style={{marginBottom: '15px', textAlign: 'center'}} type="email" placeholder="Identifiant" value={email} onChange={e=>setEmail(e.target.value)} />
            <input className="search-input" style={{marginBottom: '20px', textAlign: 'center'}} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
            <button className="btn btn-primary" style={{width:'100%'}}>Connexion</button>
          </form>
        </div>
      </div>
    </>
  )

  return (
    <>
      <Background />
      <div className="container">
        <nav className="navbar">
          <div className="logo"><h1>Pasteur<span>Algérie</span></h1></div>
          <button className="btn btn-edit" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
        </nav>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card" style={{'--color-glow': '#38bdf8'}}><h3>En Attente</h3><p className="value">{stats.dossiers_en_attente}</p></div>
            <div className="stat-card" style={{'--color-glow': '#fb923c'}}><h3>En Cours</h3><p className="value">{stats.dossiers_en_cours}</p></div>
            <div className="stat-card" style={{'--color-glow': '#4ade80'}}><h3>Terminés</h3><p className="value">{stats.dossiers_termines}</p></div>
          </div>
        )}

        <div style={{display: 'flex', gap: '20px', marginBottom: '30px'}}>
          <input type="text" className="search-input" placeholder="Rechercher un patient..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button className="btn btn-primary" style={{whiteSpace: 'nowrap'}} onClick={openNewBilan}>+ Nouveau Dossier</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Analyse</th><th>Statut</th><th style={{textAlign: 'right'}}>Actions</th></tr></thead>
            <tbody>
              {filteredBilans.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.nom_patient} {b.prenom_patient}</strong><div style={{fontSize:'0.8em', color:'#64748b'}}>{b.age_patient} ans</div></td>
                  <td style={{color: 'var(--primary)', fontWeight: '600'}}>{b.type_analyse}</td>
                  <td><span className={`badge badge-${b.statut}`}>{b.statut.replace('_', ' ')}</span></td>
                  <td style={{textAlign: 'right'}}>
                    <button className="btn btn-action btn-edit" onClick={() => openEditBilan(b)}>Ouvrir</button>
                    <button className="btn btn-action btn-danger" style={{marginLeft: '5px'}} onClick={() => handleDelete(b.id)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
          }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white'}}>
              
              {/* EN-TÊTE IMPRESSION CACHÉ À L'ÉCRAN */}
              <div className="print-header">
                <h1>INSTITUT PASTEUR D'ALGÉRIE</h1>
                <p>Annexe Dely Ibrahim - Laboratoire d'Analyses Médicales</p>
                <hr style={{borderColor: '#000'}}/>
              </div>

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                <h2 style={{margin:0, color: 'var(--primary)'}}>DOSSIER MÉDICAL</h2>
                <div className="no-print">
                   <button type="button" onClick={handlePrint} className="btn btn-edit" style={{marginRight: '10px'}}>🖨️ Imprimer / PDF</button>
                   <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-danger">X</button>
                </div>
              </div>
              
              <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                
                {/* 1. INFOS PATIENT & TYPE */}
                <div style={{background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                  <h3 style={{margin:'0 0 10px 0', fontSize:'0.9rem', color: '#94a3b8', textTransform:'uppercase'}}>Information Patient & Examen</h3>
                  <div style={{display:'flex', gap:'10px', marginBottom: '15px'}}>
                    <div style={{flex:1}}><label>Nom</label><input className="form-input" required value={currentBilan.nom_patient} onChange={e => setCurrentBilan({...currentBilan, nom_patient: e.target.value})} /></div>
                    <div style={{flex:1}}><label>Prénom</label><input className="form-input" required value={currentBilan.prenom_patient} onChange={e => setCurrentBilan({...currentBilan, prenom_patient: e.target.value})} /></div>
                    <div style={{width:'80px'}}><label>Age</label><input className="form-input" value={currentBilan.age_patient || ''} onChange={e => setCurrentBilan({...currentBilan, age_patient: e.target.value})} /></div>
                  </div>

                  {/* MENU ROULANT AVEC OPTION "AUTRE" */}
                  <div>
                    <label>Type d'analyse demandée</label>
                    <select className="form-input" value={typeAnalyseInput} onChange={e => setTypeAnalyseInput(e.target.value)}>
                      {LISTE_ANALYSES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                    
                    {/* Si "Autre" est choisi, afficher ce champ pour écrire manuellement */}
                    {typeAnalyseInput === 'Autre' && (
                      <input 
                        className="form-input" 
                        style={{marginTop: '10px', borderColor: 'var(--primary)'}} 
                        placeholder="Précisez le nom de l'analyse..."
                        value={currentBilan.type_analyse_custom || ''}
                        onChange={e => setCurrentBilan({...currentBilan, type_analyse_custom: e.target.value})}
                      />
                    )}
                  </div>
                </div>

                {/* 2. RESULTATS (TABLEAU DYNAMIQUE) */}
                <div style={{background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                   <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
                    <h3 style={{margin:0, fontSize:'0.9rem', color: '#94a3b8', textTransform:'uppercase'}}>Résultats Techniques</h3>
                    <button type="button" className="no-print" onClick={ajouterParametre} style={{background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer'}}>+</button>
                  </div>

                  {parametres.map((param, index) => (
                    <div key={index} style={{display: 'flex', gap: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px'}}>
                      <input className="form-input" style={{flex: 1, border:'none', background:'transparent'}} placeholder="Paramètre (ex: Fer)" value={param.nom} onChange={(e) => modifierParametre(index, 'nom', e.target.value)}/>
                      <input className="form-input" style={{flex: 1, border:'none', background:'transparent', textAlign:'right', fontWeight:'bold'}} placeholder="Valeur" value={param.valeur} onChange={(e) => modifierParametre(index, 'valeur', e.target.value)}/>
                      <button type="button" className="no-print" onClick={() => supprimerParametre(index)} style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer'}}>✕</button>
                    </div>
                  ))}
                  {parametres.length === 0 && <p style={{fontSize:'0.8rem', color:'#64748b'}}>Aucun résultat saisi.</p>}
                </div>

                {/* 3. STATUT ET VALIDATION */}
                <div style={{background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                  <h3 style={{margin:'0 0 10px 0', fontSize:'0.9rem', color: '#94a3b8', textTransform:'uppercase'}}>Conclusion</h3>
                  <label>Statut du dossier</label>
                  <select className="form-input" value={currentBilan.statut} onChange={e => setCurrentBilan({...currentBilan, statut: e.target.value})}>
                    <option value="en_attente">En Attente de prélèvement</option>
                    <option value="en_cours">Analyse en cours</option>
                    <option value="termine">Terminé & Validé</option>
                  </select>
                </div>

                <div className="no-print" style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px'}}>
                  <button type="button" className="btn btn-edit" onClick={() => setIsModalOpen(false)}>Fermer</button>
                  <button type="submit" className="btn btn-primary">Enregistrer Modifications</button>
                </div>
              </form>

              {/* PIED DE PAGE IMPRESSION */}
              <div className="print-footer">
                <p>Document généré électroniquement par PasteurLab - {new Date().toLocaleDateString()}</p>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
