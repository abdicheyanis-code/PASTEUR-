import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import QRCode from 'react-qr-code'
import './App.css'

function App() {
  const [bilans, setBilans] = useState([])
  const [stats, setStats] = useState(null)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('Reception')
  const [loading, setLoading] = useState(false)
  
  // UX States
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'en_attente', 'en_cours', 'termine'
  const [toast, setToast] = useState(null) // { message, type }
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentBilan, setCurrentBilan] = useState(null)
  const [typesAnalysesList, setTypesAnalysesList] = useState([]) 
  const [parametres, setParametres] = useState([])
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [patientViewBilan, setPatientViewBilan] = useState(null)

  const LOGO_URL = "https://upload.wikimedia.org/wikipedia/fr/thumb/3/37/Institut_pasteur_algerie_logo.jpg/600px-Institut_pasteur_algerie_logo.jpg"
  const LISTE_ANALYSES = ["FNS Completo", "PCR Covid-19", "Biochimie", "Bilan Lipidique", "Sérologie", "Hormonologie", "Autre"]

  // --- NOTIFICATIONS (TOAST) ---
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000) // Disparait après 3 sec
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const bilanId = urlParams.get('id');
    if (bilanId) fetchPublicBilan(bilanId)
    else checkUserSession()
  }, [])

  async function checkUserSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      const { data: employe } = await supabase.from('employes').select('poste').eq('id', session.user.id).single()
      setUserRole(employe?.poste || 'Biologiste')
      fetchData()
    }
    supabase.auth.onAuthStateChange(async 
