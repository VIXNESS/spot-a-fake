'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AuthContextType, UserProfile, UserRole } from '@/lib/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAdmin = profile?.role === 'admin'

  // Fetch user profile
  const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('AuthContext: fetchProfile called for user:', userId)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      })
      
      const fetchPromise = supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise])

      if (error) {
        console.error('AuthContext: Error fetching profile:', error)
        return null
      }

      console.log('AuthContext: Profile fetched successfully:', data)
      return data as UserProfile
    } catch (error) {
      console.error('AuthContext: Error in fetchProfile:', error)
      return null
    }
  }

  // Sign in
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      // Wait for the auth state to be updated
      if (data.user && data.session?.access_token) {
        setUser(data.user)
        setToken(data.session.access_token)
        
        // Fetch and set the user profile
        const userProfile = await fetchProfile(data.user.id)
        setProfile(userProfile)
        
        // Give a small delay to ensure the auth state is fully propagated
        await new Promise(resolve => setTimeout(resolve, 200))
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
      setToken(null)
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
    let isMounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthContext: Error getting session:', error)
        }
        
        if (!isMounted) return
        
        console.log('AuthContext: Initial session result:', session ? 'session exists' : 'no session')
        
        setUser(session?.user ?? null)
        setToken(session?.access_token ?? null)
        
        if (session?.user) {
          console.log('AuthContext: Fetching profile for user:', session.user.id)
          try {
            const profile = await fetchProfile(session.user.id)
            if (isMounted) {
              setProfile(profile)
              console.log('AuthContext: Profile fetched:', profile ? 'success' : 'failed')
            }
          } catch (profileError) {
            console.error('AuthContext: Error fetching profile:', profileError)
            if (isMounted) {
              setProfile(null)
            }
          }
        } else {
          if (isMounted) {
            setProfile(null)
          }
        }
        
        if (isMounted) {
          setIsLoading(false)
          console.log('AuthContext: Initial auth setup complete')
        }
      } catch (error) {
        console.error('AuthContext: Error in initial auth setup:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state change:', event, session?.user?.id)
      
      if (!isMounted) return
      
      setUser(session?.user ?? null)
      setToken(session?.access_token ?? null)
      
      if (session?.user) {
        try {
          const userProfile = await fetchProfile(session.user.id)
          if (isMounted) {
            setProfile(userProfile)
          }
        } catch (error) {
          console.error('AuthContext: Error fetching profile on auth change:', error)
          if (isMounted) {
            setProfile(null)
          }
        }
      } else {
        if (isMounted) {
          setProfile(null)
        }
      }
      
      if (isMounted) {
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextType = {
    user: user ? { id: user.id, email: user.email, profile } : null,
    profile,
    token,
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
