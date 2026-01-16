'use client'

import { Team } from '@/lib/types'
import { useState } from 'react'
import Image from 'next/image'
import { Settings, Upload, Loader2, Camera } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { uploadTeamLogo } from '@/app/teams/actions'
import { useRouter } from 'next/navigation'

interface BrandSettingsProps {
    team: Team
    userRole: string
}

export function BrandSettings({ team, userRole }: BrandSettingsProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [logoKey, setLogoKey] = useState(0)
    const router = useRouter()

    const canEdit = ['owner', 'admin'].includes(userRole)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            if (file.size > 50 * 1024) { // 50KB limit
                setError('File too large (Max 50KB).')
                return
            }
            setSelectedFile(file)
            setPreviewUrl(URL.createObjectURL(file))
            setError(null)
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return
        setIsUploading(true)
        setError(null)

        const formData = new FormData()
        formData.append('teamId', team.id)
        formData.append('file', selectedFile)

        const result = await uploadTeamLogo(formData)

        setIsUploading(false)
        if (result.success) {
            setIsModalOpen(false)
            setPreviewUrl(null)
            setSelectedFile(null)
            setLogoKey(Date.now()) // Force refresh
            router.refresh()
        } else {
            setError(result.error?.message || 'Upload failed')
        }
    }

    return (
        <div className="w-full mt-2">
            {/* Team Brand Area */}
            <div
                className="relative group cursor-default w-full flex justify-center"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {team.logo_url ? (
                    <div className="relative w-full h-20">
                        <Image
                            key={logoKey} // Key change forces re-render
                            src={`${team.logo_url}?t=${logoKey}`}
                            alt={team.name}
                            fill
                            className="object-contain"
                        />
                        {canEdit && isHovered && (
                            <div
                                onClick={() => setIsModalOpen(true)}
                                className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer transition-opacity rounded-lg"
                            >
                                <Camera className="h-6 w-6 text-white/90 drop-shadow-md" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => canEdit && setIsModalOpen(true)}
                        className={`
                            relative w-full p-4 border border-sidebar-border rounded-lg bg-sidebar-accent/50 text-center flex items-center justify-center aspect-[3/1]
                            ${canEdit ? 'cursor-pointer hover:bg-sidebar-accent hover:border-sidebar-foreground/20' : ''}
                        `}
                    >
                        <h2 className="text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60 break-words leading-tight">
                            {canEdit ? 'Upload Team Logo' : team.name}
                        </h2>
                        {canEdit && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Settings className="h-3 w-3 text-sidebar-foreground/50" />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-white border text-slate-900 border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="uppercase tracking-wider font-bold">Update Alliance Logo</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                                {previewUrl ? (
                                    <div className="relative h-28 w-28">
                                        <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                                        <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span></p>
                                        <p className="text-xs text-slate-500">WEBP, PNG, JPG (MAX. 50KB)</p>
                                    </div>
                                )}
                                <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} />
                            </label>
                        </div>
                        {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
                    </div>

                    <DialogFooter>
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-xs font-bold uppercase text-slate-500 hover:text-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isUploading && <Loader2 className="h-3 w-3 animate-spin" />}
                            {isUploading ? 'Uploading...' : 'Save Logo'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
