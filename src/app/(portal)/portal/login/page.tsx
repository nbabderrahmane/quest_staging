'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, CheckCircle, AlertCircle, Briefcase, User as UserIcon } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

function PortalLoginContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [inviteToken, setInviteToken] = useState<string | null>(null)
    const [inviteStatus, setInviteStatus] = useState<'checking' | 'valid' | 'invalid' | null>(null)
    const [isSignUp, setIsSignUp] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [alreadyMember, setAlreadyMember] = useState(false)

    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const token = searchParams.get('invite')
        checkSession()
        if (token) {
            setInviteToken(token)
            verifyInvite(token)
            setIsSignUp(true)
        }
    }, [searchParams])

    async function checkSession() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)

        // If logged in and no invite, check if we should show role select or redirect
        if (user && !searchParams.get('invite')) {
            const roles = await checkRolesAction()
            if (roles.requiresSelection) {
                router.push('/select-dashboard')
            } else if (roles.isClient) {
                // router.push('/portal/dashboard')
            }
        }
    }

    async function verifyInvite(token: string) {
        setInviteStatus('checking')
        const supabase = createClient()
        const { data, error } = await supabase
            .from('client_invitations')
            .select('email, status, expires_at, client_id')
            .eq('token', token)
            .single()

        if (error || !data || data.status !== 'pending' || new Date(data.expires_at) < new Date()) {
            setInviteStatus('invalid')
        } else {
            setInviteStatus('valid')
            setEmail(data.email || '')

            // Check if already a member if logged in
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: member } = await supabase
                    .from('client_members')
                    .select('id')
                    .eq('client_id', data.client_id)
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (member) setAlreadyMember(true)
            }
        }
    }

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const supabase = createClient()

        try {
            if (isSignUp && inviteToken) {
                // 1. Try to Create Account (Bypass Email Confirm)
                const res = await signUpWithInvite(inviteToken, email, password)

                if (!res.success) {
                    // 2. If User Exists, Try to Log In instead
                    if (res.code === 'USER_EXISTS') {
                        const { error: loginError } = await supabase.auth.signInWithPassword({
                            email,
                            password
                        })

                        if (loginError) {
                            throw new Error(`This email is already registered. Please use your existing password to join.`)
                        }

                        // Link Invite to existing user
                        const linkRes = await acceptInviteAction(inviteToken, email)
                        if (!linkRes.success) throw new Error(linkRes.error)

                        // Check roles
                        const roles = await checkRolesAction()
                        if (roles.requiresSelection) {
                            router.push('/select-dashboard')
                        } else {
                            router.push('/portal/dashboard')
                        }
                        return
                    }

                    throw new Error(res.error)
                }

                // 3. If Sign Up Success, Log In immediately
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })

                if (loginError) throw loginError

                // Check roles
                const roles = await checkRolesAction()
                if (roles.requiresSelection) {
                    router.push('/select-dashboard')
                } else {
                    router.push('/portal/dashboard')
                }

            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error

                if (inviteToken) {
                    const res = await acceptInviteAction(inviteToken, email)
                    if (!res.success) throw new Error(res.error)
                }

                // Check roles
                const roles = await checkRolesAction()
                if (roles.requiresSelection) {
                    router.push('/select-dashboard')
                } else {
                    router.push('/portal/dashboard')
                }
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleDirectJoin() {
        if (!inviteToken) return
        setLoading(true)
        try {
            const res = await acceptInviteAction(inviteToken, currentUser.email)
            if (!res.success) throw new Error(res.error)

            // Check roles after joining
            const roles = await checkRolesAction()
            if (roles.requiresSelection) {
                router.push('/select-dashboard')
            } else {
                router.push('/portal/dashboard')
            }
        } catch (e: any) {
            alert(e.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
            <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl shadow-lg border border-border">
                <div className="text-center">
                    {/* Quest Logo */}
                    <div className="flex justify-center mb-4">
                        <Image
                            src="/quest-logo.png"
                            alt="Quest"
                            width={110}
                            height={34}
                            className="object-contain drop-shadow-[0_0_8px_rgba(120,40,200,0.2)]"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">Client Portal</h1>
                    <p className="text-muted-foreground mt-2">
                        {isSignUp ? 'Create your account to access tickets' : 'Sign in to view your tickets'}
                    </p>
                </div>

                {inviteToken && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 text-sm ${inviteStatus === 'valid' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : inviteStatus === 'invalid' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-muted'}`}>
                        {inviteStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {inviteStatus === 'valid' && <CheckCircle className="h-4 w-4" />}
                        {inviteStatus === 'invalid' && <AlertCircle className="h-4 w-4" />}
                        <div>
                            {inviteStatus === 'checking' && 'Verifying invitation...'}
                            {inviteStatus === 'valid' && 'Invitation valid! Set a password to join.'}
                            {inviteStatus === 'invalid' && 'Invalid or expired invitation link.'}
                        </div>
                    </div>
                )}

                {alreadyMember ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-500/10 text-blue-600 border border-blue-500/20 rounded-lg text-sm text-center">
                            You are already a member of this organization.
                        </div>
                        <button
                            onClick={async () => {
                                const roles = await checkRolesAction()
                                if (roles.requiresSelection) {
                                    router.push('/select-dashboard')
                                } else {
                                    router.push('/portal/dashboard')
                                }
                            }}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-bold uppercase tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                            Go to Dashboard <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                ) : currentUser && inviteToken && inviteStatus === 'valid' ? (
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg text-sm text-center">
                            You are logged in as <span className="font-bold text-foreground">{currentUser.email}</span>.
                        </div>
                        <button
                            onClick={handleDirectJoin}
                            disabled={loading}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-bold uppercase tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    Join Organization <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => createClient().auth.signOut().then(() => checkSession())}
                            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                        >
                            Sign in with a different account
                        </button>
                    </div>
                ) : (inviteStatus !== 'invalid') && (
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={!!inviteToken} // Lock email if inviting
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || inviteStatus === 'checking'}
                            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-bold uppercase tracking-wide hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <>
                                    {isSignUp ? 'Create Account & Join' : 'Sign In'}
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                        {inviteToken && (
                            <button
                                type="button"
                                onClick={() => setIsSignUp(!isSignUp)}
                                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                            </button>
                        )}
                    </form>
                )}

                {!inviteToken && (
                    <div className="text-center text-sm text-muted-foreground">
                        Don't have an account? Ask your agency for an invite.
                    </div>
                )}
            </div>
        </div>
    )
}

// Server Action Import
import { acceptClientInvite, signUpWithInvite } from '../../actions'
import { getUnifiedUserRoles } from '@/app/actions/auth'

async function acceptInviteAction(token: string, email: string) {
    return await acceptClientInvite(token, email)
}

async function checkRolesAction() {
    return await getUnifiedUserRoles()
}


export default function PortalLoginPage() {
    return (
        <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PortalLoginContent />
        </Suspense>
    )
}
