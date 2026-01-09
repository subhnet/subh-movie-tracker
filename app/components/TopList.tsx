'use client'

import OptimizedImage from './OptimizedImage'

interface PersonStat {
    name: string
    count: number
    profile_path?: string | null
}

interface TopListProps {
    title: string
    items: PersonStat[]
    icon: string
    emptyMessage?: string
}

export default function TopList({ title, items, icon, emptyMessage = "No data yet" }: TopListProps) {
    if (items.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full min-h-[300px] flex flex-col items-center justify-center text-white/30 space-y-2">
                <h3 className="font-bold text-white text-lg tracking-tight self-start mb-auto flex items-center gap-2">
                    <span>{icon}</span> {title}
                </h3>
                <div className="flex flex-col items-center justify-center flex-1">
                    <span className="text-3xl opacity-50">👤</span>
                    <span className="text-sm font-medium">{emptyMessage}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">{icon}</span>
                <h3 className="font-bold text-white text-xl tracking-tight">{title}</h3>
            </div>

            <div className="space-y-4">
                {items.map((person, index) => (
                    <div key={person.name} className="flex items-center gap-4 group">
                        <div className="flex-shrink-0 font-mono text-sm font-bold text-white/30 w-4 text-center">
                            {index + 1}
                        </div>

                        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 shadow-lg group-hover:border-white/30 transition-colors bg-white/5">
                            <OptimizedImage
                                src={person.profile_path}
                                alt={person.name}
                                className="w-full h-full object-cover"
                                fallbackIcon="👤"
                            />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-white truncate max-w-[180px] group-hover:text-blue-300 transition-colors">
                                    {person.name}
                                </h4>
                                <span className="text-xs font-bold px-2 py-1 bg-white/10 rounded-lg text-white/80">
                                    {person.count} {person.count === 1 ? 'film' : 'films'}
                                </span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                                    style={{ width: `${(person.count / items[0].count) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
