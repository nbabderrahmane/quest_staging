import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Public routes that don't need auth check at all
const PUBLIC_ROUTES = ['/login', '/portal/login', '/auth/callback', '/auth/signout']

export async function updateSession(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Fast path: Skip auth check entirely for public routes
    if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Middleware Error: Missing Supabase Environment Variables')
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 1. Portal Route Protection
    if (path.startsWith('/portal')) {
        // If not logged in, redirect to Portal Login
        if (!user) {
            const url = request.nextUrl.clone()
            url.pathname = '/portal/login'
            return NextResponse.redirect(url)
        }

        // If logged in but at root /portal, go to dashboard
        if (path === '/portal') {
            const url = request.nextUrl.clone()
            url.pathname = '/portal/dashboard'
            return NextResponse.redirect(url)
        }
    }
    // 2. Admin/General Route Protection
    else if (
        !user &&
        !path.startsWith('/api') &&
        path !== '/' // Allow landing page if exists? Or assume root is admin? assuming root is protected for now.
    ) {
        // no user, redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
