import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })
import { createClient } from '@/lib/supabase/server'
import { NotificationProvider } from '@/components/notification-provider'

export const metadata: Metadata = {
    title: 'Client Portal | Ship Quest',
    description: 'Manage your tickets and requests.',
}

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <div className={`min-h-screen bg-background font-sans antialiased ${inter.className}`}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {user ? (
                    <NotificationProvider userId={user.id}>
                        {children}
                    </NotificationProvider>
                ) : children}
            </ThemeProvider>
        </div>
    )
}
