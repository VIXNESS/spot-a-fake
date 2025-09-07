import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'admin'
          email: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: 'user' | 'admin'
          email: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'admin'
          email?: string
          created_at?: string
          updated_at?: string
        }
      }
      analysis: {
        Row: {
          id: string
          user_id: string
          image_url: string
          visibility: 'private' | 'public'
          ai_confidence: number | null
          ai_result_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url: string
          visibility?: 'private' | 'public'
          ai_confidence?: number | null
          ai_result_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          visibility?: 'private' | 'public'
          ai_confidence?: number | null
          ai_result_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      analysis_detail: {
        Row: {
          id: string
          analysis_id: string
          user_id: string
          image_url: string
          ai_confidence: number | null
          ai_result_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          analysis_id: string
          user_id: string
          image_url: string
          ai_confidence?: number | null
          ai_result_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          analysis_id?: string
          user_id?: string
          image_url?: string
          ai_confidence?: number | null
          ai_result_text?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
