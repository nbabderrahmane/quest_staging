'use client'

import { Team } from '@/lib/types'
import { useState } from 'react'
import { BrandSettings } from '@/components/dashboard/brand-settings'
import { Input } from '@/components/ui/input'
import { Copy, Check, Save, Loader2, Info, Shield, Link as LinkIcon, Zap } from 'lucide-react'
import { updateOrganizationProfile } from '@/app/(dashboard)/admin/organization/actions'
import { SubTeamList } from '@/components/dashboard/sub-team-list'
import { generateAllianceCodes } from '@/app/teams/actions'
import { useRouter } from 'next/navigation'

export function OrgProfile({ team, userRole }: { team: Team, userRole: string }) {
    const [copied, setCopied] = useState(false)
    const [copiedCode, setCopiedCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    // Form State
    const [desc, setDesc] = useState(team.description || '')
    const [website, setWebsite] = useState(team.website || '')
    const [email, setEmail] = useState(team.contact_email || '')
    const [message, setMessage] = useState<string | null>(null)

    const canEdit = ['owner', 'admin'].includes(userRole)
    const router = useRouter()

    const hasNoCodes = !team.join_code_admin && !team.join_code_member
    const [activating, setActivating] = useState(false)

    const copyToClipboard = async (text: string, stateKey: 'id' | string) => {
        let success = false;
        console.log(`[OrgProfile] Attempting to copy: ${stateKey}`);

        // Phase 1: Modern Clipboard API
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                success = true;
                console.log('[OrgProfile] Copy successful via navigator.clipboard');
            } catch (err) {
                console.warn('[OrgProfile] Modern copy failed, trying fallback...', err);
            }
        }

        // Phase 2: Legacy Fallback (Hidden TextArea)
        if (!success) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();

                success = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (success) {
                    console.log('[OrgProfile] Copy successful via execCommand fallback');
                } else {
                    console.error('[OrgProfile] execCommand copy returned false');
                }
            } catch (err) {
                console.error('[OrgProfile] Fallback copy exception:', err);
            }
        }

        if (success) {
            if (stateKey === 'id') setCopied(true);
            else setCopiedCode(stateKey);

            setTimeout(() => {
                if (stateKey === 'id') setCopied(false);
                else setCopiedCode(null);
            }, 2000);
        } else {
            console.error('[OrgProfile] All copy attempts failed.');
            // Optional: visual error feedback if needed
        }
    }

    const copyId = () => copyToClipboard(team.id, 'id')
    const copyCode = (code: string) => copyToClipboard(code, code)
    const copyInviteLink = (code: string) => {
        const url = `${window.location.origin}/onboarding?code=${code}`
        copyToClipboard(url, `link-${code}`)
    }

    const handleSave = async () => {
        setLoading(true)
        setMessage(null)
        const res = await updateOrganizationProfile(team.id, { description: desc, website, contact_email: email })
        setLoading(false)
        if (res.success) {
            setMessage('Profile updated successfully.')
            setTimeout(() => setMessage(null), 3000)
        }
    }

    const handleActivateCodes = async () => {
        setActivating(true)
        const res = await generateAllianceCodes(team.id)
        if (res.success) {
            router.refresh()
            setMessage('Alliance codes activated!')
        } else {
            setMessage(`Activation failed: ${res.error}`)
        }
        setActivating(false)
    }

    return (
        <div className="space-y-8 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-black uppercase tracking-tighter">Organization Profile</h1>
                <div className="flex items-center gap-2 text-sm font-mono bg-muted/20 p-2 rounded w-fit border border-border">
                    <span className="text-muted-foreground mr-2">ID:</span>
                    <span className="text-primary">{team.id}</span>
                    <button onClick={copyId} className="hover:text-foreground transition-colors p-1">
                        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Branding */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-card border border-border rounded-lg p-4">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Insignia</h3>
                        <BrandSettings team={team} userRole={userRole} />
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-border">
                            <h3 className="text-sm font-bold uppercase tracking-wider">Public Dossier</h3>
                            {message && <span className="text-xs font-bold text-green-500 animate-in fade-in">{message}</span>}
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Organization Name</label>
                                    <Input value={team.name} disabled className="bg-muted font-bold opacity-80" />
                                    <p className="text-[10px] text-muted-foreground mt-1">Name is immutable by decree.</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Contact Email</label>
                                    <Input value={email} onChange={e => setEmail(e.target.value)} disabled={!canEdit} placeholder="comm@alliance.com" />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Website</label>
                                <Input value={website} onChange={e => setWebsite(e.target.value)} disabled={!canEdit} placeholder="https://" />
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">Description</label>
                                <textarea
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="Brief mission statement..."
                                    className="w-full h-32 bg-background border border-input rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                />
                            </div>
                        </div>

                        {canEdit && (
                            <div className="pt-4 border-t border-border flex justify-end">
                                <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase rounded hover:bg-primary/90 transition-colors">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    Save Profile
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sector Access Codes - Only for High Command */}
            {canEdit && (
                <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Shield className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider">Sector Access Codes</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-tight text-left">
                        Provide these codes to new crew members to grant them immediate authorization.
                        Each code assigns a specific rank upon entry.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { label: 'Admin', code: team.join_code_admin, color: 'text-red-500' },
                            { label: 'Manager', code: team.join_code_manager, color: 'text-orange-500' },
                            { label: 'Analyst', code: team.join_code_analyst, color: 'text-blue-500' },
                            { label: 'Developer', code: team.join_code_developer, color: 'text-purple-500' },
                            { label: 'Member', code: team.join_code_member, color: 'text-slate-400' },
                        ].map((item) => (
                            <div key={item.label} className="p-3 bg-muted/20 border border-border rounded-lg flex flex-col gap-1 group relative">
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${item.color} text-left`}>{item.label}</span>
                                <div className="flex items-center justify-between">
                                    <code className={`text-xs font-mono font-black tracking-widest ${!item.code ? 'text-muted-foreground italic' : ''}`}>
                                        {item.code || 'UNASSIGNED'}
                                    </code>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                if (item.code) copyCode(item.code)
                                            }}
                                            disabled={!item.code}
                                            className="p-1 hover:bg-muted rounded disabled:opacity-30"
                                            title="Copy Code"
                                        >
                                            {item.code && copiedCode === item.code ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (item.code) copyInviteLink(item.code)
                                            }}
                                            disabled={!item.code}
                                            className="p-1 hover:bg-muted rounded disabled:opacity-30"
                                            title="Copy Invite Link"
                                        >
                                            {item.code && copiedCode === `link-${item.code}` ? <Check className="h-3 w-3 text-green-500" /> : <LinkIcon className="h-3 w-3" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {hasNoCodes && canEdit && (
                        <div className="pt-4 flex justify-center">
                            <button
                                onClick={handleActivateCodes}
                                disabled={activating}
                                className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground text-xs font-bold uppercase rounded-lg hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(120,40,200,0.3)] hover:scale-105 active:scale-95"
                            >
                                {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 fill-current" />}
                                Activate Alliance Security Codes
                            </button>
                        </div>
                    )}

                    <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded text-[10px] text-blue-400 font-mono uppercase leading-relaxed text-left">
                        <Info className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>Security Protocol: Domain detection is ACTIVE for **{team.domain || 'none'}**. This domain was automatically extracted from the creator's credentials. New users with matching emails will see this alliance in their discovery terminal.</span>
                    </div>
                </div>
            )}

            {/* Squads Management */}
            <div className="pt-8 border-t border-border">
                <SubTeamList teamId={team.id} userRole={userRole} />
            </div>
        </div>
    )
}
