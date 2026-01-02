'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// ============================================
// MOCK DATA FOR DEMO MODE
// ============================================

export const DEMO_QUESTS = [
    { id: 'demo-quest-1', name: 'Sprint 42 - Product Launch', is_active: true, boss_skin: 'godzilla' },
    { id: 'demo-quest-2', name: 'Q1 Marketing Campaign', is_active: false, boss_skin: 'dragon' },
]

export const DEMO_STATUSES = [
    { id: 'demo-status-1', name: 'Backlog', category: 'backlog', sort_order: 1 },
    { id: 'demo-status-2', name: 'In Progress', category: 'active', sort_order: 2 },
    { id: 'demo-status-3', name: 'Review', category: 'active', sort_order: 3 },
    { id: 'demo-status-4', name: 'Done', category: 'done', sort_order: 4 },
]

export const DEMO_SIZES = [
    { id: 'demo-size-1', name: 'XS', xp_points: 1 },
    { id: 'demo-size-2', name: 'S', xp_points: 2 },
    { id: 'demo-size-3', name: 'M', xp_points: 3 },
    { id: 'demo-size-4', name: 'L', xp_points: 5 },
    { id: 'demo-size-5', name: 'XL', xp_points: 8 },
]

export const DEMO_URGENCIES = [
    { id: 'demo-urg-1', name: 'Low', color: '#22c55e' },
    { id: 'demo-urg-2', name: 'Medium', color: '#eab308' },
    { id: 'demo-urg-3', name: 'High', color: '#f97316' },
    { id: 'demo-urg-4', name: 'Critical', color: '#ef4444' },
]

export const DEMO_CREW = [
    { id: 'demo-user-1', email: 'alex@demo.com', first_name: 'Alex', last_name: 'Morgan' },
    { id: 'demo-user-2', email: 'sam@demo.com', first_name: 'Sam', last_name: 'Wilson' },
    { id: 'demo-user-3', email: 'jordan@demo.com', first_name: 'Jordan', last_name: 'Lee' },
]

export const DEMO_CLIENTS = [
    { id: 'demo-client-1', name: 'Acme Corp' },
    { id: 'demo-client-2', name: 'TechStart Inc' },
]

export const DEMO_TASKS = [
    {
        id: 'demo-task-1',
        title: 'Design new landing page',
        description: 'Create a modern, responsive landing page for the product launch',
        status_id: 'demo-status-1',
        size_id: 'demo-size-3',
        urgency_id: 'demo-urg-2',
        quest_id: 'demo-quest-1',
        assigned_to: 'demo-user-1',
        client_id: 'demo-client-1',
        size: { id: 'demo-size-3', name: 'M', xp_points: 3 },
        urgency: { id: 'demo-urg-2', name: 'Medium', color: '#eab308' },
        quest: { id: 'demo-quest-1', name: 'Sprint 42 - Product Launch' },
        client: { id: 'demo-client-1', name: 'Acme Corp' },
    },
    {
        id: 'demo-task-2',
        title: 'Implement user authentication',
        description: 'Add login/signup with OAuth providers',
        status_id: 'demo-status-2',
        size_id: 'demo-size-4',
        urgency_id: 'demo-urg-3',
        quest_id: 'demo-quest-1',
        assigned_to: 'demo-user-2',
        client_id: 'demo-client-1',
        size: { id: 'demo-size-4', name: 'L', xp_points: 5 },
        urgency: { id: 'demo-urg-3', name: 'High', color: '#f97316' },
        quest: { id: 'demo-quest-1', name: 'Sprint 42 - Product Launch' },
        client: { id: 'demo-client-1', name: 'Acme Corp' },
    },
    {
        id: 'demo-task-3',
        title: 'Fix mobile navigation bug',
        description: 'Menu doesn\'t close on mobile after navigation',
        status_id: 'demo-status-2',
        size_id: 'demo-size-1',
        urgency_id: 'demo-urg-4',
        quest_id: 'demo-quest-1',
        assigned_to: 'demo-user-3',
        client_id: null,
        size: { id: 'demo-size-1', name: 'XS', xp_points: 1 },
        urgency: { id: 'demo-urg-4', name: 'Critical', color: '#ef4444' },
        quest: { id: 'demo-quest-1', name: 'Sprint 42 - Product Launch' },
        client: null,
    },
    {
        id: 'demo-task-4',
        title: 'Write API documentation',
        description: 'Document all REST endpoints with examples',
        status_id: 'demo-status-3',
        size_id: 'demo-size-2',
        urgency_id: 'demo-urg-1',
        quest_id: 'demo-quest-1',
        assigned_to: 'demo-user-1',
        client_id: 'demo-client-2',
        size: { id: 'demo-size-2', name: 'S', xp_points: 2 },
        urgency: { id: 'demo-urg-1', name: 'Low', color: '#22c55e' },
        quest: { id: 'demo-quest-1', name: 'Sprint 42 - Product Launch' },
        client: { id: 'demo-client-2', name: 'TechStart Inc' },
    },
    {
        id: 'demo-task-5',
        title: 'Setup CI/CD pipeline',
        description: 'Configure GitHub Actions for automated testing and deployment',
        status_id: 'demo-status-4',
        size_id: 'demo-size-3',
        urgency_id: 'demo-urg-2',
        quest_id: 'demo-quest-1',
        assigned_to: 'demo-user-2',
        client_id: null,
        size: { id: 'demo-size-3', name: 'M', xp_points: 3 },
        urgency: { id: 'demo-urg-2', name: 'Medium', color: '#eab308' },
        quest: { id: 'demo-quest-1', name: 'Sprint 42 - Product Launch' },
        client: null,
    },
]

export const DEMO_BOSSES = [
    {
        id: 'demo-boss-1',
        name: 'Godzilla',
        is_system: true,
        image_healthy: '/bosses/godzilla-healthy.png',
        image_bloody: '/bosses/godzilla-bloody.png',
        image_dead: '/bosses/godzilla-dead.png',
    },
]

// ============================================
// TOUR STEPS CONFIGURATION
// ============================================

export interface TourStep {
    id: string
    target: string
    title: string
    description: string
    position: 'top' | 'bottom' | 'left' | 'right'
}

export const TOUR_STEPS: TourStep[] = [
    {
        id: 'boss-bar',
        target: '[data-tour="boss-bar"]',
        title: '🦖 Boss Bar',
        description: 'This is your team\'s enemy! Complete tasks to deal damage and defeat the boss.',
        position: 'bottom',
    },
    {
        id: 'kanban-board',
        target: '[data-tour="kanban-board"]',
        title: '📋 Kanban Board',
        description: 'Drag and drop tasks between columns to update their status. Simple!',
        position: 'top',
    },
    {
        id: 'filters',
        target: '[data-tour="filters"]',
        title: '🔍 Filters',
        description: 'Use filters to find tasks by assignee, quest, or search by keyword.',
        position: 'bottom',
    },
    {
        id: 'task-card',
        target: '[data-tour="task-card"]',
        title: '📝 Task Card',
        description: 'Click any task to view details, add comments, or edit. Try it!',
        position: 'right',
    },
    {
        id: 'quick-create',
        target: '[data-tour="quick-create"]',
        title: '⚡ Quick Add',
        description: 'Create new tasks instantly right from the board. Fast and efficient!',
        position: 'bottom',
    },
]

// ============================================
// DEMO CONTEXT
// ============================================

interface DemoContextType {
    isDemoMode: boolean
    tourActive: boolean
    currentStep: number
    tourCompleted: boolean
    startTour: () => void
    nextStep: () => void
    prevStep: () => void
    skipTour: () => void
    restartTour: () => void
    getCurrentTourStep: () => TourStep | null
}

const DemoContext = createContext<DemoContextType | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
    const [tourActive, setTourActive] = useState(true)
    const [currentStep, setCurrentStep] = useState(0)
    const [tourCompleted, setTourCompleted] = useState(false)

    const startTour = () => {
        setTourActive(true)
        setCurrentStep(0)
        setTourCompleted(false)
    }

    const nextStep = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            setTourActive(false)
            setTourCompleted(true)
        }
    }

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }

    const skipTour = () => {
        setTourActive(false)
        setTourCompleted(true)
    }

    const restartTour = () => {
        startTour()
    }

    const getCurrentTourStep = () => {
        return tourActive ? TOUR_STEPS[currentStep] : null
    }

    return (
        <DemoContext.Provider value={{
            isDemoMode: true,
            tourActive,
            currentStep,
            tourCompleted,
            startTour,
            nextStep,
            prevStep,
            skipTour,
            restartTour,
            getCurrentTourStep,
        }}>
            {children}
        </DemoContext.Provider>
    )
}

export function useDemoContext() {
    const context = useContext(DemoContext)
    if (!context) {
        // Return default non-demo values when used outside provider
        return {
            isDemoMode: false,
            tourActive: false,
            currentStep: 0,
            tourCompleted: false,
            startTour: () => { },
            nextStep: () => { },
            prevStep: () => { },
            skipTour: () => { },
            restartTour: () => { },
            getCurrentTourStep: () => null,
        }
    }
    return context
}
