import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, Clock, Loader2, Trophy } from 'lucide-react'

export default function StatsView({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const { data: regs } = await supabase.from('registrations').select('created_at, stores(name)').eq('campaign_id', campaignId)
      if (!regs) return
      
      const hours = new Array(24).fill(0)
      const stores: Record<string, number> = {}
      regs.forEach((r: any) => {
        hours[new Date(r.created_at).getHours()]++
        const sName = r.stores?.name || 'Desconocida'
        stores[sName] = (stores[sName] || 0) + 1
      })
      setData({ hours, stores: Object.entries(stores).sort((a,b) => b[1] - a[1]) })
    }
    fetchStats()
  }, [campaignId])

  if (!data) return <div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-zinc-300"/></div>

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-700">
      {/* RANKING TIENDAS */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-white dark:border-zinc-800 shadow-sm">
        <h3 className="font-bold flex items-center gap-2 mb-8 text-xl tracking-tight"><Trophy size={20} className="text-yellow-500"/> Mejores Tiendas</h3>
        <div className="space-y-6">
          {data.stores.slice(0, 5).map(([name, count]: any, i: number) => (
            <div key={name} className="relative">
              <div className="flex justify-between text-xs font-black mb-2 uppercase tracking-widest text-zinc-400">
                <span>{i + 1}. {name}</span>
                <span className="text-blue-500">{count} regs</span>
              </div>
              <div className="h-3 bg-zinc-100 dark:bg-black rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(count / data.stores[0][1]) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HORARIOS */}
      <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-white dark:border-zinc-800 shadow-sm">
        <h3 className="font-bold flex items-center gap-2 mb-8 text-xl tracking-tight"><Clock size={20} className="text-purple-500"/> Horarios Pico</h3>
        <div className="flex items-end justify-between h-48 gap-1.5 px-2">
          {data.hours.map((count: number, i: number) => {
             const max = Math.max(...data.hours, 1);
             return (
              <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                <div 
                  className="w-full bg-zinc-100 dark:bg-black rounded-t-lg group-hover:bg-blue-500 transition-all relative shadow-inner"
                  style={{ height: `${(count / max) * 100}%`, minHeight: '4px' }}
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all font-bold">{count}</div>
                </div>
                <span className="text-[10px] font-black text-zinc-400">{i}h</span>
              </div>
             )
          })}
        </div>
      </div>
    </div>
  )
}