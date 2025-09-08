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

  // Fetch user profile with retry mechanism
  const fetchProfile = async (userId: string, retryCount = 0): Promise<UserProfile | null> => {
    const maxRetries = 2
    
    try {
      console.log(`AuthContext: fetchProfile called for user: ${userId} (attempt ${retryCount + 1}/${maxRetries + 1})`)
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.error('AuthContext: Supabase error fetching profile:', error)
        
        // Retry on certain errors if we haven't exceeded max retries
        if (retryCount < maxRetries && (
          error.message.includes('timeout') || 
          error.message.includes('network') ||
          error.message.includes('connection') ||
          error.code === 'PGRST116' || // Supabase timeout
          error.code === '08006' // Connection failure
        )) {
          console.log(`AuthContext: Retrying profile fetch due to error (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return fetchProfile(userId, retryCount + 1)
        }
        
        return null
      }

      if (data) {
        console.log('AuthContext: Profile fetched successfully:', data)
        return data as UserProfile
      }

      return null
    } catch (error: any) {
      console.error('AuthContext: Error in fetchProfile:', error)
      
      // Retry on network errors if we haven't exceeded max retries
      if (retryCount < maxRetries && (
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.name === 'TypeError' // Often network-related
      )) {
        console.log(`AuthContext: Retrying profile fetch after error (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return fetchProfile(userId, retryCount + 1)
      }
      
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
        console.log('AuthContext: Initial session result:', session ? 'session exists' : 'no session')
        
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
              
              // If profile fetch failed, still allow the user to continue without profile
              if (!profile) {
                console.warn('AuthContext: Continuing without profile data - user may have limited functionality')
              }
            }
          } catch (profileError) {
            console.error('AuthContext: Error fetching profile:', profileError)
            if (isMounted) {
              setProfile(null)
              console.warn('AuthContext: Continuing without profile data due to error')
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
            
            // If profile fetch failed, still allow the user to continue
            if (!userProfile) {
              console.warn('AuthContext: Auth state changed but profile fetch failed - user may have limited functionality')
            }
          }
        } catch (error) {
          console.error('AuthContext: Error fetching profile on auth change:', error)
          if (isMounted) {
            setProfile(null)
            console.warn('AuthContext: Continuing without profile data due to error on auth change')
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
