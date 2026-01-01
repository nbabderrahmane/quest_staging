import { createClient } from '@/lib/supabase/server'
import { getProject, getProjectTasks, updateTaskStatus } from '../actions'
import { TaskKanban } from '@/components/dashboard/task-kanban'
import { Briefcase } from 'lucide-react'
import { getRoleContext } from '@/lib/role-service'
import { redirect } from 'next/navigation'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 1. Fetch Project first (ID only) - Verify existence and get context
    const project = await getProject(id)
    if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found or access denied.</div>

    // 2. Use the project's team_id as the source of truth
    const teamId = project.team_id

    // 3. Helper to check management permissions
    const ctx = await getRoleContext(teamId)
    const canManage = ['owner', 'admin', 'manager'].includes(ctx?.role || '')

    // 4. Fetch Tasks and Board Data using the correct teamId
    const tasks = await getProjectTasks(id, teamId)

    const [statusRes, sizeRes, urgencyRes, crewRes] = await Promise.all([
        supabase.from('statuses').select('*').eq('team_id', teamId).order('sort_order'),
        supabase.from('sizes').select('*').eq('team_id', teamId).order('xp_points'),
        supabase.from('urgencies').select('*').eq('team_id', teamId).order('weight', { ascending: false }),
        supabase.from('team_members').select('user_id, profiles!inner(id, email, first_name, last_name)').eq('team_id', teamId)
    ])

    const statuses = statusRes.data || []
    const sizes = sizeRes.data || []
    const urgencies = urgencyRes.data || []
    const crew = crewRes.data?.map((m: any) => ({
        id: m.profiles.id,
        email: m.profiles.email,
        first_name: m.profiles.first_name,
        last_name: m.profiles.last_name
    })) || []

    return (
        <div className="min-h-screen bg-background -m-8 p-8 space-y-6">
            <div className="flex items-center gap-4 border-b border-border pb-4">
                <div className="h-12 w-12 bg-muted rounded flex items-center justify-center text-muted-foreground">
                    <Briefcase className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">{project.name}</h1>
                    <p className="text-muted-foreground font-mono text-sm mt-1">{project.description || 'Project Details & Tasks'}</p>
                </div>
            </div>

            <TaskKanban
                tasks={tasks as any}
                statuses={statuses}
                sizes={sizes}
                urgencies={urgencies}
                crew={crew}
                teamId={teamId}
                canEdit={canManage}
                userId={user.id}
                onTaskUpdate={updateTaskStatus.bind(null, teamId)}
            />
        </div>
    )
}
