'use client'

import { Plus, Store, Link as LinkIcon, Check, Trash2, Download } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

export default function StoresSidebar({ stores, selectedStore, onSelect, campaignId, campaignUrl, refreshStores }: any) {
  const [newStoreName, setNewStoreName] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const addStore = async () => {
    if (!newStoreName || !campaignId) return
    const { error } = await supabase.from('stores').insert({ name: newStoreName, campaign_id: campaignId })
    if (!error) {
      setNewStoreName('')
      refreshStores()
    }
  }

  // --- LINK SIMPLIFICADO (Sin https ni www) ---
  const getStoreLink = (id: string) => {
    // Quitamos protocolos para que el QR sea menos denso y más estético
    const baseDomain = (campaignUrl || 'fanta.ptm.pe').replace('https://', '').replace('www.', '')
    return `${baseDomain}/registro/${id}`
  }

  const handleCopyLink = (e: any, id: string) => {
    e.stopPropagation()
    // Para el copiado al portapapeles sí dejamos el https para que sea clickeable
    const fullUrl = `https://${getStoreLink(id)}`
    navigator.clipboard.writeText(fullUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadQr = (e: any, store: any) => {
    e.stopPropagation()
    const canvas = document.getElementById(`qr-${store.id}`) as HTMLCanvasElement
    if (!canvas) return

    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream")

    const downloadLink = document.createElement("a")
    downloadLink.href = pngUrl
    downloadLink.download = `QR_${store.name.replace(/\s+/g, '_')}.png`
    document.body.appendChild(downloadLink)
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

  const deleteStore = async (e: any, id: string) => {
    e.stopPropagation()
    if (!confirm("¿Eliminar tienda?")) return
    await supabase.from('stores').update({ is_active: false }).eq('id', id)
    refreshStores()
  }

  return (
    <div className="flex flex-col h-[500px] lg:h-[700px] bg-zinc-100/50 dark:bg-zinc-900/30 backdrop-blur-xl rounded-[2.5rem] border border-white dark:border-zinc-800/50 p-4 shadow-inner overflow-hidden">
      <div className="px-3 pt-3 pb-5 flex items-center gap-2 font-bold text-xl tracking-tight">
        <Store className="text-blue-500" size={22}/> Puntos de Entrega
      </div>
      
      <div className="flex gap-2 mb-6 px-1">
        <input 
          className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm font-medium"
          placeholder="Añadir tienda..."
          value={newStoreName}
          onChange={(e) => setNewStoreName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addStore()}
        />
        <button onClick={addStore} className="bg-blue-600 text-white p-3 rounded-2xl active:scale-90 transition-all shadow-lg shadow-blue-500/20">
          <Plus size={20} strokeWidth={3}/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 space-y-2.5 custom-scrollbar">
        {stores.map((s: any) => (
          <div 
            key={s.id} 
            onClick={() => onSelect(s.id)}
            className={`group relative p-4 rounded-[1.5rem] cursor-pointer flex justify-between items-center transition-all duration-300 border
              ${selectedStore === s.id 
                ? 'bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700 shadow-xl scale-[1.02]' 
                : 'bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-zinc-800/20'
              }`}
          >
            <span className={`text-[15px] truncate pr-4 ${selectedStore === s.id ? 'font-bold text-black dark:text-white' : 'font-medium text-zinc-500'}`}>
              {s.name}
            </span>
            
            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              
              {/* BOTÓN DESCARGAR QR */}
              <button 
                onClick={(e) => downloadQr(e, s)} 
                className="bg-zinc-100 dark:bg-zinc-700 p-2.5 rounded-full hover:bg-black hover:text-white transition-all shadow-sm"
                title="Descargar QR Limpio"
              >
                <Download size={14} />
              </button>

              <button 
                onClick={(e) => handleCopyLink(e, s.id)} 
                className="bg-zinc-100 dark:bg-zinc-700 p-2.5 rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-sm"
              >
                {copiedId === s.id ? <Check size={14} strokeWidth={3}/> : <LinkIcon size={14} />}
              </button>
              
              <button 
                onClick={(e) => deleteStore(e, s.id)} 
                className="bg-zinc-100 dark:bg-zinc-700 p-2.5 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 size={14}/>
              </button>

              {/* QR OCULTO OPTIMIZADO */}
              <div className="hidden">
                <QRCodeCanvas 
                  id={`qr-${s.id}`} 
                  value={getStoreLink(s.id)} 
                  size={1024} // Súper alta resolución para impresión
                  level={"M"}  // Nivel medio: menos puntos, más estético
                  marginSize={1} // Un poco de aire blanco alrededor
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}