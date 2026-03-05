'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  ChevronDown, 
  Calendar, 
  Users, 
  Trophy, 
  Download, 
  ExternalLink, 
  Loader2, 
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

// Configuración de Fechas de Sorteo (Time Buckets)
const GIVEAWAY_SCHEDULE = [
  { label: 'Sorteo 09/03', start: '2000-01-01T00:00:00', end: '2026-03-09T00:00:00' },
  { label: 'Sorteo 16/03', start: '2026-03-09T00:00:00', end: '2026-03-16T00:00:00' },
  { label: 'Sorteo 23/03', start: '2026-03-16T00:00:00', end: '2026-03-23T00:00:00' },
  { label: 'Sorteo 30/03', start: '2026-03-23T00:00:00', end: '2026-03-30T00:00:00' },
  { label: 'Sorteo 06/04', start: '2026-03-30T00:00:00', end: '2026-04-06T00:00:00' },
  { label: 'Sorteo 13/04', start: '2026-04-06T00:00:00', end: '2026-04-13T00:00:00' },
  { label: 'Sorteo 20/04', start: '2026-04-13T00:00:00', end: '2026-04-20T00:00:00' },
  { label: 'Sorteo 27/04', start: '2026-04-20T00:00:00', end: '2026-04-27T00:00:00' },
]

export default function AdminAlternativoPage() {
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [activeGiveaway, setActiveGiveaway] = useState(GIVEAWAY_SCHEDULE[0])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [winner, setWinner] = useState<any>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  useEffect(() => {
    if (selectedId) fetchRegistrations()
  }, [selectedId, activeGiveaway])

  async function fetchCampaigns() {
    const { data } = await supabase.from('campaigns').select('*').eq('is_active', true)
    if (data) setCampaigns(data)
  }

  async function fetchRegistrations() {
    setLoading(true)
    setWinner(null)
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('campaign_id', selectedId)
      .gte('created_at', activeGiveaway.start)
      .lt('created_at', activeGiveaway.end)
      .order('created_at', { ascending: false })
    
    if (data) setRegistrations(data)
    setLoading(false)
  }

  const pickRandomWinner = () => {
    if (registrations.length === 0) return
    const randomIndex = Math.floor(Math.random() * registrations.length)
    setWinner(registrations[randomIndex])
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div className="space-y-1">
            <Link href="/admin" className="text-xs font-bold text-zinc-400 flex items-center gap-1 hover:text-blue-500 transition-colors mb-2">
              <ArrowLeft size={14} /> VOLVER AL PANEL PRINCIPAL
            </Link>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Control de Sorteos</h1>
            <p className="text-zinc-500 text-sm font-medium">Gestión de participantes y selección de ganadores semanales.</p>
          </div>

          {/* SELECTOR DE CAMPAÑA */}
          <div className="relative w-full md:w-[300px]">
            <select 
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-500/10 shadow-sm cursor-pointer"
            >
              <option value="">Selecciona Campaña...</option>
              {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
          </div>
        </header>

        {selectedId ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* SELECTOR DE SEMANA (HORIZONAL) */}
            <div className="flex gap-3 overflow-x-auto pb-4 custom-scrollbar">
              {GIVEAWAY_SCHEDULE.map((g) => (
                <button
                  key={g.label}
                  onClick={() => setActiveGiveaway(g)}
                  className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                    activeGiveaway.label === g.label 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-zinc-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* ZONA DE SORTEO Y STATS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Card Stats */}
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mb-4">
                  <Users size={32} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Registrados en el periodo</p>
                <p className="text-5xl font-black tracking-tighter">{registrations.length}</p>
              </div>

              {/* Card Ganador Aleatorio */}
              <div className="lg:col-span-2 bg-zinc-900 dark:bg-white p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                <div className="flex-1 space-y-4 z-10 text-center md:text-left">
                  <h3 className="text-blue-400 dark:text-blue-600 font-black text-sm uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                    <Trophy size={16} /> Ganador de la Semana
                  </h3>
                  {winner ? (
                    <div className="animate-in zoom-in duration-500">
                      <p className="text-white dark:text-black text-3xl font-black uppercase tracking-tighter leading-none mb-2">{winner.full_name}</p>
                      <p className="text-zinc-400 dark:text-zinc-500 font-bold text-sm tracking-widest">{winner.phone} • {winner.dni}</p>
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-lg font-bold italic">¿Quién será el afortunado hoy?</p>
                  )}
                  <button 
                    onClick={pickRandomWinner}
                    disabled={registrations.length === 0}
                    className="mt-4 bg-white dark:bg-black text-black dark:text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-30"
                  >
                    {winner ? 'Sortear de Nuevo' : 'Realizar Sorteo'}
                  </button>
                </div>

                {winner && (
                  <div className="w-full md:w-48 h-48 bg-white/10 dark:bg-black/5 rounded-[2rem] overflow-hidden border border-white/10 dark:border-black/5 z-10">
                    <img src={winner.voucher_url} className="w-full h-full object-cover" alt="Voucher ganador" />
                  </div>
                )}

                {/* Decoración fondo */}
                <Trophy size={150} className="absolute -bottom-10 -right-10 text-white/5 dark:text-black/5 -rotate-12" />
              </div>
            </div>

            {/* TABLA DE REGISTROS */}
            <div className="bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/20">
                <h3 className="font-black uppercase tracking-tighter text-xl">Registros del Periodo</h3>
                <button className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:opacity-70">
                  <Download size={16} /> Exportar Excel
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/50">
                      <th className="px-8 py-4">Participante</th>
                      <th className="px-8 py-4">DNI / Documento</th>
                      <th className="px-8 py-4">Contacto</th>
                      <th className="px-8 py-4">Fecha</th>
                      <th className="px-8 py-4">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                          <Loader2 className="animate-spin mx-auto text-zinc-300" size={40} />
                        </td>
                      </tr>
                    ) : registrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                        <td className="px-8 py-5">
                          <span className="font-black text-sm uppercase tracking-tight">{reg.full_name}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-bold text-zinc-500">{reg.dni || 'N/A'}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">{reg.phone}</span>
                            <span className="text-[10px] text-zinc-400 font-medium lowercase">{reg.email}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-zinc-400">
                            {new Date(reg.created_at).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' })} • {new Date(reg.created_at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <a 
                            href={reg.voucher_url} 
                            target="_blank" 
                            className="bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-xl inline-flex items-center gap-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group-hover:scale-110 shadow-sm"
                          >
                            <ExternalLink size={14} />
                            <span className="text-[10px] font-black uppercase">Ver</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {registrations.length === 0 && !loading && (
                  <div className="py-20 text-center space-y-4">
                    <AlertCircle size={48} className="mx-auto text-zinc-200" />
                    <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">No hay personas registradas para este sorteo.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-40 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[4rem] text-zinc-300">
            <Search size={64} strokeWidth={1} className="mb-4 opacity-20" />
            <p className="text-xl font-black uppercase tracking-tighter">Selecciona una campaña para ver los sorteos</p>
          </div>
        )}
      </div>
    </div>
  )
}