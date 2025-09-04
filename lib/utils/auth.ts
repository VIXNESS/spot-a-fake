import { createClient } from '@/lib/supabase/server'
import { UserProfile } from '@/lib/types/auth'
import { redirect } from 'next/navigation'

export async function getUser() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data as UserProfile
}

export async function requireAuth(redirectTo = '/admin/login') {
  const user = await getUser()
  
  if (!user) {
    redirect(redirectTo)
  }
  
  return user
}

export async function requireAdmin(redirectTo = '/unauthorized') {
  const user = await requireAuth()
  const profile = await getUserProfile(user.id)
  
  if (!profile || profile.role !== 'admin') {
    redirect(redirectTo)
  }
  
  return { user, profile }
}

export async function isAdmin(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  return profile?.role === 'admin' || false
}
