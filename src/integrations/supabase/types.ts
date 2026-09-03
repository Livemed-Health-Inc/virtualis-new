export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          facility_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          facility_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          facility_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      care_team: {
        Row: {
          created_at: string
          dept: string
          facility_id: string
          id: string
          initials: string
          name: string
          online: boolean
          role: string
        }
        Insert: {
          created_at?: string
          dept: string
          facility_id: string
          id?: string
          initials: string
          name: string
          online?: boolean
          role: string
        }
        Update: {
          created_at?: string
          dept?: string
          facility_id?: string
          id?: string
          initials?: string
          name?: string
          online?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_team_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      device_enrollments: {
        Row: {
          code_hash: string
          code_hint: string
          consumed_at: string | null
          created_at: string
          created_by: string | null
          device_id: string
          expires_at: string
          id: string
          revoked_at: string | null
        }
        Insert: {
          code_hash: string
          code_hint?: string
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          device_id: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
        }
        Update: {
          code_hash?: string
          code_hint?: string
          consumed_at?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_enrollments_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          created_by: string | null
          device_token_hash: string | null
          enrolled_at: string | null
          facility_id: string
          floating: boolean
          has_mintti: boolean
          id: string
          label: string
          last_seen_at: string | null
          revoked_at: string | null
          room: string | null
          status: string
          token_expires_at: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_token_hash?: string | null
          enrolled_at?: string | null
          facility_id: string
          floating?: boolean
          has_mintti?: boolean
          id?: string
          label: string
          last_seen_at?: string | null
          revoked_at?: string | null
          room?: string | null
          status?: string
          token_expires_at?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_token_hash?: string | null
          enrolled_at?: string | null
          facility_id?: string
          floating?: boolean
          has_mintti?: boolean
          id?: string
          label?: string
          last_seen_at?: string | null
          revoked_at?: string | null
          room?: string | null
          status?: string
          token_expires_at?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      encounter_requests: {
        Row: {
          accepted_at: string | null
          created_at: string
          device_id: string
          ended_at: string | null
          facility_id: string
          id: string
          mode: string
          provider_id: string | null
          requested_at: string
          specialty: string
          status: string
          updated_at: string
          urgency: Database["public"]["Enums"]["acuity_level"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          device_id: string
          ended_at?: string | null
          facility_id: string
          id?: string
          mode?: string
          provider_id?: string | null
          requested_at?: string
          specialty: string
          status?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["acuity_level"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          device_id?: string
          ended_at?: string | null
          facility_id?: string
          id?: string
          mode?: string
          provider_id?: string | null
          requested_at?: string
          specialty?: string
          status?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["acuity_level"]
        }
        Relationships: [
          {
            foreignKeyName: "encounter_requests_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounter_requests_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          created_at: string
          emr: string
          hue: string
          id: string
          name: string
          short: string
        }
        Insert: {
          created_at?: string
          emr: string
          hue: string
          id: string
          name: string
          short: string
        }
        Update: {
          created_at?: string
          emr?: string
          hue?: string
          id?: string
          name?: string
          short?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          department: string | null
          email: string
          facility_id: string | null
          facility_ids: string[]
          full_name: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          specialty: string | null
          staff_type: string | null
          status: string
          title: string | null
          updated_at: string
          user_class: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email: string
          facility_id?: string | null
          facility_ids?: string[]
          full_name?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specialty?: string | null
          staff_type?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_class?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          department?: string | null
          email?: string
          facility_id?: string | null
          facility_ids?: string[]
          full_name?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          specialty?: string | null
          staff_type?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_class?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          sender_id: string | null
          sender_name: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string | null
          sender_name: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          sender_id?: string | null
          sender_name?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          dept: string
          home_facility: string
          id: string
          initials: string
          must_change_password: boolean
          name: string
          notification_prefs: Json
          online: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dept?: string
          home_facility?: string
          id: string
          initials?: string
          must_change_password?: boolean
          name?: string
          notification_prefs?: Json
          online?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dept?: string
          home_facility?: string
          id?: string
          initials?: string
          must_change_password?: boolean
          name?: string
          notification_prefs?: Json
          online?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_facility_fkey"
            columns: ["home_facility"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_credentials: {
        Row: {
          created_at: string
          expires_on: string
          facility_id: string
          id: string
          privileges: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_on?: string
          facility_id: string
          id?: string
          privileges?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_on?: string
          facility_id?: string
          id?: string
          privileges?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_credentials_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_presence: {
        Row: {
          created_at: string
          facility_id: string
          last_seen_at: string
          ready_to_round: boolean
          ready_to_round_at: string | null
          specialty: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          last_seen_at?: string
          ready_to_round?: boolean
          ready_to_round_at?: string | null
          specialty?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          last_seen_at?: string
          ready_to_round?: boolean
          ready_to_round_at?: string | null
          specialty?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_presence_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          attempts: number
          bucket_key: string
          locked_until: string | null
          updated_at: string
          window_start: string
        }
        Insert: {
          attempts?: number
          bucket_key: string
          locked_until?: string | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          attempts?: number
          bucket_key?: string
          locked_until?: string | null
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      rounding_acks: {
        Row: {
          acked_at: string
          device_id: string
          provider_id: string
        }
        Insert: {
          acked_at?: string
          device_id: string
          provider_id: string
        }
        Update: {
          acked_at?: string
          device_id?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rounding_acks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          acuity: Database["public"]["Enums"]["acuity_level"]
          created_at: string
          day_of_month: number
          facility_id: string
          id: string
          label: string
          time_label: string
        }
        Insert: {
          acuity?: Database["public"]["Enums"]["acuity_level"]
          created_at?: string
          day_of_month: number
          facility_id: string
          id?: string
          label: string
          time_label: string
        }
        Update: {
          acuity?: Database["public"]["Enums"]["acuity_level"]
          created_at?: string
          day_of_month?: number
          facility_id?: string
          id?: string
          label?: string
          time_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_reads: {
        Row: {
          last_read_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_reads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          acuity: Database["public"]["Enums"]["acuity_level"]
          confidence: number
          context: string
          created_at: string
          created_by: string | null
          dob: string | null
          facility_id: string
          id: string
          is_team: boolean
          last_message_at: string
          members: string | null
          mrn: string | null
          name: string
          patient: string
          reason: string
          room: string
        }
        Insert: {
          acuity?: Database["public"]["Enums"]["acuity_level"]
          confidence?: number
          context?: string
          created_at?: string
          created_by?: string | null
          dob?: string | null
          facility_id: string
          id?: string
          is_team?: boolean
          last_message_at?: string
          members?: string | null
          mrn?: string | null
          name: string
          patient?: string
          reason?: string
          room?: string
        }
        Update: {
          acuity?: Database["public"]["Enums"]["acuity_level"]
          confidence?: number
          context?: string
          created_at?: string
          created_by?: string | null
          dob?: string | null
          facility_id?: string
          id?: string
          is_team?: boolean
          last_message_at?: string
          members?: string | null
          mrn?: string | null
          name?: string
          patient?: string
          reason?: string
          room?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_rate_limit: { Args: { _key: string }; Returns: undefined }
      consume_rate_limit: {
        Args: {
          _key: string
          _limit: number
          _lock_seconds: number
          _window_seconds: number
        }
        Returns: boolean
      }
      has_facility_access: {
        Args: { _facility: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      respond_to_encounter_request: {
        Args: { _next: string; _request_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          device_id: string
          ended_at: string | null
          facility_id: string
          id: string
          mode: string
          provider_id: string | null
          requested_at: string
          specialty: string
          status: string
          updated_at: string
          urgency: Database["public"]["Enums"]["acuity_level"]
        }
        SetofOptions: {
          from: "*"
          to: "encounter_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      setup_complete: { Args: { _user_id: string }; Returns: boolean }
      shares_facility: { Args: { _a: string; _b: string }; Returns: boolean }
    }
    Enums: {
      acuity_level: "critical" | "urgent" | "routine"
      app_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      acuity_level: ["critical", "urgent", "routine"],
      app_role: ["admin", "member"],
    },
  },
} as const
