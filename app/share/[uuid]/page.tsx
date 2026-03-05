'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Loader2, Store } from 'lucide-react'
import * as XLSX from 'xlsx'

// Componentes Segmentados
import CampaignHeader from '@/app/admin/components/CampaignHeader' 

import StatsView from '@/app/admin/components/StatsView' 
import StoreRegistrations from '@/app/admin/components/StoreRegistrations'
import StoresSidebar from '@/app/admin/components/StoreSidebar'
import InventoryGrid from '@/app/admin/components/InventoryGrid'

export default function ClientSharedPage() {
  const params = useParams()
  const shareUuid = params.uuid as string

  // --- ESTADOS GLOBALES ---
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [campaign, setCampaign] = useState<any>(null)
  const [stores, setStores] = useState<any[]>([])
  const [prizes, setPrizes] = useState<any[]>([]) 
  const [templates, setTemplates] = useState<any[]>([]) 
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [activeView, setActiveView] = useState<'stock' | 'registrations' | 'stats'>('stock')
  
  // Gestión de Stock
  const [localStock, setLocalStock] = useState<Record<string, string>>({})
  const [isSavingAll, setIsSavingAll] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => { if (shareUuid) initPage() }, [shareUuid])
  useEffect(() => { if (selectedStore) fetchPrizes(selectedStore) }, [selectedStore])

  async function initPage() {
    setLoading(true)
    const { data: campData, error } = await supabase.from('campaigns').select('*').eq('share_uuid', shareUuid).single()
    if (error || !campData) { setError(true); setLoading(false); return }
    setCampaign(campData)

    const { data: tmplData } = await supabase.from('prize_templates').select('*').eq('campaign_id', campData.id).order('created_at', { ascending: true })
    setTemplates(tmplData || [])

    const { data: storeData } = await supabase.from('stores').select('*').eq('campaign_id', campData.id).eq('is_active', true).order('created_at', { ascending: true })
    setStores(storeData || [])
    setLoading(false)
  }

  async function fetchPrizes(storeId: string) {
    setHasUnsavedChanges(false)
    const { data } = await supabase.from('prizes').select('*').eq('store_id', storeId).eq('is_active', true)
    const initialStock: Record<string, string> = {}
    data?.forEach(p => { initialStock[p.name] = p.stock.toString() })
    setPrizes(data || [])
    setLocalStock(initialStock)
  }

  const saveAllStockToDb = async () => {
    if (!selectedStore || !campaign) return
    setIsSavingAll(true)
    const prizesToUpsert = templates
      .filter(t => localStock[t.name] && !prizes.some(p => p.name === t.name && p.stock > 0))
      .map(t => ({
        store_id: selectedStore,
        campaign_id: campaign.id,
        name: t.name,
        stock: parseInt(localStock[t.name] || '0'),
        image_url: t.image_url,
        is_active: true
      }))

    await supabase.from('prizes').upsert(prizesToUpsert, { onConflict: 'store_id, name' })
    await fetchPrizes(selectedStore)
    setIsSavingAll(false)
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    const { data } = await supabase.from('registrations').select('created_at, full_name, dni, phone, email, stores(name), prizes(name)').eq('campaign_id', campaign.id)
    if (data) {
      const formatted = data.map(r => ({
        Fecha: new Date(r.created_at).toLocaleString(),
        Participante: r.full_name,
        DNI: r.dni,
        Tienda: (r.stores as any)?.name,
        Premio: (r.prizes as any)?.name
      }))
      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registros");
      XLSX.writeFile(wb, `Reporte_${campaign.name}.xlsx`);
    }
    setIsExporting(false)
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center"><Loader2 className="animate-spin text-zinc-400" size={32} /></div>

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-zinc-900 dark:text-zinc-100 p-4 sm:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <CampaignHeader 
          campaign={campaign} 
          onExport={exportToExcel} 
          isExporting={isExporting} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-4">
            <StoresSidebar 
    stores={stores} 
    selectedStore={selectedStore} 
    onSelect={(id: string) => { setSelectedStore(id); setActiveView('stock') }}
    campaignId={campaign?.id}
    campaignUrl={campaign?.campaign_url} // <--- FALTA ESTA LÍNEA
    refreshStores={() => initPage()}
  />
          </aside>

          <main className="lg:col-span-8 flex flex-col gap-6">
            {selectedStore ? (
              <>
                <div className="flex justify-between items-center bg-zinc-200/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl w-fit self-end shadow-inner">
                   {['stock', 'registrations', 'stats'].map((v) => (
                     <button 
                        key={v}
                        onClick={() => setActiveView(v as any)}
                        className={`px-6 py-2 rounded-xl text-xs font-bold capitalize transition-all ${activeView === v ? 'bg-white dark:bg-zinc-700 shadow-sm text-black dark:text-white' : 'text-zinc-500'}`}
                     >
                       {v === 'stock' ? 'Inventario' : v === 'registrations' ? 'Registros' : 'Análisis'}
                     </button>
                   ))}
                </div>

                {activeView === 'stock' && (
                  <InventoryGrid 
                    templates={templates} 
                    prizes={prizes} 
                    localStock={localStock} 
                    onChange={handleLocalStockChange} 
                    onSave={saveAllStockToDb}
                    isSaving={isSavingAll}
                    hasChanges={hasUnsavedChanges}
                  />
                )}
                {activeView === 'registrations' && <StoreRegistrations storeId={selectedStore} />}
                {activeView === 'stats' && <StatsView campaignId={campaign.id} />}
              </>
            ) : (
              <div className="h-[500px] flex flex-col items-center justify-center bg-white/40 dark:bg-zinc-900/20 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-white dark:border-zinc-800/50">
                <Store size={48} className="text-blue-500 mb-4 opacity-20"/>
                <p className="text-xl font-bold text-zinc-400">Selecciona una tienda para gestionar</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )

  function handleLocalStockChange(name: string, val: string) {
    setLocalStock(prev => ({ ...prev, [name]: val }))
    setHasUnsavedChanges(true)
  }
}