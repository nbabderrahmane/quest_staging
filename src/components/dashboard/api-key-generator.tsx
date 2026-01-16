'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Trash, Key, Copy, Check } from 'lucide-react'

interface ApiKeyRecord {
    id: string
    label: string
    created_at: string
    last_used_at: string | null
}

export function ApiKeyGenerator({ existingKeys }: { existingKeys: ApiKeyRecord[] }) {
    const [keys, setKeys] = useState<ApiKeyRecord[]>(existingKeys)
    const [label, setLabel] = useState('')
    const [newKey, setNewKey] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [copied, setCopied] = useState(false)

    async function handleCreate() {
        if (!label.trim()) return
        setIsCreating(true)

        try {
            // Generate Key Client Side (or Server Side via Action)
            // Secure flow: 
            // 1. Action generates Key + Hash. 
            // 2. Stores Hash in DB. 
            // 3. Returns Raw Key to Client ONCE.

            const response = await fetch('/api/keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label })
            })

            const data = await response.json()
            if (data.success) {
                setNewKey(data.key)
                setKeys([...keys, data.record])
                setLabel('')
            } else {
                alert('Failed to generate key: ' + data.error)
            }
        } catch (e: unknown) {
            console.error(e)
            alert('Error creating key')
        } finally {
            setIsCreating(false)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This action cannot be undone.')) return

        try {
            const response = await fetch(`/api/keys?id=${id}`, { method: 'DELETE' })
            if (response.ok) {
                setKeys(keys.filter(k => k.id !== id))
            }
        } catch (e) {
            console.error(e)
        }
    }

    function copyToClipboard() {
        if (newKey) {
            navigator.clipboard.writeText(newKey)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-4 items-end">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <label htmlFor="label" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        New Key Label
                    </label>
                    <Input
                        id="label"
                        placeholder="e.g. N8N Automation"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreate} disabled={!label || isCreating}>
                    {isCreating ? 'Generating...' : 'Generate New Key'}
                </Button>
            </div>

            {newKey && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg space-y-2">
                    <h4 className="font-bold text-green-800 flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        New API Key Generated
                    </h4>
                    <p className="text-sm text-green-700">
                        Copy this key now. You will generally NOT be able to see it again!
                    </p>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 p-2 bg-white border border-green-200 rounded font-mono text-sm break-all">
                            {newKey}
                        </code>
                        <Button variant="outline" size="icon" onClick={copyToClipboard}>
                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Label</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Last Used</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {keys.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No API keys generated yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            keys.map(key => (
                                <TableRow key={key.id}>
                                    <TableCell className="font-medium">{key.label}</TableCell>
                                    <TableCell>{new Date(key.created_at).toLocaleDateString('en-GB')}</TableCell>
                                    <TableCell>
                                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString('en-GB') : 'Never'}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDelete(key.id)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
