
export default function Loading() {
    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-20 pt-28 px-4 md:px-0">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
                <div className="space-y-3">
                    <div className="h-12 w-64 bg-white/5 rounded-2xl animate-pulse" />
                    <div className="h-4 w-40 bg-white/5 rounded-full animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-28 bg-white/5 rounded-xl animate-pulse" />
                    <div className="h-10 w-28 bg-white/5 rounded-xl animate-pulse" />
                </div>
            </div>

            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-32">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white/5 rounded-2xl animate-pulse" />
                ))}
            </div>

            {/* Main Grid Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-64">
                        <div className="bg-white/5 rounded-2xl animate-pulse" />
                        <div className="bg-white/5 rounded-2xl animate-pulse" />
                    </div>
                </div>
                <div className="h-96 bg-white/5 rounded-2xl animate-pulse" />
            </div>
        </div>
    )
}
