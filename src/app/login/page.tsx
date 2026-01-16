'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { handleUnifiedLogin } from './actions'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)


    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        setError(null)

        console.log('[Login Page] Submitting login...')
        const res = await handleUnifiedLogin(formData)
        console.log('[Login Page] Login response:', res)

        if (res.success && 'requiresSelection' in res) {
            if (res.requiresSelection) {
                console.log('[Login Page] REDIRECT → /select-dashboard (dual role)')
                router.push('/select-dashboard')
            } else if (res.isStaff) {
                console.log('[Login Page] REDIRECT → /quest-board (staff only)')
                router.push('/quest-board')
            } else if (res.isClient) {
                console.log('[Login Page] REDIRECT → /portal/dashboard (client only)')
                router.push('/portal/dashboard')
            } else {
                console.log('[Login Page] REDIRECT → / (no role)')
                router.push('/')
            }
        } else if (!res.success && 'error' in res) {
            console.log('[Login Page] LOGIN FAILED:', res.error)
            setError(res.error || 'Login failed')
            setIsLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-8 rounded-lg border border-sidebar-border bg-sidebar p-8 shadow-xl backdrop-blur-sm">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/quest-logo.png"
                            alt="Quest"
                            width={160}
                            height={48}
                            className="object-contain drop-shadow-[0_0_15px_rgba(120,40,200,0.5)]"
                            priority
                        />
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                        Sign in to your account
                    </p>
                </div>

                <form action={handleSubmit} className="mt-8 space-y-6">
                    {error && (
                        <div className="bg-destructive/10 p-3 rounded text-sm text-destructive border border-destructive/20">
                            {error}
                        </div>
                    )}
                    <div className="space-y-4 rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full rounded-md border-0 bg-secondary/50 p-2 text-foreground ring-1 ring-inset ring-sidebar-border placeholder:text-muted-foreground focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                placeholder="Email address"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="relative block w-full rounded-md border-0 bg-secondary/50 p-2 text-foreground ring-1 ring-inset ring-sidebar-border placeholder:text-muted-foreground focus:z-10 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            disabled={isLoading}
                            className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
                        </button>
                    </div>
                </form>

                {/* Demo Mode CTA */}
                <div className="pt-4 border-t border-sidebar-border">
                    <p className="text-xs text-center text-muted-foreground mb-3">
                        Want to explore first?
                    </p>
                    <Link
                        href="/demo"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all"
                    >
                        <span>🎮</span>
                        Try Demo Mode
                    </Link>
                </div>
            </div>

        </div>
    )
}

