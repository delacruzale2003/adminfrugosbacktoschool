import { ShieldCheck, Download, Loader2 } from 'lucide-react'

export default function CampaignHeader({ campaign, onExport, isExporting }: any) {
  return (
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-8">
      <div>
        <span className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest shadow-sm mb-4">
          <ShieldCheck size={14} className="text-blue-500"/> Panel de Control
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-black dark:text-white">
          {campaign?.name}
        </h1>
      </div>
      <button
        onClick={onExport}
        disabled={isExporting}
        className="flex items-center gap-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 px-6 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm transition-all active:scale-95 disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="animate-spin text-zinc-400" size={20}/> : <Download className="text-green-500" size={20}/>}
        <div className="text-left">
          <p className="text-[9px] font-black uppercase text-zinc-400 leading-none">Exportar Campaña</p>
          <p className="text-sm font-bold">Reporte Excel</p>
        </div>
      </button>
    </header>
  )
}