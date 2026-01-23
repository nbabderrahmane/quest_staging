'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { Team } from '@/lib/types'

interface ContextGateProps {
    teams: Team[]
    onSelectTeam: (teamId: string) => void
    availableSquads?: { id: string, name: string }[]
    onSelectSquad?: (squadId: string) => void
}

export function ContextGate({ teams, onSelectTeam, availableSquads, onSelectSquad }: ContextGateProps) {
    const [loading, setLoading] = useState<string | null>(null)

    const handleTeamSelect = (teamId: string) => {
        setLoading(teamId)
        onSelectTeam(teamId)
    }

    const handleSquadSelect = (squadId: string) => {
        setLoading(squadId)
        if (onSelectSquad) onSelectSquad(squadId)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background z-0" />

            <div className="z-10 w-full max-w-4xl flex flex-col items-center gap-8">
                <div className="relative w-48 h-16">
                    <Image
                        src="/quest-logo.png"
                        alt="Quest"
                        fill
                        className="object-contain drop-shadow-[0_0_15px_rgba(120,40,200,0.5)]"
                        priority
                    />
                </div>

                {!availableSquads ? (
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold tracking-tighter">Select Your Organization</h1>
                        <p className="text-muted-foreground text-lg">Choose the alliance you wish to deploy with.</p>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {teams.map(team => (
                                <Card
                                    key={team.id}
                                    className="bg-card/50 backdrop-blur border-primary/20 hover:border-primary transition-all hover:shadow-[0_0_30px_rgba(120,40,200,0.2)] group cursor-pointer"
                                    onClick={() => handleTeamSelect(team.id)}
                                >
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <Building2 className="h-6 w-6 text-primary" />
                                        </div>
                                        <CardTitle className="truncate">{team.name}</CardTitle>
                                        <CardDescription>Deploy to this workspace.</CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground" disabled={!!loading}>
                                            {loading === team.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Select <ArrowRight className="ml-2 h-4 w-4" /></>}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-2">
                        <h1 className="text-4xl font-bold tracking-tighter">Select Your Squad</h1>
                        <p className="text-muted-foreground text-lg">Choose your specific unit within the organization.</p>

                        <div className="grid md:grid-cols-2 gap-6 w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            {availableSquads.map(squad => (
                                <Card
                                    key={squad.id}
                                    className="bg-card/50 backdrop-blur border-purple-500/20 hover:border-purple-500 transition-all hover:shadow-[0_0_30px_rgba(120,40,200,0.2)] group cursor-pointer"
                                    onClick={() => handleSquadSelect(squad.id)}
                                >
                                    <CardHeader>
                                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                            <ShieldCheck className="h-6 w-6 text-purple-500" />
                                        </div>
                                        <CardTitle>{squad.name}</CardTitle>
                                        <CardDescription>Join this unit.</CardDescription>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button variant="outline" className="w-full group-hover:bg-purple-600 group-hover:text-white" disabled={!!loading}>
                                            {loading === squad.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join Squad <ArrowRight className="ml-2 h-4 w-4" /></>}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
