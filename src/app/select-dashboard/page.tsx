'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, User as UserIcon, Loader2, ArrowRight, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { getUnifiedUserRoles } from '@/app/actions/auth'

export default function SelectDashboardPage() {
    const [loading, setLoading] = useState(true)
    const [roles, setRoles] = useState<{ isStaff: boolean, isClient: boolean } | null>(null)
    const router = useRouter()

    useEffect(() => {
        async function checkRoles() {
            const data = await getUnifiedUserRoles()
            if (!data.userId) {
                router.push('/login')
                return
            }
            if (!data.requiresSelection) {
                // If they don't have dual roles, push them to their correct dashboard
                router.push(data.isStaff ? '/quest-board' : '/portal/dashboard')
                return
            }
            setRoles({ isStaff: data.isStaff, isClient: data.isClient })
            setLoading(false)
        }
        checkRoles()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-slate-400 font-mono text-xs uppercase tracking-[0.2em] animate-pulse">Syncing Mission Status...</p>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-primary/30">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />
            </div>

            <main className="relative z-10 max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-center mb-8">
                        <Image
                            src="/quest-logo.png"
                            alt="Quest"
                            width={140}
                            height={44}
                            className="object-contain drop-shadow-[0_0_15px_rgba(120,40,200,0.4)]"
                            priority
                        />
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-white/10 text-xs font-mono text-primary mb-4">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        MULTIPLE ACCESS VECTORS DETECTED
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
                        Choose Your Operations Center
                    </h1>
                    <p className="text-slate-400 text-sm md:text-base max-w-md mx-auto">
                        Your account is authorized for both Internal Agency Operations and Client Operations.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    {/* Staff Dashboard Option */}
                    <button
                        onClick={() => router.push('/quest-board')}
                        className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border-2 border-slate-800 hover:border-primary/50 hover:bg-slate-800/60 transition-all duration-300 overflow-hidden text-center"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-6 group-hover:scale-110 transition-transform duration-500">
                            <Briefcase className="w-10 h-10" />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Forge</h3>
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-mono mb-6">Staff Dashboard</p>

                        <div className="w-full py-2.5 rounded-lg bg-slate-950/50 text-slate-300 font-bold text-xs uppercase tracking-tighter group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5">
                            Initialize Operations <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    </button>

                    {/* Client Portal Option */}
                    <button
                        onClick={() => router.push('/portal/dashboard')}
                        className="group relative flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/40 border-2 border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 overflow-hidden text-center"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                            <UserIcon className="w-10 h-10" />
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Fleet</h3>
                        <p className="text-slate-400 text-xs uppercase tracking-widest font-mono mb-6">Client Portal</p>

                        <div className="w-full py-2.5 rounded-lg bg-slate-950/50 text-slate-300 font-bold text-xs uppercase tracking-tighter group-hover:bg-blue-600 group-hover:text-white transition-all flex items-center justify-center gap-2 border border-white/5">
                            Enter Portal <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                    </button>
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    <div className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em] opacity-40">
                        SHIP QUEST // MISSION CONTROL SECURE
                    </div>
                    <button
                        onClick={async () => {
                            const { createClient } = await import('@/lib/supabase/client')
                            const supabase = createClient()
                            await supabase.auth.signOut()
                            router.push('/login')
                        }}
                        className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors"
                    >
                        [ Abort Session / Sign Out ]
                    </button>
                </div>
            </main>
        </div>
    )
}

