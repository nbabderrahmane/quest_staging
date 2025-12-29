import { createClient } from '@/lib/supabase/server'
import { getDepartment, getDepartmentTasks, updateTaskStatus } from '../actions'
import { TaskKanban } from '@/components/dashboard/task-kanban'
import { Users } from 'lucide-react'
import { getRoleContext } from '@/lib/role-service'
import { redirect } from 'next/navigation'

export default async function DepartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // 1. Fetch Department first (ID only)
    const department = await getDepartment(id)
    if (!department) return <div className="p-8 text-center text-slate-500">Department not found or access denied.</div>

    // 2. Use the department's team_id as source of truth
    const teamId = department.team_id

    // 3. Check Permissions
    const ctx = await getRoleContext(teamId)
    const canManage = ['owner', 'admin', 'manager'].includes(ctx?.role || '')

    // 4. Fetch Tasks and Board Data
    const tasks = await getDepartmentTasks(id, teamId)

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
        <div className="min-h-screen bg-slate-50 -m-8 p-8 space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                <div className="h-12 w-12 bg-slate-100 rounded flex items-center justify-center text-slate-500">
                    <Users className="h-6 w-6" />
                </div>
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{department.name}</h1>
                    <p className="text-slate-500 font-mono text-sm mt-1">Department Overview</p>
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
