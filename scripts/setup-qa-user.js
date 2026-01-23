const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function setup() {
    console.log('--- QA USER SETUP ---')

    const email = 'qa-tester@example.com'
    const password = 'Password123!'

    // 1. Create or get user
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    let user = listData.users.find(u => u.email === email)

    if (!user) {
        console.log('Creating new QA user...')
        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        })
        if (createError) throw createError
        user = userData.user
    } else {
        console.log('QA user already exists, updating password...')
        const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
            password
        })
        if (updateError) throw updateError
    }

    console.log(`User ID: ${user.id}`)

    // 2. Ensure Team exists
    const { data: teams, error: teamsError } = await supabase.from('teams').select('id').limit(1)
    if (teamsError) throw teamsError

    let teamId = teams?.[0]?.id

    if (!teamId) {
        console.log('No teams found, creating default team...')
        const { data: newTeam, error: createTeamError } = await supabase.from('teams').insert({
            name: 'QA Testing Team'
        }).select().single()
        if (createTeamError) throw createTeamError
        teamId = newTeam.id
    }

    console.log(`Team ID: ${teamId}`)

    // 3. Ensure User is in Team
    const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .maybeSingle()

    if (!membership) {
        console.log('Adding user to team...')
        const { error: addMemberError } = await supabase.from('team_members').insert({
            user_id: user.id,
            team_id: teamId,
            role: 'owner'
        })
        if (addMemberError) throw addMemberError
    } else {
        console.log('User already in team.')
    }

    // 4. Ensure Statuses exist (needed for Quest Board)
    const { data: statuses } = await supabase.from('statuses').select('id').eq('team_id', teamId)
    if (!statuses || statuses.length === 0) {
        console.log('Initializing team configuration...')
        const { error: rpcError } = await supabase.rpc('initialize_team_defaults', { t_id: teamId })
        if (rpcError) {
            console.log('RPC failed, manual insert...')
            await supabase.from('statuses').insert([
                { team_id: teamId, name: 'Backlog', category: 'backlog', sort_order: 1 },
                { team_id: teamId, name: 'Active', category: 'active', sort_order: 2 },
                { team_id: teamId, name: 'Done', category: 'done', sort_order: 3 }
            ])
        }
    }

    // 5. Create a test quest
    const { data: activeQuests } = await supabase.from('quests')
        .select('id')
        .eq('team_id', teamId)
        .eq('is_active', true)
        .eq('is_archived', false)

    if (!activeQuests || activeQuests.length === 0) {
        console.log('Creating test quest...')
        await supabase.from('quests').insert({
            team_id: teamId,
            name: 'Regression Sprint',
            is_active: true,
            start_date: new Date().toISOString()
        })
    }

    console.log('--- SETUP COMPLETE ---')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
}

setup().catch(err => {
    console.error('Setup failed:', err)
    process.exit(1)
})
