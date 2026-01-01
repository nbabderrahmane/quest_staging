import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Client Portal | Ship Quest',
    description: 'Manage your tickets and requests.',
}

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={`min-h-screen bg-background font-sans antialiased ${inter.className}`}>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>
        </div>
    )
}
