'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'
import { UserProfile, UserRole } from '@/lib/types/auth'
import Link from 'next/link'

export default function AdminDashboard() {
  const { user, isAdmin, isLoading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [loadingTime, setLoadingTime] = useState(0)
  const timeoutRef = useRef<number | null>(null)
  const loadingTimerRef = useRef<number | null>(null)

  // Log user authentication state changes
  useEffect(() => {
    console.log('🔐 Admin Dashboard - Auth state changed:', {
      user: user ? { id: user.id, email: user.email } : null,
      isAdmin,
      authLoading,
      timestamp: new Date().toISOString()
    })
  }, [user, isAdmin, authLoading])

  // Fetch all users
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setUsers(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }


  useEffect(() => {
    if (isAdmin) {
      console.log('🔐 Admin access confirmed - fetching users', {
        user: user ? { id: user.id, email: user.email } : null,
        timestamp: new Date().toISOString()
      })
      fetchUsers()
    }
  }, [isAdmin, user])

  // Timeout logic: clear auth and redirect if loading takes over 10 seconds
  useEffect(() => {
    if (authLoading) {
      // Reset loading time counter
      setLoadingTime(0)
      
      // Start loading time counter
      loadingTimerRef.current = setInterval(() => {
        setLoadingTime(prev => prev + 1)
      }, 1000)
      
      // Set a 10-second timeout
      timeoutRef.current = setTimeout(async () => {
        console.warn('🔐 Auth loading timeout - clearing auth info and redirecting to login', {
          loadingTime: 10,
          user: user ? { id: user.id, email: user.email } : null,
          timestamp: new Date().toISOString()
        })
        try {
          await signOut()
          console.log('🔐 Sign out successful during timeout')
        } catch (error) {
          console.error('🔐 Error during signOut on timeout:', error)
        } finally {
          console.log('🔐 Redirecting to admin login after timeout')
          router.push('/admin/login')
        }
      }, 10000)
    } else {
      // Clear timeout and timer if loading finishes
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
    }

    // Cleanup timeout and timer on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current)
        loadingTimerRef.current = null
      }
    }
  }, [authLoading, signOut, router])

  // Show loading state while auth is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading authentication...</p>
          <p className="mt-1 text-sm text-gray-500">
            {loadingTime}s {loadingTime >= 5 ? '(this is taking longer than usual)' : ''}
          </p>
          {loadingTime >= 8 && (
            <p className="mt-2 text-sm text-amber-600 font-medium">
              ⚠️ Timeout in {10 - loadingTime}s - will redirect to login
            </p>
          )}
        </div>
      </div>
    )
  }

  // Let middleware handle redirects for non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
            <Link
              href="/admin/create-user"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create New User
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading users...</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((userProfile) => (
                    <tr key={userProfile.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {userProfile.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          userProfile.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {userProfile.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userProfile.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No users found</p>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  )
}
