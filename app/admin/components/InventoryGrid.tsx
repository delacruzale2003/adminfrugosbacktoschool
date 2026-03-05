import { Gift, Lock, Image as ImageIcon, Save, Loader2 } from 'lucide-react'

export default function InventoryGrid({ templates, prizes, localStock, onChange, onSave, isSaving, hasChanges }: any) {
  return (
    <div className="relative flex-1 flex flex-col">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-24 custom-scrollbar px-1">
        {templates.map((template: any) => {
          const val = localStock[template.name] ?? ''
          const isLocked = prizes.some((p: any) => p.name === template.name && p.stock > 0)

          return (
            <div key={template.id} className={`relative flex flex-col bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-white dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-500 ${isLocked ? 'opacity-80' : 'hover:shadow-2xl hover:-translate-y-1'}`}>
              
              {/* IMAGE PREVIEW */}
              <div className="aspect-[4/3] w-full bg-[#F5F5F7] dark:bg-black/40 p-6 flex items-center justify-center relative">
                {isLocked && (
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm z-10 border border-zinc-100 dark:border-zinc-700">
                    <Lock size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Fijado</span>
                  </div>
                )}
                {template.image_url ? (
                  <img src={template.image_url} alt={template.name} className="w-full h-full object-contain drop-shadow-2xl transition-transform duration-700 hover:scale-110" />
                ) : (
                  <div className="text-zinc-300 dark:text-zinc-700 flex flex-col items-center gap-2">
                    <ImageIcon size={48} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Sin imagen</span>
                  </div>
                )}
              </div>

              {/* INFO & INPUT */}
              <div className="p-6 flex flex-col gap-4">
                <h3 className="font-bold text-lg leading-tight line-clamp-2">{template.name}</h3>
                <div className={`flex items-center justify-between  dark:bg-black/50 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-3 transition-all ${!isLocked && 'focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:bg-black'}`}>
                  <span className="text-[10px] text-black-400 font-black uppercase tracking-widest">Stock</span>
                  <input 
                    type="number" min="0" disabled={isLocked}
                    className="w-full bg-black font-bold text-xl outline-none text-right "
                    value={val}
                    onChange={(e) => onChange(template.name, e.target.value)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* FLOATING SAVE BUTTON */}
      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
          <button 
            onClick={onSave} disabled={isSaving}
            className="bg-black dark:bg-white text-white dark:text-black px-10 py-4 rounded-full font-black shadow-2xl flex items-center gap-3 active:scale-95 transition-all border border-white/10"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20} className="text-blue-500"/> Confirmar Inventario</>}
          </button>
        </div>
      )}
    </div>
  )
}