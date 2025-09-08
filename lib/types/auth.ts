export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  user_id: string
  role: UserRole
  email: string
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email?: string
  profile?: UserProfile | null
}

export interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  token: string | null
  isLoading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateRole: (userId: string, role: UserRole) => Promise<void>
}
