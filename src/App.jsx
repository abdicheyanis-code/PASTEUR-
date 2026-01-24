import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import QRCode from 'react-qr-code'
import Barcode from 'react-barcode'
import './App.css'

function App() {
  // ... (Le reste du code reste le même, mais je te redonne le début propre) ...
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('Reception')
  const [loading, setLoading] = useState(false)
  
  // UX States
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [toast, setToast] = useState(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBilan, setCurrentBilan] = useState(null)
  const [typesAnalysesList, setTypesAnalysesList] = useState([]) 
  const [parametres, setParametres] = useState([])
  const [logs, setLogs] = useState([])
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [patientViewBilan, setPatientViewBilan] = useState(null)

  // LE LIEN INTERNET DIRECT (C'est ça qui va marcher)
  const LOGO_URL = "https://upload.wikimedia.org/wikipedia/fr/thumb/3/37/Institut_pasteur_algerie_logo.jpg/600px-Institut_pasteur_algerie_logo.jpg"
  
  const LISTE_ANALYSES = ["FNS Completo", "PCR Covid-19", "Biochimie", "Bilan Lipidique", "Sérologie", "Hormonologie", "Autre"]

  // ... (Copie la suite de tes fonctions ici, ou garde celles d'avant, l'important c'est le haut du fichier) ...
  
  // Pour être sûr, je te remets tout le bloc jusqu'à la fin pour éviter les erreurs de copier/coller :
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bilanId = urlParams.get('id');
    if (bilanId) fetchPublicBilan(bilanId)
    else checkUserSession()
  }, [])

  async function checkUserSession() {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      const { data: employe } = await supabase.from('employes').select('poste').eq('id', session.user.id).single()
      setUserRole(employe?.poste || 'Biologiste')
      fetchData()
    } else {
      setLoading(false)
    }
    
    supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchData()
    })
  }

  async function fetchPublicBilan(id) {
    const { data } = await supabase.from('bilans').select('*').eq('id', id).single()
    if (data) {
      setPatientViewBilan(data)
      try { if (data.resultat_analyse) setParametres(JSON.parse(data.resultat_analyse)) } catch { setParametres([]) }
    }
  }

  async function fetchData() {
    setLoading(true)
    const { data: statsData } = await supabase.from('stats_labo').select('*').single()
    setStats(statsData)
    const { data: bilansData } = await supabase.from('bilans').select('*').order('created_at', { ascending: false }).limit(50) 
    setBilans(bilansData || [])
    setLoading(false)
  }

  const logAction = async (action, details, bilanId) => {
    if (!bilanId) return
    await supabase.from('audit_logs').insert([{ user_email: user.email, action: action, details: details, bilan_id: bilanId }])
  }
  const fetchLogs = async (bilanId) => {
    const { data } = await supabase.from('audit_logs').select('*').eq('bilan_id', bilanId).order('created_at', { ascending: false })
    setLogs(data || [])
  }

  const ajouterType = () => setTypesAnalysesList([...typesAnalysesList, { selection: 'FNS Completo', custom: '' }])
  const supprimerType = (i) => { const l = [...typesAnalysesList]; if(l.length > 1) { l.splice(i, 1); setTypesAnalysesList(l); } }
  const modifierType = (i, f, v) => { const l = [...typesAnalysesList]; l[i][f] = v; setTypesAnalysesList(l); }
  const ajouterParametre = () => setParametres([...parametres, { nom: '', valeur: '', unite: '', min: '', max: '' }])
  const supprimerParametre = (i) => { const n = [...parametres]; n.splice(i, 1); setParametres(n); }
  const modifierParametre = (i, champ, val) => { const n = [...parametres]; n[i][champ] = val; setParametres(n); }
  const checkNorme = (val, min, max) => {
    if (!val || !min || !max) return false;
    const v = parseFloat(val.replace(',', '.')), mi = parseFloat(min), ma = parseFloat(max);
    if (isNaN(v) || isNaN(mi) || isNaN(ma)) return false;
    return (v < mi || v > ma);
  }

  const handleExportExcel = () => {
    const headers = ["ID;Date;Nom;Prénom;Tel;Analyses;Statut;SMS Envoyé"];
    const rows = bilans.map(b => {
      const date = new Date(b.created_at).toLocaleDateString();
      const analyses = b.type_analyse.replace(/;/g, ","); 
      const sms = b.sms_envoye ? "OUI" : "NON";
      return `${b.id};${date};${b.nom_patient};${b.prenom_patient};${b.telephone};${analyses};${b.statut};${sms}`;
    });
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `pasteur_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Fichier Excel téléchargé !");
  }

  const handleSendSMS = async () => {
    if (!currentBilan.telephone) return showToast("Numéro de téléphone manquant !", "error");
    let cleanTel = currentBilan.telephone.replace(/\s/g, ''); 
    if (cleanTel.startsWith('0')) cleanTel = cleanTel.substring(1); 
    if (!cleanTel.startsWith('213')) cleanTel = '213' + cleanTel; 
    const btn = document.getElementById('btn-sms');
    if(btn) btn.innerText = "Ouverture WhatsApp...";
    const message = `Bonjour ${currentBilan.nom_patient}, Institut Pasteur : Vos analyses sont prêtes. Veuillez passer les récupérer muni de votre pièce d'identité.`;
    await supabase.from('bilans').update({ sms_envoye: true }).eq('id', currentBilan.id);
    setCurrentBilan({ ...currentBilan, sms_envoye: true });
    await logAction("WhatsApp", `Message envoyé au +${cleanTel}`, currentBilan.id);
    window.open(`https://wa.me/${cleanTel}?text=${encodeURIComponent(message)}`, '_blank');
    fetchLogs(currentBilan.id); 
    if(btn) btn.innerText = "📲 Envoyer WhatsApp";
  }

  const handlePrintLabel = () => {
    const content = document.getElementById('barcode-section').innerHTML;
    const win = window.open('', '', 'height=300,width=500');
    win.document.write('<html><body style="text-align:center;">');
    win.document.write(content);
    win.document.write('<p style="font-family:monospace; margin:0;">' + currentBilan.nom_patient + '</p>');
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  }

  const openNewBilan = () => {
    setCurrentBilan({ nom_patient: '', prenom_patient: '', age_patient: '', telephone: '', statut: 'en_attente', sms_envoye: false })
    setTypesAnalysesList([{ selection: 'FNS Completo', custom: '' }])
    setParametres([{ nom: 'Hémoglobine', valeur: '', unite: 'g/dL', min: '12', max: '16' }])
    setLogs([])
    setIsModalOpen(true)
  }

  const openEditBilan = (bilan) => {
    setCurrentBilan(bilan)
    if (bilan.type_analyse) {
      const parties = bilan.type_analyse.split(' + ')
      setTypesAnalysesList(parties.map(p => LISTE_ANALYSES.includes(p) ? {selection: p, custom: ''} : {selection: 'Autre', custom: p}))
    } else { setTypesAnalysesList([{ selection: 'FNS Completo', custom: '' }]) }
    try { if (bilan.resultat_analyse && bilan.resultat_analyse.startsWith('[')) setParametres(JSON.parse(bilan.resultat_analyse)); else setParametres([]) } catch { setParametres([]) }
    fetchLogs(bilan.id);
    setIsModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true) 
    const typesStr = typesAnalysesList.map(t => t.selection === 'Autre' ? t.custom : t.selection).join(' + ')
    const dataToSave = {
      nom_patient: currentBilan.nom_patient, prenom_patient: currentBilan.prenom_patient, age_patient: currentBilan.age_patient, telephone: currentBilan.telephone,
      type_analyse: typesStr, statut: currentBilan.statut, resultat_analyse: JSON.stringify(parametres),
      date_fin_analyse: currentBilan.statut === 'termine' ? new Date() : null
    }
    let bilanId = currentBilan.id;
    if (currentBilan.id) {
      await supabase.from('bilans').update(dataToSave).eq('id', currentBilan.id)
      await logAction("Modification", `Mise à jour du dossier`, currentBilan.id)
    } else {
      const { data } = await supabase.from('bilans').insert([{ ...dataToSave, cree_par: user.id }]).select().single()
      bilanId = data.id; 
      await logAction("Création", `Création du dossier`, bilanId)
    }
    setLoading(false)
    setIsModalOpen(false)
    showToast("Dossier enregistré.")
    fetchData()
  }

  const handleDelete = async (id) => {
    if (confirm("Supprimer ce dossier ?")) {
      await logAction("Suppression", "Suppression du dossier", id)
      await supabase.from('bilans').delete().eq('id', id)
      showToast("Dossier supprimé.", "error")
      fetchData()
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { showToast(error.message, "error"); setLoading(false); }
  }

  const filteredBilans = bilans.filter(b => {
    const matchesSearch = b.nom_patient.toLowerCase().includes(searchTerm.toLowerCase()) || b.id.includes(searchTerm)
    const matchesTab = activeTab === 'all' ? true : b.statut === activeTab
    return matchesSearch && matchesTab
  })

  // VUE PATIENT
  if (patientViewBilan) {
    return (
      <div style={{background: 'white', minHeight: '100vh', color: 'black', padding: '20px', fontFamily: 'Arial'}}>
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
           <img src={LOGO_URL} alt="Logo" style={{height: '80px'}} />
           <h2 style={{color: '#005b96', margin: '10px 0'}}>Résultats d'Analyses</h2>
           <p style={{fontSize: '0.8rem', color: 'green'}}>✅ Document Authentifié</p>
        </div>
        <div style={{border: '1px solid #ddd', padding: '15px', borderRadius: '10px', marginBottom: '20px', background: '#f9f9f9'}}>
          <h3>👤 {patientViewBilan.nom_patient} {patientViewBilan.prenom_patient}</h3>
          <p>Examen: <strong>{patientViewBilan.type_analyse}</strong></p>
          <p>Date: {new Date(patientViewBilan.created_at).toLocaleDateString()}</p>
        </div>
        <table style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead><tr style={{background: '#eee', borderBottom: '2px solid #005b96'}}><th style={{padding: '10px', textAlign: 'left'}}>Paramètre</th><th style={{padding: '10px'}}>Résultat</th><th style={{padding: '10px'}}>Normes</th></tr></thead>
          <tbody>
            {parametres.map((p, i) => {
              const isAlert = checkNorme(p.valeur, p.min, p.max)
              return <tr key={i} style={{borderBottom: '1px solid #ddd'}}><td style={{padding: '10px'}}>{p.nom}</td><td style={{padding: '10px', textAlign: 'center', color: isAlert ? 'red' : 'black', fontWeight: 'bold'}}>{p.valeur} {isAlert && '⚠️'}</td><td style={{padding: '10px', textAlign: 'center', fontSize: '0.8rem'}}>{p.min}-{p.max} {p.unite}</td></tr>
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // VUE LOGIN
  if (!user) {
    return (
      <>
        <div className="bio-background"><ul className="bacteria-list">{[...Array(10)].map((_,i)=><li key={i} className="bacteria"></li>)}</ul></div>
        <div className="login-container">
            <div className="login-card">
                <h1>🧬</h1>
                <h2>Pasteur<span style={{color: 'var(--primary)'}}>Lab</span></h2>
                <form onSubmit={handleLogin}>
                    <input className="search-input" style={{marginBottom: '15px', textAlign: 'center'}} type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
                    <input className="search-input" style={{marginBottom: '20px', textAlign: 'center'}} type="password" placeholder="Mot de passe" value={password} onChange={e=>setPassword(e.target.value)} />
                    <button className="btn btn-primary" style={{width:'100%'}} disabled={loading}>
                        {loading ? 'Connexion...' : 'Connexion Staff'}
                    </button>
                </form>
            </div>
        </div>
      </>
    )
  }

  // VUE DASHBOARD
  return (
    <>
      <div className="bio-background"><ul className="bacteria-list">{[...Array(10)].map((_,i)=><li key={i} className="bacteria"></li>)}</ul></div>
      {toast && <div className="toast-container"><div className={`toast ${toast.type === 'error' ? 'error' : ''}`}><span>{toast.type === 'error' ? '❌' : '✅'}</span>{toast.message}</div></div>}
      <div className="container">
        <nav className="navbar">
          <div className="logo"><h1>Pasteur<span>Algérie</span></h1></div>
          <div style={{display:'flex', alignItems:'center', gap: '15px'}}>
            <button className="btn-refresh" onClick={fetchData} title="Rafraîchir">↻</button>
            <span className="badge" style={{background: 'rgba(255,255,255,0.1)', color: 'white'}}>Poste: {userRole.toUpperCase()}</span>
            <button className="btn btn-edit" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
          </div>
        </nav>
        {stats && (
          <div className="stats-grid">
            <div className="stat-card" style={{'--color-glow': '#38bdf8'}}><h3>En Attente</h3><p className="value">{stats.dossiers_en_attente}</p></div>
            <div className="stat-card" style={{'--color-glow': '#fb923c'}}><h3>En Cours</h3><p className="value">{stats.dossiers_en_cours}</p></div>
            <div className="stat-card" style={{'--color-glow': '#4ade80'}}><h3>Terminés</h3><p className="value">{stats.dossiers_termines}</p></div>
          </div>
        )}
        <div style={{display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center'}}>
          <input type="text" className="search-input" placeholder="🔍 Rechercher (Nom, ID)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <button className="btn btn-primary" style={{whiteSpace: 'nowrap', height: '50px'}} onClick={openNewBilan}>+ Nouveau Dossier</button>
          <button className="btn" style={{whiteSpace: 'nowrap', height: '50px', background: '#10b981', color: 'white'}} onClick={handleExportExcel}>📊 Export Excel</button>
        </div>
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Tous</button>
          <button className={`tab-btn ${activeTab === 'en_attente' ? 'active' : ''}`} onClick={() => setActiveTab('en_attente')}>⏳ En Attente</button>
          <button className={`tab-btn ${activeTab === 'en_cours' ? 'active' : ''}`} onClick={() => setActiveTab('en_cours')}>⚙️ En Cours</button>
          <button className={`tab-btn ${activeTab === 'termine' ? 'active' : ''}`} onClick={() => setActiveTab('termine')}>✅ Terminés</button>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Patient</th><th>Analyses</th><th>Statut</th><th style={{textAlign: 'right'}}>Actions</th></tr></thead>
            <tbody>
              {filteredBilans.length === 0 ? (
                <tr><td colSpan="4"><div className="empty-state"><span className="empty-icon">📂</span><p>Aucun dossier trouvé.</p></div></td></tr>
              ) : (
                filteredBilans.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.nom_patient} {b.prenom_patient}</strong><div style={{fontSize:'0.8em', color:'#64748b'}}>{b.age_patient} ans</div></td>
                    <td>{b.type_analyse.split(' + ').map((a,i)=><span key={i} style={{background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'4px', marginRight:'5px', fontSize:'0.75rem'}}>{a}</span>)}</td>
                    <td><span className={`badge badge-${b.statut}`}>{b.statut.replace('_', ' ')}</span></td>
                    <td style={{textAlign: 'right'}}>
                      <button className="btn btn-action btn-edit" onClick={() => openEditBilan(b)}>Ouvrir</button>
                      {userRole === 'Biologiste' && <button className="btn btn-action btn-danger" style={{marginLeft: '5px'}} onClick={() => handleDelete(b.id)}>🗑️</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)} style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: 'white'}}>
               <div className="print-header" style={{textAlign: 'center', marginBottom: '20px'}}>
                <img src={LOGO_URL} alt="Logo" style={{height: '80px'}} />
                <h1>INSTITUT PASTEUR D'ALGÉRIE</h1>
                <p>Laboratoire d'Analyses Médicales</p>
                <hr style={{borderColor: '#000'}}/>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px'}}>
                <h2 style={{margin:0, color: 'var(--primary)'}}>DOSSIER MÉDICAL</h2>
                <div className="no-print">
                   <button type="button" onClick={() => window.print()} className="btn btn-edit" style={{marginRight: '10px'}}>🖨️ Imprimer</button>
                   <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-danger">X</button>
                </div>
              </div>
              <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                <div style={{display: 'flex', gap: '20px'}}>
                  <div style={{flex: 1, background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                    <h3 style={{margin:'0 0 10px 0', fontSize:'0.9rem', color: '#94a3b8'}}>Patient</h3>
                    <div style={{display:'flex', gap:'10px', marginBottom: '10px'}}>
                      <div style={{flex:1}}><label>Nom</label><input className="form-input" required value={currentBilan.nom_patient} onChange={e => setCurrentBilan({...currentBilan, nom_patient: e.target.value})} /></div>
                      <div style={{flex:1}}><label>Prénom</label><input className="form-input" required value={currentBilan.prenom_patient} onChange={e => setCurrentBilan({...currentBilan, prenom_patient: e.target.value})} /></div>
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                      <div style={{width:'80px'}}><label>Age</label><input className="form-input" type="number" value={currentBilan.age_patient || ''} onChange={e => setCurrentBilan({...currentBilan, age_patient: e.target.value})} /></div>
                      <div style={{flex:1}}><label>Téléphone</label><input className="form-input" type="tel" placeholder="05 50..." value={currentBilan.telephone || ''} onChange={e => setCurrentBilan({...currentBilan, telephone: e.target.value})} /></div>
                    </div>
                  </div>
                  {currentBilan.id && <div style={{background: 'white', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}><div id="barcode-section"><Barcode value={currentBilan.id.split('-')[0].toUpperCase()} width={1.5} height={40} fontSize={10} /></div><button type="button" className="no-print btn-action" onClick={handlePrintLabel} style={{background:'#cbd5e1', color:'black', marginTop:'5px'}}>🖨️ Étiquette</button><hr style={{width:'100%', borderColor:'#eee', margin:'10px 0'}}/><QRCode value={`${window.location.origin}?id=${currentBilan.id}`} size={60} /></div>}
                </div>
                <div style={{background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}><h3 style={{margin:0, fontSize:'0.9rem', color: '#94a3b8'}}>EXAMENS</h3><button type="button" className="no-print" onClick={ajouterType} style={{background: 'var(--secondary)', color:'white', border:'none', borderRadius:'4px', fontSize:'0.7rem', padding: '5px'}}>+ Ajouter</button></div>
                  {typesAnalysesList.map((item, i) => (<div key={i} style={{marginBottom: '5px', display: 'flex', gap: '5px'}}><select className="form-input" value={item.selection} onChange={e => modifierType(i, 'selection', e.target.value)}>{LISTE_ANALYSES.map(t => <option key={t} value={t}>{t}</option>)}</select>{item.selection === 'Autre' && <input className="form-input" placeholder="Préciser..." value={item.custom} onChange={e => modifierType(i, 'custom', e.target.value)} />}<button type="button" className="no-print" onClick={() => supprimerType(i)} style={{color: '#ef4444', background: 'transparent', border:'none'}}>✕</button></div>))}
                </div>
                {(userRole === 'Biologiste' || currentBilan.statut === 'termine') && (
                  <div style={{background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}><h3 style={{margin:0, fontSize:'0.9rem', color: '#94a3b8'}}>RESULTATS</h3><button type="button" className="no-print" onClick={ajouterParametre} style={{background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer'}}>+</button></div>
                    <div style={{display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#94a3b8', paddingLeft: '5px', marginBottom: '5px'}}><div style={{flex: 2}}>PARAMÈTRE</div><div style={{flex: 1, textAlign: 'center'}}>RÉSULTAT</div><div style={{flex: 1, textAlign: 'center'}}>UNITÉ</div><div style={{flex: 1, textAlign: 'center'}}>NORME MIN-MAX</div><div style={{width: '20px'}}></div></div>
                    {parametres.map((param, i) => {
                      const isAlert = checkNorme(param.valeur, param.min, param.max)
                      return <div key={i} style={{display: 'flex', gap: '10px', marginBottom: '5px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '5px'}}><input className="form-input" style={{flex: 2}} placeholder="Nom" value={param.nom} onChange={(e) => modifierParametre(i, 'nom', e.target.value)}/><input className="form-input" style={{flex: 1, textAlign: 'center', fontWeight: 'bold', color: isAlert ? '#ef4444' : 'inherit', borderColor: isAlert ? '#ef4444' : '#334155'}} placeholder="Val" value={param.valeur} onChange={(e) => modifierParametre(i, 'valeur', e.target.value)}/><input className="form-input" style={{flex: 1, textAlign: 'center'}} placeholder="Unité" value={param.unite} onChange={(e) => modifierParametre(i, 'unite', e.target.value)}/><div style={{flex: 1, display: 'flex', gap: '5px'}}><input className="form-input" style={{textAlign: 'center', fontSize: '0.8rem'}} placeholder="Min" value={param.min} onChange={(e) => modifierParametre(i, 'min', e.target.value)}/><input className="form-input" style={{textAlign: 'center', fontSize: '0.8rem'}} placeholder="Max" value={param.max} onChange={(e) => modifierParametre(i, 'max', e.target.value)}/></div><button type="button" className="no-print" onClick={() => supprimerParametre(i)} style={{background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer'}}>✕</button></div>
                    })}
                  </div>
                )}
                <div style={{display:'flex', gap:'20px'}}>
                  <div style={{flex:1, background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '10px'}}>
                    <label>Statut</label>
                    <select className="form-input" disabled={userRole === 'Reception'} value={currentBilan.statut} onChange={e => setCurrentBilan({...currentBilan, statut: e.target.value})}><option value="en_attente">En Attente</option><option value="en_cours">En Cours</option><option value="termine">Terminé & Validé</option></select>
                  </div>
                  {currentBilan.statut === 'termine' && <div style={{flex:1, background: 'rgba(16, 185, 129, 0.1)', padding: '15px', borderRadius: '10px', border:'1px solid rgba(16, 185, 129, 0.3)', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}><button type="button" id="btn-sms" onClick={handleSendSMS} className="btn-action" style={{background:'#10b981', color:'white', fontSize:'0.9rem', padding:'10px 20px', border:'none', cursor:'pointer'}}>📲 Envoyer WhatsApp</button>{currentBilan.sms_envoye && <span style={{fontSize:'0.7rem', color:'#10b981', marginTop:'5px'}}>Déjà envoyé ✅</span>}</div>}
                </div>
                <div className="no-print" style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}><button type="button" className="btn btn-edit" onClick={() => setIsModalOpen(false)}>Fermer</button><button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Sauvegarde...' : 'Sauvegarder'}</button></div>
                {userRole === 'Biologiste' && logs.length > 0 && <div className="no-print" style={{marginTop:'20px', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:'10px'}}><h4 style={{margin:'0 0 10px 0', color:'#64748b', fontSize:'0.8rem'}}>HISTORIQUE DES ACTIONS (Traçabilité)</h4><div style={{maxHeight:'100px', overflowY:'auto'}}>{logs.map(log => (<div key={log.id} style={{fontSize:'0.75rem', color:'#94a3b8', marginBottom:'4px'}}><span style={{color:'var(--primary)'}}>{new Date(log.created_at).toLocaleString()}</span> - <strong>{log.user_email}</strong> : {log.action} ({log.details})</div>))}</div></div>}
              </form>
              <div className="print-footer"><p>Fait à Alger. Document signé électroniquement.</p></div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default App
