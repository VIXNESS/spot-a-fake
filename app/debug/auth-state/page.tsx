'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase/client'

export default function AuthStateDebugPage() {
  const { user, profile, token, isLoading, isAdmin } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [authEvents, setAuthEvents] = useState<string[]>([])
  const [rawProfile, setRawProfile] = useState<any>(null)

  const addEvent = (event: string) => {
    setAuthEvents(prev => [...prev, `${new Date().toLocaleTimeString()}: ${event}`])
  }

  useEffect(() => {
    addEvent('Component mounted')
    
    // Get session directly
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      addEvent(`Direct getSession - session: ${session ? 'exists' : 'null'}, error: ${error ? error.message : 'none'}`)
      setSessionInfo(session)
    })

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      addEvent(`Auth state change: ${event}, user: ${session?.user?.id || 'null'}`)
    })

    return () => {
      subscription.unsubscribe()
      addEvent('Component unmounted')
    }
  }, [])

  useEffect(() => {
    if (user) {
      addEvent(`AuthContext user updated: ${user.id}`)
      
      // Fetch profile directly to see if there's an issue
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(({ data, error }) => {
          addEvent(`Direct profile fetch - data: ${data ? 'exists' : 'null'}, error: ${error ? error.message : 'none'}`)
          setRawProfile(data)
        })
    }
  }, [user])

  useEffect(() => {
    if (profile) {
      addEvent(`AuthContext profile updated: ${profile.role}`)
    }
  }, [profile])

  useEffect(() => {
    addEvent(`AuthContext isLoading: ${isLoading}`)
  }, [isLoading])

  const refreshSession = async () => {
    addEvent('Manual session refresh triggered')
    try {
      const { data, error } = await supabase.auth.refreshSession()
      addEvent(`Refresh result - session: ${data.session ? 'exists' : 'null'}, error: ${error ? error.message : 'none'}`)
    } catch (err) {
      addEvent(`Refresh error: ${err}`)
    }
  }

  const clearAuthState = async () => {
    addEvent('Manual signOut triggered')
    try {
      await supabase.auth.signOut()
      addEvent('SignOut completed')
    } catch (err) {
      addEvent(`SignOut error: ${err}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Authentication State Debug
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AuthContext State */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">AuthContext State</h2>
              
              <div className="bg-gray-50 p-4 rounded">
                <div className="space-y-2 text-sm">
                  <p><strong>isLoading:</strong> <span className={isLoading ? 'text-red-600' : 'text-green-600'}>{isLoading.toString()}</span></p>
                  <p><strong>user:</strong> {user ? `${user.id} (${user.email})` : 'null'}</p>
                  <p><strong>profile:</strong> {profile ? `${profile.role} (${profile.email})` : 'null'}</p>
                  <p><strong>token:</strong> {token ? `${token.substring(0, 20)}...` : 'null'}</p>
                  <p><strong>isAdmin:</strong> <span className={isAdmin ? 'text-green-600' : 'text-gray-600'}>{isAdmin.toString()}</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={refreshSession}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                >
                  Refresh Session
                </button>
                <button
                  onClick={clearAuthState}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Clear Auth
                </button>
              </div>
            </div>

            {/* Direct Session Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Direct Session Info</h2>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Session Data:</h3>
                <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                  {sessionInfo ? JSON.stringify(sessionInfo, null, 2) : 'No session data'}
                </pre>
              </div>

              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-2">Raw Profile Data:</h3>
                <pre className="text-xs bg-white p-2 rounded overflow-auto max-h-40">
                  {rawProfile ? JSON.stringify(rawProfile, null, 2) : 'No profile data'}
                </pre>
              </div>
            </div>
          </div>

          {/* Auth Events Log */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-gray-800">Auth Events Log</h2>
              <button
                onClick={() => setAuthEvents([])}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear Log
              </button>
            </div>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-auto">
              {authEvents.length > 0 ? (
                authEvents.map((event, index) => (
                  <div key={index} className="mb-1">
                    {event}
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No events logged yet...</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Actions</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Refresh this page to test session restoration</p>
              <p>• Check the events log to see the auth flow</p>
              <p>• Watch the loading state and profile fetching</p>
              <p>• Use browser dev tools to check network requests</p>
            </div>
          </div>

          {/* Current Issues */}
          {isLoading && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Currently Loading</h3>
              <p className="text-yellow-800">Auth state is still loading. Check the events log to see what's happening.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
