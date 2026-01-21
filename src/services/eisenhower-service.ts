import { Task, Size, Urgency } from '@/lib/types'

export interface EisenhowerThresholds {
    importance: number
    urgency: number
}

export const DEFAULT_THRESHOLDS: EisenhowerThresholds = {
    importance: 5,
    urgency: 70
}

export class EisenhowerService {
    /**
     * Calculates the Deadline Urgency Score based on buckets.
     */
    static getDeadlineUrgencyScore(deadlineAt: string | null | undefined): number {
        if (!deadlineAt) return 0

        const now = new Date()
        const deadline = new Date(deadlineAt)
        const diffMs = deadline.getTime() - now.getTime()
        const diffHours = diffMs / (1000 * 60 * 60)
        const diffDays = Math.ceil(diffHours / 24)

        if (diffHours < 24) return 100
        if (diffDays <= 3) return 80
        if (diffDays <= 7) return 60
        if (diffDays <= 14) return 40
        return 20
    }

    /**
     * Enriches a list of tasks with Eisenhower scores and quadrants.
     */
    static enrichTasks(tasks: Task[], thresholds: EisenhowerThresholds = DEFAULT_THRESHOLDS): Task[] {
        return tasks.map(task => {
            const importanceScore = task.size?.xp_points || 0
            const declaredUrgencyScore = task.urgency?.weight || 0
            const deadlineUrgencyScore = this.getDeadlineUrgencyScore(task.deadline_at)

            const urgencyScore = Math.max(declaredUrgencyScore, deadlineUrgencyScore)

            // Determine Quadrant
            let quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4'
            const isImportant = importanceScore >= thresholds.importance
            const isUrgent = urgencyScore >= thresholds.urgency

            if (isImportant && isUrgent) quadrant = 'Q1'
            else if (isImportant && !isUrgent) quadrant = 'Q2'
            else if (!isImportant && isUrgent) quadrant = 'Q3'
            else quadrant = 'Q4'

            // Priority Score
            const quadrantWeight = { Q1: 1000, Q2: 700, Q3: 400, Q4: 0 }[quadrant]
            const priorityScore = quadrantWeight + urgencyScore + (importanceScore * 10)

            return {
                ...task,
                importance_score: importanceScore,
                urgency_score: urgencyScore,
                quadrant,
                priority_score: priorityScore
            }
        })
    }

    /**
     * Sorts enriched tasks by Priority Score and tiebreakers.
     */
    static sortTasks(tasks: Task[]): Task[] {
        return [...tasks].sort((a, b) => {
            // 1. Priority Score desc
            const scoreDiff = (b.priority_score || 0) - (a.priority_score || 0)
            if (scoreDiff !== 0) return scoreDiff

            // 2. Deadline asc (closest first, nulls at bottom)
            if (a.deadline_at && b.deadline_at) {
                const dateA = new Date(a.deadline_at).getTime()
                const dateB = new Date(b.deadline_at).getTime()
                if (dateA !== dateB) return dateA - dateB
            } else if (a.deadline_at) return -1
            else if (b.deadline_at) return 1

            // 3. Updated_at desc
            const updateA = new Date(a.updated_at).getTime()
            const updateB = new Date(b.updated_at).getTime()
            return updateB - updateA
        })
    }
}
