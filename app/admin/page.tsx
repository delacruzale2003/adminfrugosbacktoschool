'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, ArrowLeft, ChevronDown, Globe, LayoutDashboard, Lock, User, LogIn } from 'lucide-react'
import Link from 'next/link'
import CampaignDashboard from './components/CampaignDashboard'

export default function AdminPage() {
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userField, setUserField] = useState('')
  const [passField, setPassField] = useState('')
  const [authError, setAuthError] = useState(false)

  // --- BUSINESS STATES ---
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [newCampaignName, setNewCampaignName] = useState('')
  const [newCampaignSubdomain, setNewCampaignSubdomain] = useState('')

  // --- EFFECTS ---
  useEffect(() => {
    // Verificar si ya se logueó en esta sesión
    const auth = sessionStorage.getItem('admin_ptm_auth')
    if (auth === 'true') setIsAuthenticated(true)
    
    if (isAuthenticated) fetchCampaigns()
  }, [isAuthenticated])

  // --- HANDLERS ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (userField === 'admin' && passField === 'admin') {
      setIsAuthenticated(true)
      sessionStorage.setItem('admin_ptm_auth', 'true')
      setAuthError(false)
    } else {
      setAuthError(true)
    }
  }

  async function fetchCampaigns() {
    const { data } = await supabase.from('campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false })
    if (data) setCampaigns(data)
  }

  const addCampaign = async () => {
    if (!newCampaignName || !newCampaignSubdomain) return
    const fullUrl = `${newCampaignSubdomain.toLowerCase().trim()}.ptm.pe`
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ 
        name: newCampaignName,
        campaign_url: fullUrl 
      })
      .select()

    if (!error && data) {
      setNewCampaignName('')
      setNewCampaignSubdomain('')
      fetchCampaigns()
      setSelectedCampaign(data[0].id)
    } else {
        alert("Error al crear la campaña.")
    }
  }

  // --- RENDER LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 p-8 shadow-2xl animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-500/20 mb-4">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Acceso Admin</h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">PTM.PE • Central</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Usuario</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text"
                  value={userField}
                  onChange={(e) => setUserField(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-none outline-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-4">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="password"
                  value={passField}
                  onChange={(e) => setPassField(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border-none outline-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                  placeholder="••••••"
                />
              </div>
            </div>

            {authError && (
              <p className="text-red-500 text-[10px] font-black uppercase text-center tracking-tighter">Credenciales incorrectas</p>
            )}

            <button 
              type="submit"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all mt-4 shadow-xl shadow-black/10"
            >
              <LogIn size={16} /> Entrar al Panel
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- RENDER ADMIN CONTENT ---
  const activeCampaignName = campaigns.find(c => c.id === selectedCampaign)?.name

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tu código original del Header ... */}
        <header className="mb-6 md:mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="flex justify-between items-center mb-4">
            <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-black dark:hover:text-white flex items-center gap-1">
              <ArrowLeft size={16} /> Volver
            </Link>
            
            <div className="flex items-center gap-4">
               {/* Botón para desloguearse opcional */}
               <button 
                onClick={() => { sessionStorage.clear(); setIsAuthenticated(false); }}
                className="text-[10px] font-black uppercase text-zinc-400 hover:text-red-500 transition-colors"
               >
                 Cerrar Sesión
               </button>
              <Link 
                href="/admin/adminalternativo" 
                className="bg-zinc-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg active:scale-95"
              >
                <LayoutDashboard size={14} /> Sorteos Semanales
              </Link>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
                {activeCampaignName ? `Editando: ${activeCampaignName}` : 'Panel de Gestión'}
              </h1>
              <p className="text-zinc-500 text-sm md:text-base">Control total de campañas, sucursales y stock.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-stretch md:items-center">
              <div className="relative">
                <select 
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="appearance-none w-full md:w-[240px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold rounded-2xl pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
                >
                  <option value="">Seleccionar Campaña...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronDown size={16} strokeWidth={2.5} />
                </div>
              </div>

              <div className="hidden md:block w-px h-8 bg-zinc-200 dark:border-zinc-800 mx-1"></div>

              <div className="flex flex-col sm:flex-row gap-2 bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-[1.5rem] border border-zinc-200 dark:border-zinc-800">
                  <input 
                    placeholder="Nombre" 
                    value={newCampaignName}
                    onChange={e => setNewCampaignName(e.target.value)}
                    className="bg-white dark:bg-zinc-900 px-4 py-2 text-sm rounded-xl outline-none w-full sm:w-40"
                  />
                  <div className="relative flex items-center bg-white dark:bg-zinc-900 rounded-xl border border-transparent px-2">
                    <Globe size={14} className="text-zinc-400 mr-1"/>
                    <input 
                      placeholder="subdominio" 
                      value={newCampaignSubdomain}
                      onChange={e => setNewCampaignSubdomain(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      className="bg-transparent py-2 text-sm outline-none w-full sm:w-24 font-medium"
                    />
                    <span className="text-zinc-400 text-[10px] font-bold">.ptm.pe</span>
                  </div>
                  <button 
                    onClick={addCampaign} 
                    className="bg-blue-600 text-white p-2 rounded-xl"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
              </div>
            </div>
          </div>
        </header>

        {selectedCampaign ? (
            <CampaignDashboard campaignId={selectedCampaign} />
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-400 gap-4">
            <Globe size={48} strokeWidth={1} className="opacity-20" />
            <p className="text-xl font-bold">Selecciona una campaña para comenzar.</p>
          </div>
        )}
      </div>
    </div>
  )
}