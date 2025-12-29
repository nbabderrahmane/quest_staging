'use client'

import { useState } from 'react'
import { LogOut, User, Phone, Lock, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { updateUserProfile } from '@/app/user-actions'

interface UserNavProps {
    user: {
        email?: string
        phone?: string
    }
}

export function UserNav({ user }: UserNavProps) {
    const [open, setOpen] = useState(false)
    const [phone, setPhone] = useState(user.phone || '')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const result = await updateUserProfile({
            phone: phone || undefined,
            password: password || undefined
        })

        setLoading(false)
        if (result.success) {
            setMessage({ type: 'success', text: 'Profile updated successfully.' })
            setPassword('') // Clear password field
            setTimeout(() => setOpen(false), 1500)
        } else {
            setMessage({ type: 'error', text: result.error || 'Failed to update profile.' })
        }
    }

    return (
        <>
            <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setOpen(true)}
                        className="text-xs text-sidebar-foreground/70 truncate max-w-[120px] hover:text-primary transition-colors text-left"
                    >
                        {user.email}
                    </button>
                    <form action="/auth/signout" method="post">
                        <button className="text-[10px] uppercase font-bold text-destructive hover:text-destructive/80 transition-colors">Abort</button>
                    </form>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="bg-white border-slate-200 text-slate-900 shadow-xl max-w-md">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold text-slate-900 flex items-center gap-2">
                            <User className="h-5 w-5 text-blue-600" />
                            Operative Profile
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleUpdate} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                <Phone className="h-3 w-3" /> Secure Comms (Phone)
                            </label>
                            <Input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter phone number"
                                className="bg-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-slate-500 flex items-center gap-2">
                                <Lock className="h-3 w-3" /> Update Cipher (Password)
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New password (leave empty to keep current)"
                                className="bg-white"
                            />
                            <p className="text-[10px] text-slate-400">Min. 6 characters. Leave empty if not changing.</p>
                        </div>

                        {message && (
                            <div className={`p-3 rounded text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {loading ? 'Updating...' : 'Update Profile'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    )
}
