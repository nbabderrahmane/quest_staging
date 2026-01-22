'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Status, Size, Urgency } from '@/lib/types'

interface EditItemDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    item: Status | Size | Urgency | null
    type: 'status' | 'size' | 'urgency'
    onSave: (data: Partial<Status> | Partial<Size> | Partial<Urgency>) => Promise<void>
}

export function EditItemDialog({ open, onOpenChange, item, type, onSave }: EditItemDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<Status & Size & Urgency>>({})

    // Initialize form when dialog opens
    useEffect(() => {
        if (open && item) {
            setFormData({ ...item })
        }
    }, [open, item])

    const handleSave = async () => {
        setIsLoading(true)
        try {
            await onSave(formData)
            onOpenChange(false)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#1a1b1e] border border-white/10 text-foreground max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b border-white/10 flex-shrink-0">
                    <DialogTitle className="uppercase tracking-wider font-bold text-white text-left">
                        Edit {type === 'status' ? 'Status' : type === 'size' ? 'Size' : 'Urgency'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs uppercase text-foreground/80 font-bold block mb-1">Name</label>
                            <Input
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-black/40 border-white/20 rounded-none text-white"
                            />
                        </div>

                        {type === 'status' && (
                            <div>
                                <label className="text-xs uppercase text-foreground/80 font-bold block mb-1">Category</label>
                                <Select
                                    value={formData.category || ''}
                                    onValueChange={(val) => setFormData({ ...formData, category: val as 'backlog' | 'active' | 'done' | 'archived' })}
                                >
                                    <SelectTrigger className="bg-black/40 border-white/20 rounded-none text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="backlog">Backlog</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                        <SelectItem value="archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {type === 'size' && (
                            <div>
                                <label className="text-xs uppercase text-foreground/80 font-bold block mb-1">XP Points</label>
                                <Input
                                    type="number"
                                    value={formData.xp_points || 0}
                                    onChange={(e) => setFormData({ ...formData, xp_points: parseInt(e.target.value) || 0 })}
                                    className="bg-black/40 border-white/20 rounded-none text-white"
                                />
                            </div>
                        )}

                        {type === 'urgency' && (
                            <>
                                <div>
                                    <label className="text-xs uppercase text-foreground/80 font-bold block mb-1">Weight</label>
                                    <Input
                                        type="number"
                                        value={formData.weight || 0}
                                        onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                                        className="bg-black/40 border-white/20 rounded-none text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-foreground/80 font-bold block mb-1">Color</label>
                                    <Input
                                        value={formData.color || ''}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="bg-black/40 border-white/20 rounded-none text-white"
                                        placeholder="e.g., red, blue, #FF5500"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="text-xs uppercase text-foreground/80 font-bold block mb-1">Sort Order</label>
                            <Input
                                type="number"
                                value={formData.sort_order || 0}
                                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                                className="bg-black/40 border-white/20 rounded-none text-white"
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-6 py-4 border-t border-white/10 bg-black/20 flex-shrink-0">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-4 py-2 text-sm font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

