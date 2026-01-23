'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { createNewClient } from '@/app/(dashboard)/admin/clients/actions'
import { useRouter } from 'next/navigation'
import { Department } from '@/lib/types'

interface ClientDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    teamId: string
    onSuccess: () => void
    departmentOptions: Department[]
}

export function ClientDialog({ open, onOpenChange, teamId, onSuccess, departmentOptions }: ClientDialogProps) {
    const [newClientName, setNewClientName] = useState('') // Company Name
    const [newFirstName, setNewFirstName] = useState('')
    const [newLastName, setNewLastName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPhone, setNewPhone] = useState('')
    const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        // Validation: Must have either Company OR (First + Last)
        const hasName = newFirstName.trim() && newLastName.trim()
        const hasCompany = newClientName.trim()

        if (!hasName && !hasCompany) {
            setError('Please provide either a Contact Name or Company Name')
            return
        }

        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('teamId', teamId)
            formData.append('companyName', newClientName)
            formData.append('firstName', newFirstName)
            formData.append('lastName', newLastName)
            formData.append('email', newEmail)
            formData.append('phone', newPhone)
            // Handle multiple departments
            selectedDeptIds.forEach(id => formData.append('departmentIds', id))

            const result = await createNewClient(formData)

            if (result.error) {
                setError(result.error)
            } else {
                setNewClientName('')
                setNewFirstName('')
                setNewLastName('')
                setNewEmail('')
                setNewPhone('')
                setSelectedDeptIds([])
                onSuccess()
                onOpenChange(false)
            }
        } catch (err: any) {
            setError(err.message || 'Failed to create client')
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleDept = (deptId: string) => {
        setSelectedDeptIds(prev =>
            prev.includes(deptId)
                ? prev.filter(id => id !== deptId)
                : [...prev, deptId]
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card border border-border sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Add New Client</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="company" className="text-sm font-medium text-foreground">
                            Company Name
                        </label>
                        <Input
                            id="company"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Acme Corp (Optional)"
                            className="bg-background border-input text-foreground"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <label htmlFor="firstName" className="text-sm font-medium text-foreground">
                                First Name *
                            </label>
                            <Input
                                id="firstName"
                                value={newFirstName}
                                onChange={(e) => setNewFirstName(e.target.value)}
                                placeholder="John"
                                className="bg-background border-input text-foreground"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="lastName" className="text-sm font-medium text-foreground">
                                Last Name *
                            </label>
                            <Input
                                id="lastName"
                                value={newLastName}
                                onChange={(e) => setNewLastName(e.target.value)}
                                placeholder="Doe"
                                className="bg-background border-input text-foreground"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                            Email Address
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="john@acme.com"
                            className="bg-background border-input text-foreground"
                        />
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="phone" className="text-sm font-medium text-foreground">
                            Phone Number
                        </label>
                        <Input
                            id="phone"
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="bg-background border-input text-foreground"
                        />
                    </div>

                    {/* Departments Selection */}
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-foreground">
                            Assign Departments
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {departmentOptions.map(dept => (
                                <button
                                    key={dept.id}
                                    type="button"
                                    onClick={() => toggleDept(dept.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${selectedDeptIds.includes(dept.id)
                                        ? 'bg-primary/20 text-primary border-primary'
                                        : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                                        }`}
                                >
                                    {dept.name}
                                </button>
                            ))}
                        </div>
                        {selectedDeptIds.length === 0 && (
                            <p className="text-[10px] text-muted-foreground">Select at least one department implies generic access.</p>
                        )}
                    </div>

                    {error && (
                        <div className="p-2 text-xs text-destructive bg-destructive/10 rounded">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="px-4 py-2 text-sm font-bold uppercase text-muted-foreground hover:text-foreground"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!teamId || isSubmitting}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Client
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
