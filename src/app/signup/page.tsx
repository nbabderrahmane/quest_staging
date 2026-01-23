'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { signup } from '@/app/login/actions'
import { useRouter } from 'next/navigation'
import { Loader2, User, Mail, Lock } from 'lucide-react'
import { logger } from '@/lib/logger'

export default function SignupPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        const password = formData.get('password') as string
        const confirmPassword = formData.get('confirmPassword') as string

        if (password !== confirmPassword) {
            setError('Passwords do not match')
            setIsLoading(false)
            return
        }

        logger.info('Submitting signup', { component: 'SignupPage' })
        try {
            const res = await signup(formData)
            if (res && !res.success) {
                setError(res.error as string)
                setIsLoading(false)
            } else if (res && res.success && !res.hasSession) {
                // Email verification likely required
                setError('MISSION PENDING: Please check your inbox to verify your terminal credentials.')
                setIsLoading(false)
            } else {
                // Redirecting to root which will hit layout gate or onboarding
                router.push('/')
            }
        } catch (err: any) {
            logger.error('Signup failed', { component: 'SignupPage', error: err.message })
            setError(err.message || 'Signup failed')
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-lg space-y-8 rounded-2xl border border-sidebar-border/50 bg-sidebar/80 p-8 shadow-2xl backdrop-blur-xl relative z-10">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/quest-logo.png"
                            alt="Quest"
                            width={140}
                            height={42}
                            className="object-contain drop-shadow-[0_0_15px_rgba(120,40,200,0.4)]"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Initiate Enrollment</h1>
                    <p className="mt-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        Create your command profile
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-5">
                    {error && (
                        <div className="bg-destructive/10 p-3 rounded-lg text-xs font-bold text-destructive border border-destructive/20 animate-in fade-in slide-in-from-top-2">
                            {error.toUpperCase()}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">First Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="firstName"
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-sidebar-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    placeholder="John"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Last Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="lastName"
                                    type="text"
                                    required
                                    className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-sidebar-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Email Base</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-sidebar-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                placeholder="commander@base.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Sec-Code</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-sidebar-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Verify Sec-Code</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    className="w-full pl-10 pr-4 py-2 bg-secondary/30 border border-sidebar-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all disabled:opacity-50 mt-4 shadow-lg shadow-primary/20"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Enrollment'}
                    </button>
                </form>

                <div className="pt-6 border-t border-sidebar-border/50 text-center">
                    <p className="text-xs text-muted-foreground">
                        Already have access?{' '}
                        <Link href="/login" className="text-primary font-bold hover:underline">
                            SIGN IN
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
