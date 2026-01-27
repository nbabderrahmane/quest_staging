'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { exportAnalyticsToCSV } from './actions'
import { FileText, Download, Calendar, Activity } from 'lucide-react'

export default function ReportingPage() {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [teamId, setTeamId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [reportType, setReportType] = useState<'range' | 'sprint'>('range')
    const [quests, setQuests] = useState<{ id: string; name: string }[]>([])
    const [selectedQuest, setSelectedQuest] = useState<string>('')

    useEffect(() => {
        // Init dates to current month
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
        const today = now.toISOString().split('T')[0]
        setStartDate(firstDay)
        setEndDate(today)

        const selectedTeamCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('selected_team='))
            ?.split('=')[1]?.trim()

        if (selectedTeamCookie) {
            setTeamId(selectedTeamCookie)
            import('./actions').then(mod => {
                mod.getQuestsForReporting(selectedTeamCookie).then(data => {
                    setQuests(data)
                    // If quests exist, select first one by default? No, let user choose.
                    if (data.length > 0) setSelectedQuest(data[0].id)
                })
            })
        }
    }, [])


    const handleExport = async () => {
        if (!teamId) return
        if (reportType === 'range' && (!startDate || !endDate)) return
        if (reportType === 'sprint' && !selectedQuest) return

        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            // If Sprint mode, use wide date range to catch all tasks in that sprint
            const start = reportType === 'sprint' ? '2000-01-01' : startDate
            const end = reportType === 'sprint' ? '2100-01-01' : endDate
            const questFilter = reportType === 'sprint' ? selectedQuest : undefined

            const result = await exportAnalyticsToCSV(teamId, start, end, questFilter)

            if (!result.success) {
                setError(result.error.message)
            } else if (result.success && result.data) {
                // Trigger Download
                const blob = new Blob([result.data.csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', result.data.filename || 'report.csv')
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)

                setSuccess(`Report generated successfully! (${result.data.filename})`)
            }
        } catch (err) {
            setError('An unexpected system failure occurred.')
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                    <FileText className="h-8 w-8 text-primary" />
                    Mission Reporting
                </h1>
                <p className="text-muted-foreground font-mono text-sm mt-1">Export mission data for external analysis.</p>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm p-8 max-w-2xl">
                <div className="flex items-center gap-2 mb-6 text-foreground font-bold uppercase tracking-wider text-sm border-b border-border pb-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Report Configuration
                </div>

                {/* Report Type Selector */}
                <div className="flex bg-muted/50 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => setReportType('range')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${reportType === 'range' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        Date Range
                    </button>
                    <button
                        onClick={() => setReportType('sprint')}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${reportType === 'sprint' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        By Sprint
                    </button>
                </div>

                {reportType === 'range' ? (
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-xs uppercase font-bold text-muted-foreground mb-2">Start Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold text-muted-foreground mb-2">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8">
                        <label className="block text-xs uppercase font-bold text-muted-foreground mb-2">Select Sprint / Quest</label>
                        <select
                            value={selectedQuest}
                            onChange={(e) => setSelectedQuest(e.target.value)}
                            className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                        >
                            {quests.map(q => (
                                <option key={q.id} value={q.id}>{q.name}</option>
                            ))}
                            {quests.length === 0 && <option value="">No quests found</option>}
                        </select>
                    </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground italic">
                        {reportType === 'range' ? "Exports all 'Done' tasks within range." : "Exports all tasks in selected sprint."}
                    </div>
                    <button
                        onClick={handleExport}
                        disabled={isLoading || !teamId || (reportType === 'range' && (!startDate || !endDate)) || (reportType === 'sprint' && !selectedQuest)}
                        className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-wider rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform active:scale-95"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Generating...</span>
                        ) : (
                            <>
                                <Download className="h-4 w-4" />
                                Download CSV Report
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg flex items-center gap-2">
                        <span className="font-bold">ERROR:</span> {error}
                    </div>
                )}
                {success && (
                    <div className="mt-6 p-4 bg-green-50 border border-green-100 text-green-600 text-sm rounded-lg flex items-center gap-2">
                        <span className="font-bold">SUCCESS:</span> {success}
                    </div>
                )}
            </div>
        </div>
    )
}
