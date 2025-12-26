export type Role = 'owner' | 'admin' | 'manager' | 'member' | 'analyst'

export interface Team {
    id: string
    name: string
    created_at: string
}

export interface TeamMember {
    id: string
    team_id: string
    user_id: string
    role: Role
    joined_at: string
}

export interface Status {
    id: string
    team_id: string
    name: string
    category: 'backlog' | 'active' | 'done' | 'archived'
    sort_order: number
    is_active: boolean
}

export interface Size {
    id: string
    team_id: string
    name: string
    xp_points: number
    sort_order: number
    is_active: boolean
}

export interface Urgency {
    id: string
    team_id: string
    name: string
    weight: number
    color: string
    is_active: boolean
}

export interface QuestStatus {
    id: string
    team_id: string
    name: string
    category: 'backlog' | 'active' | 'done'
    sort_order: number
}

export interface Quest {
    id: string
    team_id: string
    name: string
    description?: string | null
    is_active: boolean
    status_id?: string | null
    start_date?: string | null
    end_date?: string | null
    created_at: string
    // Expanded Relations
    status?: QuestStatus
}

export interface Task {
    id: string
    team_id: string
    quest_id: string
    title: string
    description?: string | null
    status_id: string
    size_id: string
    urgency_id: string
    assignee_id?: string | null
    xp_points: number
    created_at: string
    updated_at: string
    // Expanded relations for UI
    status?: Status
    size?: Size
    urgency?: Urgency
}
