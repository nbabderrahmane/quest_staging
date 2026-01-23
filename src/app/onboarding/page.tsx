'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Rocket, Users, Shield, Plus, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createTeam, getMatchingAlliances, joinAllianceByCode } from '@/app/teams/actions'

function OnboardingContent() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any>(null)
    const [view, setView] = useState<'welcome' | 'create-team' | 'join-team'>('welcome')

    const searchParams = useSearchParams()

    // Create Team State
    const [teamName, setTeamName] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Join Team State
    const [matchingAlliances, setMatchingAlliances] = useState<any[]>([])
    const [joinCode, setJoinCode] = useState('')
    const [joinError, setJoinError] = useState('')

    useEffect(() => {
        async function checkSession() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }
            setUser(user)

            // Check if user already has a team
            const { data: membership } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id)
                .limit(1)

            if (membership && membership.length > 0) {
                router.push('/quest-board')
                return
            }

            // Fetch matching alliances by domain
            const domain = user.email?.split('@')[1]
            if (domain && !['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'].includes(domain)) {
                const matches = await getMatchingAlliances(domain)
                setMatchingAlliances(matches || [])
            }

            setLoading(false)
        }
        checkSession()
    }, [router])

    useEffect(() => {
        const urlCode = searchParams.get('code')
        if (urlCode && !loading) {
            setJoinCode(urlCode.toUpperCase())
            setView('join-team')
        }
    }, [searchParams, loading])

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest animate-pulse">Syncing Mission Directives...</p>
            </div>
        )
    }

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!teamName) return
        setIsSubmitting(true)
        const formData = new FormData()
        formData.append('name', teamName)
        await createTeam(formData)
        // Redirect handled inside action
    }

    const handleJoinByCode = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!joinCode) return
        setIsSubmitting(true)
        setJoinError('')

        const result = await joinAllianceByCode(joinCode)
        if (result.success) {
            router.push('/quest-board')
        } else {
            setJoinError(result.error || 'Failed to join alliance')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden flex flex-col items-center justify-center p-6">
            {/* Background effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />

            <div className="max-w-xl w-full space-y-12 relative animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4">
                    <div className="flex justify-center mb-8">
                        <Image
                            src="/quest-logo.png"
                            alt="Quest"
                            width={160}
                            height={48}
                            className="object-contain drop-shadow-[0_0_15px_rgba(120,40,200,0.4)]"
                        />
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tight">Mission Authorization</h1>
                    <p className="text-muted-foreground font-mono text-sm max-w-md mx-auto line-clamp-2">
                        Welcome, Commander. Your credentials have been verified. You must now establish or join an operational alliance.
                    </p>
                </div>

                {view === 'welcome' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        <button
                            onClick={() => setView('create-team')}
                            className="p-8 rounded-2xl bg-sidebar/50 border border-sidebar-border hover:border-primary/50 group transition-all text-left"
                        >
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                                <Rocket className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2 uppercase tracking-tight">Establish New Alliance</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6">Create a new organization, define your first squad and recruit your crew.</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-primary">
                                Launch Forge <ArrowRight className="h-3 w-3" />
                            </div>
                        </button>

                        <button
                            onClick={() => setView('join-team')}
                            className="p-8 rounded-2xl bg-sidebar/50 border border-sidebar-border hover:border-blue-500/50 group transition-all text-left"
                        >
                            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-6 group-hover:scale-110 transition-transform">
                                <Users className="h-6 w-6" />
                            </div>
                            <h3 className="font-bold text-lg mb-2 uppercase tracking-tight">Join Alliance</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed mb-6">Join an existing organization by requesting access or entering an invite code.</p>
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-blue-500">
                                Link Credentials <ArrowRight className="h-3 w-3" />
                            </div>
                        </button>
                    </div>
                )}

                {view === 'create-team' && (
                    <div className="space-y-6 bg-sidebar/50 p-8 rounded-2xl border border-sidebar-border animate-in zoom-in-95 duration-300">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold uppercase underline decoration-primary decoration-2 underline-offset-4">Commission Alliance</h3>
                            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Identify your command center.</p>
                        </div>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Organization Name</label>
                                <input
                                    type="text"
                                    value={teamName}
                                    onChange={(e) => setTeamName(e.target.value)}
                                    placeholder="e.g. Galactic Core, Alpha Squad..."
                                    required
                                    className="w-full bg-background border border-sidebar-border p-3 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary transition-all"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setView('welcome')}
                                    className="px-6 py-2 rounded-lg border border-sidebar-border text-[10px] font-bold uppercase transition-colors hover:bg-muted"
                                >
                                    Back
                                </button>
                                <button
                                    disabled={isSubmitting || !teamName}
                                    className="flex-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Establish Sector'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {view === 'join-team' && (
                    <div className="space-y-8 bg-sidebar/50 p-8 rounded-2xl border border-sidebar-border animate-in zoom-in-95 duration-300">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold uppercase underline decoration-blue-500 decoration-2 underline-offset-4">Join Operational Alliance</h3>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Connect to an existing command center.</p>
                            </div>

                            {/* Matching Alliances Section */}
                            {matchingAlliances.length > 0 && (
                                <div className="space-y-3">
                                    <p className="text-[10px] font-bold uppercase text-blue-400">Detected Alliances for your domain:</p>
                                    <div className="grid gap-2">
                                        {matchingAlliances.map(alliance => (
                                            <div key={alliance.id} className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-white uppercase">{alliance.name}</p>
                                                    <p className="text-[9px] text-muted-foreground font-mono truncate">{alliance.domain}</p>
                                                </div>
                                                <div className="text-[9px] font-bold text-blue-500 uppercase px-2 py-1 bg-blue-500/10 rounded">
                                                    Match Detected
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-muted-foreground italic">
                                        Please enter the specific join code provided by your alliance commander below.
                                    </p>
                                </div>
                            )}

                            {/* Join Code Form */}
                            <form onSubmit={handleJoinByCode} className="space-y-4 pt-4 border-t border-sidebar-border">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alliance Join Code</label>
                                    <input
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. MBR-XXXXXX, AST-XXXXXX..."
                                        required
                                        className="w-full bg-background border border-sidebar-border p-3 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                    {joinError && <p className="text-destructive text-[10px] font-bold uppercase ml-1">{joinError}</p>}
                                </div>
                                <button
                                    disabled={isSubmitting || !joinCode}
                                    className="w-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-500 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Synchronize Credentials'}
                                </button>
                            </form>
                        </div>
                        <div className="flex justify-center border-t border-sidebar-border pt-4">
                            <button
                                onClick={() => setView('welcome')}
                                className="px-6 py-2 rounded-lg border border-sidebar-border text-[10px] font-bold uppercase transition-colors hover:bg-muted"
                            >
                                Back to Control
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Terminal...</p>
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    )
}
