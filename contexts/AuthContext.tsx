'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AuthContextType, UserProfile, UserRole } from '@/lib/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAdmin = profile?.role === 'admin'

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Sign up
  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Update user role (admin only)
  const updateRole = async (userId: string, role: UserRole) => {
    try {
      if (!isAdmin) {
        throw new Error('Only admins can update user roles')
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('user_id', userId)

      if (error) {
        throw error
      }

      // Refresh profile if updating own role
      if (userId === user?.id) {
        const updatedProfile = await fetchProfile(userId)
        setProfile(updatedProfile)
      }
    } catch (error) {
      console.error('Error updating role:', error)
      throw error
    }
  }

  // Listen to auth changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile)
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const userProfile = await fetchProfile(session.user.id)
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value: AuthContextType = {
    user: user ? { id: user.id, email: user.email, profile } : null,
    profile,
    isLoading,
    isAdmin,
    signIn,
    signUp,
    signOut,
    updateRole,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
