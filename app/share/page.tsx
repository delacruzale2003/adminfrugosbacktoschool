'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  Store,
  Plus,
  Layers,
  ChevronRight,
  Save,
  Loader2,
  AlertCircle,
  Smartphone,
  Gift,
  Download,
  Users,
  CheckCircle2
} from 'lucide-react'
import * as XLSX from 'xlsx'

// --- CONFIGURACIÓN DE SUPABASE ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function App() {
  // --- CONFIGURACIÓN DE CAMPAÑA ---
  const CAMPAIGN_NAME = process.env.NEXT_PUBLIC_CAMPAIGN || 'FrugosBacktoSchool'
  
  // --- ESTADOS GLOBALES ---
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  
  const [campaign, setCampaign] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [selectedStore, setSelectedStore] = useState<any>(null)
  const [templates, setTemplates] = useState<any[]>([]) 
  const [prizes, setPrizes] = useState<any[]>([])
  
  // Gestión Resiliente de Stock
  const [localStock, setLocalStock] = useState<Record<string, number | string>>({})
  
  // UI States
  const [activeBatch, setActiveBatch] = useState(1) // Lote visible (1-4)
  const [newStoreName, setNewStoreName] = useState('')

  // --- CARGA INICIAL ---
  useEffect(() => {
    initAdmin()
  }, [])

  useEffect(() => {
    if (selectedStore) {
      fetchStoreData(selectedStore.id)
    }
  }, [selectedStore])

  async function initAdmin() {
    setLoading(true)
    // 1. Cargar Campaña
    const { data: camp, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('name', CAMPAIGN_NAME)
      .single()

    if (error || !camp) {
      console.error("Campaña no encontrada")
      setLoading(false)
      return
    }
    setCampaign(camp)

    // 2. Cargar Plantillas
    const { data: tmplData } = await supabase
      .from('prize_templates')
      .select('*')
      .eq('campaign_id', camp.id)
      .order('created_at', { ascending: true })
      .limit(4)
    setTemplates(tmplData || [])

    // 3. Cargar Tiendas
    const { data: storeData } = await supabase
      .from('stores')
      .select('*')
      .eq('campaign_id', camp.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
    setStores(storeData || [])
    
    setLoading(false)
  }

  async function fetchStoreData(storeId: any) {
    const { data } = await supabase
      .from('prizes')
      .select('*')
      .eq('store_id', storeId)
    
    const newStock: Record<string, number | string> = {}
    if (data) {
      data.forEach((p: any) => {
        const batch = p.batch_number || 1
        newStock[`${batch}_${p.name}`] = p.stock
      })
      setPrizes(data)
    }
    setLocalStock(newStock)
  }

  // --- ACCIONES ---
  const handleAddStore = async () => {
    if (!newStoreName || !campaign) return
    const { data: store } = await supabase.from('stores').insert({
      name: newStoreName,
      campaign_id: campaign.id,
      is_active: true
    }).select().single()

    if (store) {
      // Inicializar 16 registros (4 premios x 4 lotes)
      const prizesToCreate: any[] = []
      for (let b = 1; b <= 4; b++) {
        templates.forEach(t => {
          prizesToCreate.push({
            name: t.name,
            image_url: t.image_url,
            stock: 0,
            store_id: store.id,
            campaign_id: campaign.id,
            batch_number: b
          })
        })
      }
      
      const { error } = await supabase.from('prizes').insert(prizesToCreate)
      if (error) {
        console.error("Error al inicializar lotes:", error)
        alert(`Error de Base de Datos al crear los lotes: ${error.message}. Revisa la instrucción SQL recomendada.`)
      }
      
      setNewStoreName('')
      initAdmin() // Refrescar lista de tiendas
      setSelectedStore(store)
    }
  }

  const handleUpdateStock = (batch: number, prizeName: string, val: string) => {
    setLocalStock(prev => ({
      ...prev,
      [`${batch}_${prizeName}`]: val
    }))
  }

  const saveStock = async () => {
    setIsSaving(true)
    const prizesToUpsert: any[] = []
    
    for (let b = 1; b <= 4; b++) {
      templates.forEach(t => {
        const stockVal = parseInt(localStock[`${b}_${t.name}`] as string) || 0
        const existing = prizes.find(p => p.name === t.name && (p.batch_number === b || (!p.batch_number && b === 1)))
        
        const rowData: any = {
          name: t.name,
          image_url: t.image_url,
          stock: stockVal,
          store_id: selectedStore.id,
          campaign_id: campaign.id,
          batch_number: b,
          is_active: true
        }
        
        // Si el registro ya existe en BD, mandamos su ID para que Upsert lo actualice
        if (existing?.id) {
          rowData.id = existing.id
        }
        
        prizesToUpsert.push(rowData)
      })
    }

    // Usamos onConflict: 'id' para forzar que la actualización use la Primary Key
    const { error } = await supabase.from('prizes').upsert(prizesToUpsert, { onConflict: 'id' })
    
    if (error) {
      console.error("Error detallado de Supabase:", error)
      alert(`Ocurrió un error al guardar en la BD: ${error.message}. Asegúrate de eliminar la constraint "unique_prize_per_store".`)
    } else {
      alert("¡Stock de Lotes guardado exitosamente!")
    }

    await fetchStoreData(selectedStore.id)
    setIsSaving(false)
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    const { data } = await supabase
      .from('registrations')
      .select('created_at, full_name, dni, phone, email, stores(name), prizes(name)')
      .eq('campaign_id', campaign.id)
    
    if (data) {
      const formatted = data.map((r: any) => ({
        Fecha: new Date(r.created_at).toLocaleString(),
        Participante: r.full_name,
        DNI: r.dni,
        Telefono: r.phone,
        Tienda: Array.isArray(r.stores) ? r.stores[0]?.name : (typeof r.stores === 'object' ? r.stores?.name : ''),
        Premio: Array.isArray(r.prizes) ? r.prizes[0]?.name : (typeof r.prizes === 'object' ? r.prizes?.name : '') || 'Ninguno'
      }))
      const ws = XLSX.utils.json_to_sheet(formatted)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Registros")
      XLSX.writeFile(wb, `Reporte_Frugos_${new Date().toLocaleDateString()}.xlsx`)
    }
    setIsExporting(false)
  }

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 gap-4">
      <Loader2 className="animate-spin text-green-600" size={40} />
      <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px]">Cargando Control Center...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans p-4 md:p-8 selection:bg-green-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER PRINCIPAL */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-green-500 rounded-3xl flex items-center justify-center shadow-lg shadow-green-500/20 rotate-3">
               <Smartphone className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none flex items-center gap-2">
                Frugos <span className="text-green-600 italic">Back to School</span>
              </h1>
              <p className="text-zinc-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <CheckCircle2 size={12} className="text-green-500" /> Campaña Activa: {CAMPAIGN_NAME}
              </p>
            </div>
          </div>
          
          <button 
            onClick={exportToExcel}
            disabled={isExporting}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white dark:bg-white dark:text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Exportar Global
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* BARRA LATERAL: TIENDAS */}
          <aside className="lg:col-span-3 space-y-6">
             <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-6 shadow-sm border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Store size={14} /> Tiendas
                  </h3>
                  <span className="bg-zinc-100 dark:bg-black px-2 py-1 rounded-lg text-[10px] font-bold">{stores.length}</span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex gap-2 bg-zinc-50 dark:bg-black p-1.5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <input 
                      type="text" 
                      placeholder="Nueva sucursal..." 
                      className="bg-transparent border-none outline-none px-3 py-2 text-xs font-bold w-full"
                      value={newStoreName}
                      onChange={e => setNewStoreName(e.target.value)}
                    />
                    <button 
                      onClick={handleAddStore}
                      className="bg-green-600 text-white p-2.5 rounded-xl hover:bg-green-700 transition-all"
                    >
                      <Plus size={18} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
                  {stores.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSelectedStore(s)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all font-bold text-xs ${
                        selectedStore?.id === s.id 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20 scale-[1.02]' 
                        : 'bg-zinc-50 dark:bg-black text-zinc-500 hover:bg-white dark:hover:bg-zinc-800 border border-transparent'
                      }`}
                    >
                      <span className="truncate uppercase">{s.name}</span>
                      <ChevronRight size={14} className={selectedStore?.id === s.id ? "opacity-100" : "opacity-30"} />
                    </button>
                  ))}
                </div>
             </div>
          </aside>

          {/* CONTENIDO PRINCIPAL */}
          <main className="lg:col-span-9 space-y-6">
            {selectedStore ? (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
                
                {/* BOTONERA SUPERIOR */}
                <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-2 rounded-3xl shadow-sm border border-zinc-200 dark:border-zinc-800">
                   <div className="flex gap-1 pl-4">
                     <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                       <Layers size={14} /> Inventario en Lotes
                     </span>
                   </div>

                   <div className="flex items-center gap-4">
                     <a 
                       href={`/admin/registrations?store=${selectedStore.id}`}
                       className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-600 flex items-center gap-2 transition-colors px-4"
                     >
                       <Users size={14} /> Ver Registros
                     </a>
                     
                     <button 
                       onClick={saveStock}
                       disabled={isSaving}
                       className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-500/10"
                     >
                       {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                       Guardar Lotes
                     </button>
                   </div>
                </div>

                {/* VISTA: INVENTARIO POR LOTES */}
                <div className="bg-white dark:bg-zinc-900 rounded-[3rem] shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col xl:flex-row justify-between gap-6 bg-zinc-50/50 dark:bg-black/20">
                     <div className="space-y-1 shrink-0">
                       <h3 className="text-xl font-black uppercase tracking-tighter italic">Gestión de Stock</h3>
                       <p className="text-zinc-400 text-xs font-medium">Sucursal: <span className="text-black dark:text-white">{selectedStore.name}</span></p>
                     </div>
                     
                     <div className="flex bg-white dark:bg-black p-1.5 rounded-2xl shadow-inner border border-zinc-200 dark:border-zinc-800 overflow-x-auto custom-scrollbar w-full xl:w-auto">
                       {[1, 2, 3, 4].map(num => {
                         const totalStock = templates.reduce((sum, t) => sum + (parseInt(localStock[`${num}_${t.name}`] as string) || 0), 0)
                         return (
                         <button
                           key={num}
                           onClick={() => setActiveBatch(num)}
                           className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-2 ${
                             activeBatch === num ? 'bg-green-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                           }`}
                         >
                           Lote {num}
                           <span className={`px-2 py-0.5 rounded-full text-[8px] ${activeBatch === num ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                             {totalStock}
                           </span>
                         </button>
                         )
                       })}
                     </div>
                  </div>

                  <div className="p-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                     {templates.length === 0 ? (
                       <div className="col-span-full py-10 flex flex-col items-center text-zinc-400 gap-3">
                         <AlertCircle size={40} className="opacity-20" />
                         <p className="font-black uppercase text-xs tracking-widest">No hay premios maestros configurados en el template</p>
                       </div>
                     ) : templates.map(t => {
                       const stockVal = localStock[`${activeBatch}_${t.name}`] ?? ''
                       
                       return (
                       <div key={t.id} className="bg-zinc-50 dark:bg-black/40 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 flex flex-col items-center group transition-all hover:border-green-300">
                          <div className="w-24 h-24 bg-white dark:bg-zinc-800 rounded-3xl overflow-hidden shadow-inner border border-zinc-100 dark:border-zinc-700 mb-6 group-hover:scale-105 transition-transform">
                            {t.image_url ? (
                              <img src={t.image_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-200"><Gift size={32} /></div>
                            )}
                          </div>
                          <h4 className="font-black text-xs uppercase tracking-tighter text-center mb-6 line-clamp-1 leading-none h-4">{t.name}</h4>
                          
                          <div className="w-full space-y-1">
                            <label className="text-[8px] font-black uppercase text-zinc-400 ml-4 tracking-[0.2em]">Disponible</label>
                            <input 
                              type="number"
                              min="0"
                              className="w-full bg-white dark:bg-zinc-900 px-4 py-3 rounded-2xl font-black text-2xl text-center outline-none border border-zinc-100 dark:border-zinc-800 focus:ring-4 focus:ring-green-500/10 transition-all shadow-sm"
                              value={stockVal}
                              onChange={e => handleUpdateStock(activeBatch, t.name, e.target.value)}
                            />
                          </div>
                       </div>
                       )
                     })}
                  </div>

                  <div className="p-6 bg-green-50/50 dark:bg-green-900/10 border-t border-green-100 dark:border-green-900/30 flex items-center gap-3">
                     <AlertCircle size={18} className="text-green-600 shrink-0" />
                     <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-widest leading-relaxed">
                        IMPORTANTE: Los premios del Lote {activeBatch + 1 > 4 ? 4 : activeBatch + 1} se habilitarán automáticamente cuando la sumatoria de stock del Lote {activeBatch} llegue a 0.
                     </p>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full min-h-[650px] bg-white/40 dark:bg-zinc-900/20 backdrop-blur-xl border-2 border-dashed border-white dark:border-zinc-800 rounded-[4rem] flex flex-col items-center justify-center text-zinc-300 gap-6">
                 <div className="bg-white dark:bg-zinc-900 p-12 rounded-[3rem] shadow-xl animate-pulse">
                   <Store size={80} strokeWidth={1} className="opacity-20 text-green-500" />
                 </div>
                 <div className="text-center space-y-2">
                   <p className="text-2xl font-black uppercase tracking-tighter text-zinc-400">Selecciona una sucursal</p>
                   <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300">Para iniciar el control de campaña</p>
                 </div>
              </div>
            )}
          </main>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; }
      `}</style>
    </div>
  )
}