import { OrgProfile } from '@/components/dashboard/org-profile'
import { getRoleContext } from '@/lib/role-service'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function OrganizationProfilePage() {
    const ctx = await getRoleContext()

    if (!ctx) {
        redirect('/login')
    }

    const supabase = await createClient()
    const { data: team } = await supabase.from('teams').select('*').eq('id', ctx.teamId).single()

    if (!team) {
        return <div>Organization not found.</div>
    }

    return (
        <div className="min-h-screen bg-background -m-8 p-8">
            <OrgProfile team={team} userRole={ctx.role || 'member'} />
        </div>
    )
}
