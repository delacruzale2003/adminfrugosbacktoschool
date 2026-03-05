'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Copy, Trash2, Gift, Store, Lock, Globe, AlertCircle, Save, ImagePlus, Loader2,CalendarClock } from 'lucide-react'

interface Props {
  campaignId: string
}

export default function CampaignDashboard({ campaignId }: Props) {
  // --- STATES ---
  const [stores, setStores] = useState<any[]>([])
  const [prizes, setPrizes] = useState<any[]>([]) 
  const [templates, setTemplates] = useState<any[]>([]) 
  const [campaign, setCampaign] = useState<any>(null)
  const [selectedStore, setSelectedStore] = useState<string>('')

  // Estados para Programación (Scheduling)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)

  // Estado local para inputs de stock
  const [localStock, setLocalStock] = useState<Record<string, string>>({})
  const [savingItems, setSavingItems] = useState<Record<string, boolean>>({})



  
// Inputs para Nueva Tienda / Premios
      const [newStoreName, setNewStoreName] = useState('')
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateImage, setNewTemplateImage] = useState<File | null>(null)
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false)


  // --- EFFECTS ---
  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
      fetchTemplates()
      fetchStores()
      resetView()
    }
  }, [campaignId])

  useEffect(() => {
    if (selectedStore) fetchPrizes(selectedStore)
  }, [selectedStore])

  // --- HELPERS ---
  const resetView = () => {
    setSelectedStore('')
    setPrizes([])
    setLocalStock({})
    setSavingItems({})
  }

  // Función para formatear la fecha de Supabase al formato del input (datetime-local)
  const formatForInput = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toISOString().slice(0, 16)
  }

  // --- FETCHERS ---
  async function fetchCampaign() {
    const { data } = await supabase.from('campaigns').select('*').eq('id', campaignId).single()
    if (data) {
      setCampaign(data)
      setStartAt(data.start_at ? formatForInput(data.start_at) : '')
      setEndAt(data.end_at ? formatForInput(data.end_at) : '')
    }
  }

  async function fetchTemplates() {
    // AHORA TAMBIÉN TRAEMOS image_url
    const { data } = await supabase.from('prize_templates').select('*').eq('campaign_id', campaignId).order('created_at', { ascending: true })
    if (data) setTemplates(data)
  }

  async function fetchStores() {
    const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true) 
        .order('created_at', { ascending: true })
    
    if (data) setStores(data)
  }

  async function fetchPrizes(storeId: string) {
    const { data } = await supabase.from('prizes').select('*').eq('store_id', storeId).eq('is_active', true)
    
    if (data) {
      setPrizes(data)
      const initialStock: Record<string, string> = {}
      data.forEach(p => {
        initialStock[p.name] = p.stock.toString()
      })
      setLocalStock(initialStock)
    }
  }
// --- ACTIONS: SCHEDULING ---
  const saveSchedule = async () => {
    setIsSavingSchedule(true)
    const { error } = await supabase
      .from('campaigns')
      .update({
        start_at: startAt || null, // Si está vacío, se guarda NULL (Siempre activo)
        end_at: endAt || null
      })
      .eq('id', campaignId)

    setIsSavingSchedule(false)
    if (!error) {
        alert("Horario de campaña actualizado.")
        fetchCampaign()
    }
  }
  // --- ACTIONS: MASTER TEMPLATES ---
  const addTemplate = async () => {
    if (!newTemplateName || !newTemplateImage) {
        alert("Debes ingresar un nombre y seleccionar una imagen para el premio.")
        return
    }

    setIsUploadingTemplate(true)

    try {
        // 1. Subir la imagen al bucket 'prize_images'
        const fileExt = newTemplateImage.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${campaignId}/${fileName}` // Agrupado por campaña

        const { error: uploadError } = await supabase.storage
            .from('prize_images')
            .upload(filePath, newTemplateImage)

        if (uploadError) throw new Error("Error al subir la imagen.")

        // 2. Obtener la URL pública
        const { data: publicUrlData } = supabase.storage
            .from('prize_images')
            .getPublicUrl(filePath)

        const imageUrl = publicUrlData.publicUrl

        // 3. Guardar en la base de datos
        const { error: insertError } = await supabase.from('prize_templates').insert({ 
            name: newTemplateName, 
            campaign_id: campaignId,
            image_url: imageUrl // GUARDAMOS LA URL AQUÍ
        })

        if (insertError) throw insertError

        // 4. Limpiar y recargar
        setNewTemplateName('')
        setNewTemplateImage(null)
        fetchTemplates()

    } catch (error) {
        console.error(error)
        alert("Ocurrió un error al guardar el premio.")
    } finally {
        setIsUploadingTemplate(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if(!confirm("¿Seguro que deseas eliminar este premio maestro?")) return
    await supabase.from('prize_templates').delete().eq('id', id)
    fetchTemplates()
  }

  const copyClientLink = () => {
    const link = `${window.location.origin}/share/${campaign?.share_uuid}`
    navigator.clipboard.writeText(link)
    alert('Link copiado: ' + link)
  }

  // --- ACTIONS: STORES ---
  const addStore = async () => {
    if (!newStoreName) return
    const { data } = await supabase.from('stores').insert({ name: newStoreName, campaign_id: campaignId }).select()
    if (data) {
      setNewStoreName('')
      fetchStores()
      setSelectedStore(data[0].id)
    }
  }

  const deleteStore = async (id: string) => {
    const confirmDelete = window.confirm("¿Eliminar tienda?")
    if (!confirmDelete) return

    const { error } = await supabase.from('stores').update({ is_active: false }).eq('id', id)
    
    if (error) {
        console.error("Error al eliminar tienda:", error)
        alert("Error al eliminar. Revisa la consola o permisos.")
        return
    }

    setStores(prev => prev.filter(s => s.id !== id))
    if (selectedStore === id) resetView()
    fetchStores()
  }

  // --- ACTIONS: STOCK MANAGEMENT ---
  
  const handleLocalStockChange = (templateName: string, val: string) => {
    setLocalStock(prev => ({ ...prev, [templateName]: val }))
  }

  const saveStockToDb = async (templateName: string) => {
    if (!selectedStore) return
    
    setSavingItems(prev => ({ ...prev, [templateName]: true }))

    const valStr = localStock[templateName]
    const stockVal = valStr && valStr !== '' ? parseInt(valStr) : 0

    // Buscamos la plantilla original para copiar su URL de imagen
    const templateRef = templates.find(t => t.name === templateName)

    const { data, error } = await supabase
        .from('prizes')
        .upsert({
            store_id: selectedStore,
            campaign_id: campaignId,
            name: templateName,
            stock: stockVal,
            is_active: true,
            image_url: templateRef?.image_url // <--- COPIAMOS LA IMAGEN DE LA PLANTILLA AL PREMIO DE LA TIENDA
        }, { onConflict: 'store_id, name' })
        .select()
        .single()

    setSavingItems(prev => ({ ...prev, [templateName]: false }))

    if (error) {
        console.error("Error guardando stock:", error)
        alert("Error al guardar stock. Asegúrate de que no sea negativo.")
    } else {
        setPrizes(prev => {
            const exists = prev.find(p => p.name === templateName)
            if (exists) {
                return prev.map(p => p.name === templateName ? { ...p, stock: stockVal } : p)
            } else {
                return [...prev, data]
            }
        })
    }
  }

  // --- RENDER ---
  return (
    <div className="flex flex-col gap-8 h-full pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 1. CONFIGURACIÓN SUPERIOR: LINK & PROGRAMACIÓN ELEGANTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL: Link Maestro (Col 4) */}
        <div className="lg:col-span-4 bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[3rem] border border-amber-100 dark:border-amber-800 flex flex-col justify-between relative overflow-hidden group">
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all"></div>
    <div>
      <div className="flex items-center gap-3 mb-4 text-amber-700 dark:text-amber-300 font-black uppercase tracking-tighter text-xl">
        <div className="bg-amber-500 text-white p-2 rounded-2xl shadow-lg shadow-amber-500/30">
          <Plus size={20}/>
        </div>
        Link de Gestión
      </div>
      <p className="text-xs text-amber-600/80 dark:text-amber-400 mb-6 font-semibold leading-relaxed">
          Comparte este link con el cliente para que pueda **gestionar el stock** de sus tiendas sin entrar al panel administrativo.
      </p>
      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md p-4 rounded-3xl border border-amber-200/50 dark:border-amber-900/50 break-all text-[11px] font-mono mb-6 text-amber-900 dark:text-amber-100 shadow-inner">
          {typeof window !== 'undefined' ? `${window.location.origin}/share/${campaign?.share_uuid}` : 'Cargando...'}
      </div>
    </div>
    <button 
      onClick={() => {
          const shareUrl = `${window.location.origin}/share/${campaign?.share_uuid}`;
          navigator.clipboard.writeText(shareUrl)
          alert("Link de gestión copiado: " + shareUrl)
      }}
      className="flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-600 text-white px-6 py-4 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-xl shadow-amber-600/20 uppercase tracking-tighter"
    >
      <Copy size={18}/> Copiar Link de Socio
    </button>
  </div>

        {/* PANEL: Programación de Horarios Apple Style (Col 8) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
                <h3 className="font-black text-2xl flex items-center gap-3 text-zinc-900 dark:text-white uppercase tracking-tighter">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-2xl">
                    <CalendarClock size={24} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  Cronograma de Acceso
                </h3>
            </div>
            <button 
                onClick={saveSchedule} disabled={isSavingSchedule}
                className="w-full sm:w-auto bg-black dark:bg-white text-white dark:text-black px-8 py-4 rounded-3xl text-sm font-black shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-tight"
            >
                {isSavingSchedule ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Actualizar Horario
            </button>
          </div>

          {/* Grid de Selectores Separados visualmente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             
             {/* Bloque INICIO */}
             <div className="relative group">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-purple-500 rounded-full opacity-20 group-focus-within:opacity-100 transition-opacity"></div>
                <label className="text-[11px] font-black uppercase text-zinc-400 ml-2 mb-3 block tracking-[0.2em]">Apertura de Campaña</label>
                <div className="bg-zinc-50 dark:bg-black rounded-[2rem] p-2 border border-zinc-100 dark:border-zinc-800 transition-all focus-within:ring-4 focus-within:ring-purple-500/5 focus-within:border-purple-500/30">
                  <input 
                    type="datetime-local"
                    value={startAt}
                    onChange={e => setStartAt(e.target.value)}
                    className="w-full bg-transparent px-5 py-4 text-lg font-black outline-none appearance-none cursor-pointer"
                  />
                </div>
                <p className="text-[9px] text-zinc-400 mt-3 ml-4 font-bold uppercase tracking-widest">Formato: Día / Mes / Año — Hora</p>
             </div>

             {/* Bloque CIERRE */}
             <div className="relative group">
                <div className="absolute -left-3 top-0 bottom-0 w-1 bg-red-500 rounded-full opacity-20 group-focus-within:opacity-100 transition-opacity"></div>
                <label className="text-[11px] font-black uppercase text-zinc-400 ml-2 mb-3 block tracking-[0.2em]">Cierre de Campaña</label>
                <div className="bg-zinc-50 dark:bg-black rounded-[2rem] p-2 border border-zinc-100 dark:border-zinc-800 transition-all focus-within:ring-4 focus-within:ring-red-500/5 focus-within:border-red-500/30">
                  <input 
                    type="datetime-local"
                    value={endAt}
                    onChange={e => setEndAt(e.target.value)}
                    className="w-full bg-transparent px-5 py-4 text-lg font-black outline-none appearance-none cursor-pointer"
                  />
                </div>
                <div className="flex justify-between mt-3 px-4">
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Periodo Final</p>
                  <button onClick={() => setEndAt('')} className="text-[9px] text-red-500 font-black uppercase tracking-widest hover:underline">Limpiar</button>
                </div>
             </div>

          </div>
        </div>

      </div>

      <div className="px-4">
        <hr className="border-zinc-200 dark:border-zinc-800" />
      </div>

      {/* 2. GESTIÓN TÉCNICA: PREMIOS, TIENDAS Y STOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-auto lg:h-[650px]">
        
        {/* COLUMNA IZQUIERDA: Premios y Tiendas */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-1 custom-scrollbar">
          
          {/* Premios Maestros Card */}
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
              <h2 className="font-black text-xl flex items-center gap-3 text-amber-500 uppercase tracking-tighter mb-6">
                  <Lock size={20}/> Premios Base
              </h2>
              
              <div className="flex gap-2 mb-6 items-center bg-zinc-50 dark:bg-black p-2 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-inner">
                  <label className={`cursor-pointer p-3 rounded-xl transition-all flex items-center justify-center shrink-0
                      ${newTemplateImage ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-300'}
                  `}>
                      <ImagePlus size={20} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setNewTemplateImage(e.target.files ? e.target.files[0] : null)} />
                  </label>
                  <input 
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="Nombre del premio..."
                      className="flex-1 bg-transparent border-none text-sm font-bold outline-none px-3 text-zinc-800 dark:text-zinc-100"
                  />
                  <button 
                      onClick={addTemplate} 
                      disabled={isUploadingTemplate || !newTemplateName || !newTemplateImage}
                      className="bg-black dark:bg-white text-white dark:text-black p-3 rounded-xl hover:opacity-80 disabled:opacity-20 transition-all"
                  >
                      {isUploadingTemplate ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20}/>}
                  </button>
              </div>

              <div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                  {templates.map(t => (
                      <div key={t.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/30 px-4 py-3 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 group">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-white dark:border-zinc-800">
                                {t.image_url ? <img src={t.image_url} className="w-full h-full object-cover bg-white" alt=""/> : <div className="w-full h-full flex items-center justify-center bg-zinc-200"><Gift size={16}/></div>}
                              </div>
                              <span className="text-sm font-black tracking-tight text-zinc-700 dark:text-zinc-300 truncate max-w-[140px] uppercase">{t.name}</span>
                          </div>
                          <button onClick={() => deleteTemplate(t.id)} className="text-zinc-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          </div>

          {/* Listado de Tiendas Card */}
          <div className="bg-zinc-50 dark:bg-zinc-900/30 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 flex flex-col flex-1 overflow-hidden">
              <h3 className="font-black text-xl text-zinc-800 dark:text-zinc-200 mb-6 flex items-center gap-3 uppercase tracking-tighter">
                  <Store size={22} className="text-zinc-400"/> Sucursales
              </h3>
              <div className="flex gap-2 mb-6 bg-white dark:bg-zinc-900 p-2 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <input 
                      className="flex-1 bg-transparent px-4 py-2 text-sm font-bold outline-none"
                      placeholder="Nueva sucursal..."
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                  />
                  <button onClick={addStore} className="bg-zinc-900 dark:bg-white text-white dark:text-black p-2 rounded-xl hover:scale-105 transition-all"><Plus size={20}/></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {stores.map(s => (
                      <div 
                          key={s.id} onClick={() => setSelectedStore(s.id)}
                          className={`group p-5 rounded-[2rem] cursor-pointer border text-sm font-black uppercase tracking-tighter flex justify-between items-center transition-all ${selectedStore === s.id ? 'bg-white border-white shadow-2xl dark:bg-zinc-800 text-blue-600 scale-[1.03]' : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
                      >
                          {s.name}
                          <button onClick={(e) => { e.stopPropagation(); deleteStore(s.id) }} className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                      </div>
                  ))}
              </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Gestión de Stock Apple Style */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 p-10 rounded-[4rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col h-full overflow-hidden relative">
            {selectedStore ? (
                <>
                    <div className="mb-10 flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[11px] font-black uppercase text-purple-500 tracking-[0.3em]">Inventario Activo</span>
                            <h3 className="font-black text-4xl uppercase tracking-tighter leading-none">
                              {stores.find(s=>s.id === selectedStore)?.name}
                            </h3>
                        </div>
                        <div className="bg-zinc-50 dark:bg-black px-6 py-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest leading-none mb-1">Total Premios</p>
                          <p className="text-xl font-black">{templates.length}</p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pr-4 pb-8 custom-scrollbar">
                        {templates.map(template => {
                            const val = localStock[template.name] ?? ''
                            const isSaving = savingItems[template.name]
                            const existingPrize = prizes.find(p => p.name === template.name)
                            const isLocked = existingPrize && existingPrize.stock > 0

                            return (
                                <div key={template.id} className="p-6 bg-zinc-50 dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between group relative transition-all hover:shadow-2xl hover:bg-white dark:hover:bg-zinc-900 hover:-translate-y-1">
                                    <div className="mb-6">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white dark:border-zinc-800 mb-4 transform group-hover:rotate-3 transition-transform">
                                          {template.image_url ? <img src={template.image_url} className="w-full h-full object-cover bg-white" alt=""/> : <div className="w-full h-full flex items-center justify-center bg-zinc-200"><Gift size={24}/></div>}
                                        </div>
                                        <h4 className="font-black text-lg uppercase tracking-tighter leading-tight truncate" title={template.name}>{template.name}</h4>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-white dark:bg-zinc-900 px-5 py-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-inner focus-within:ring-4 focus-within:ring-purple-500/10 transition-all">
                                          <span className="text-[10px] font-black text-zinc-300">CANT.</span>
                                          <input 
                                              type="number" min="0" disabled={!!isLocked}
                                              className="w-full bg-transparent text-right font-black text-xl outline-none disabled:opacity-20 text-zinc-900 dark:text-white"
                                              value={val}
                                              onChange={(e) => handleLocalStockChange(template.name, e.target.value)}
                                          />
                                        </div>
                                        <button 
                                            onClick={() => saveStockToDb(template.name)}
                                            disabled={isSaving || !!isLocked}
                                            className={`p-4 rounded-2xl transition-all shadow-xl ${isLocked ? 'bg-zinc-100 text-zinc-300' : 'bg-black text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95'}`}
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                                        </button>
                                    </div>
                                    {isLocked && (
                                      <div className="absolute top-4 right-4 bg-zinc-200/50 dark:bg-zinc-800/50 p-2 rounded-xl backdrop-blur-md">
                                        <Lock size={12} className="text-zinc-500"/>
                                      </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-200 gap-6">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-12 rounded-[3rem] shadow-inner">
                      <Store size={80} strokeWidth={1} className="opacity-20"/>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-2xl font-black uppercase tracking-tighter text-zinc-400">Selecciona una sucursal</p>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-300">Para iniciar la gestión de stock</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}