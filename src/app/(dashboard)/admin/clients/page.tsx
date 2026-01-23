'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Plus, Search, Loader2, Building, Trash2 } from 'lucide-react'
import { Client } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { ClientDialog } from '@/components/admin/clients/client-dialog'
import { Department } from '@/lib/types'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input'

export default function AdminClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [departments, setDepartments] = useState<Department[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [newClientName, setNewClientName] = useState('') // Company Name
    const [newFirstName, setNewFirstName] = useState('')
    const [newLastName, setNewLastName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPhone, setNewPhone] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [teamId, setTeamId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [deleteClientId, setDeleteClientId] = useState<string | null>(null)
    const router = useRouter()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const selectedTeamCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('selected_team='))
                ?.split('=')[1]?.trim()

            const { data: memberships } = await supabase
                .from('team_members')
                .select('team_id')
                .eq('user_id', user.id)

            if (!memberships || memberships.length === 0) {
                setError('No active team found')
                setIsLoading(false)
                return
            }

            let activeTeamId = selectedTeamCookie
            if (!activeTeamId || !memberships.find(m => m.team_id === activeTeamId)) {
                activeTeamId = memberships[0].team_id
            }

            if (!activeTeamId) {
                setError('No team available')
                setIsLoading(false)
                return
            }

            setTeamId(activeTeamId)

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('team_id', activeTeamId)
                .order('name')

            if (error) throw error
            setClients(data || [])

            setClients(data || [])

            // Fetch Departments
            const { data: deptData, error: deptError } = await supabase
                .from('departments')
                .select('*')
                .eq('team_id', activeTeamId)
                .order('name')

            if (deptError) console.error('Failed to load departments', deptError)
            setDepartments(deptData || [])

        } catch (error: any) {
            console.error('Failed to load clients:', error)
            setError('Failed to load clients')
        } finally {
            setIsLoading(false)
        }
    }

    async function confirmDeleteClient() {
        if (!deleteClientId) return

        try {
            const supabase = createClient()
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', deleteClientId)

            if (error) throw error

            setClients(clients.filter(c => c.id !== deleteClientId))
            setSuccess('Client deleted successfully')
            router.refresh()
            setTimeout(() => setSuccess(null), 3000)
        } catch (error: any) {
            console.error('Failed to delete client:', error)
            setError('Failed to delete client')
            setTimeout(() => setError(null), 4000)
        }
        setDeleteClientId(null)
    }



    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-foreground tracking-tight">Client Management</h1>
                    <p className="text-muted-foreground">Manage your agency's clients and partners.</p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase rounded hover:bg-primary/90"
                >
                    <Plus className="h-4 w-4" />
                    Add New Client
                </button>

                <ClientDialog
                    open={isCreateOpen}
                    onOpenChange={setIsCreateOpen}
                    teamId={teamId || ''}
                    departmentOptions={departments}
                    onSuccess={() => {
                        setSuccess('Client created successfully')
                        loadData() // Reload to get new client
                        setTimeout(() => setSuccess(null), 3000)
                    }}
                />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 bg-card p-2 rounded-lg border border-border shadow-sm max-w-md">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground text-foreground"
                />
            </div>

            {/* Loading State */}
            {
                isLoading && (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )
            }

            {/* Empty State */}
            {
                !isLoading && clients.length === 0 && (
                    <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed border-border">
                        <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No clients found</h3>
                        <p className="text-muted-foreground mb-6">Get started by adding your first client.</p>
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 mx-auto bg-card border border-border text-foreground text-sm font-bold uppercase rounded hover:bg-muted"
                        >
                            <Plus className="h-4 w-4" />
                            Add Client
                        </button>
                    </div>
                )
            }

            {/* Client List */}
            {
                !isLoading && clients.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClients.map((client) => (
                            <div key={client.id} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow group p-6 relative">
                                <div
                                    onClick={() => router.push(`/admin/clients/${client.id}`)}
                                    className="absolute inset-0 z-0 cursor-pointer"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`View details for ${client.name}`}
                                />
                                <div className="flex flex-row items-center justify-between pb-2 space-y-0 mb-4 z-10 relative pointer-events-none">
                                    <div className="flex-1"></div>
                                    <button
                                        className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded ml-auto pointer-events-auto relative z-20 cursor-pointer"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation();
                                            setDeleteClientId(client.id)
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 mb-4 relative z-10">
                                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                                        <Briefcase className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground truncate">
                                            {client.first_name || client.last_name
                                                ? `${client.first_name || ''} ${client.last_name || ''}`.trim()
                                                : client.name}
                                        </h3>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground border-t border-border pt-4 pointer-events-none">
                                    {client.email && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs uppercase text-slate-500">EMAIL:</span>
                                            <span className="truncate">{client.email}</span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs uppercase text-slate-500">PHONE:</span>
                                            <span>{client.phone}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="font-mono text-xs uppercase text-slate-500">JOINED:</span>
                                        <span>{new Date(client.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredClients.length === 0 && searchQuery && (
                            <div className="col-span-full text-center py-12 text-muted-foreground">
                                No clients match your search.
                            </div>
                        )}
                    </div>
                )
            }

            <AlertDialog open={!!deleteClientId} onOpenChange={(open) => !open && setDeleteClientId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this client? Tasks assigned to this client will be unassigned.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteClient} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Error Toast */}
            {
                error && (
                    <div className="fixed bottom-4 right-4 z-50 max-w-sm p-4 bg-destructive text-destructive-foreground text-sm rounded-lg shadow-lg">
                        {error}
                    </div>
                )
            }

            {/* Success Toast */}
            {
                success && (
                    <div className="fixed bottom-4 right-4 z-50 max-w-sm p-4 bg-green-500 text-white text-sm rounded-lg shadow-lg">
                        {success}
                    </div>
                )
            }
        </div >
    )
}
