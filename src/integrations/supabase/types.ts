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
      pr_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          item_id: string
          reviewer_id: string
          role: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          reviewer_id: string
          role: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          reviewer_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_assignments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pr_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_batches: {
        Row: {
          created_at: string
          facility_id: string | null
          id: string
          imported_by: string | null
          mode: string
          name: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          id?: string
          imported_by?: string | null
          mode: string
          name: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          id?: string
          imported_by?: string | null
          mode?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_batches_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_export_approvals: {
        Row: {
          approved_by: string | null
          batch_id: string
          clinical_approved: boolean
          privacy_reviewed: boolean
          training_use_approved: boolean
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          batch_id: string
          clinical_approved?: boolean
          privacy_reviewed?: boolean
          training_use_approved?: boolean
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          batch_id?: string
          clinical_approved?: boolean
          privacy_reviewed?: boolean
          training_use_approved?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_export_approvals_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: true
            referencedRelation: "pr_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_item_flags: {
        Row: {
          additional_context_needed: boolean
          context_sufficient: boolean
          created_at: string
          deidentification_reviewed: boolean
          item_id: string
          training_use_approved: boolean
          training_use_approved_at: string | null
          training_use_approved_by: string | null
        }
        Insert: {
          additional_context_needed?: boolean
          context_sufficient?: boolean
          created_at?: string
          deidentification_reviewed?: boolean
          item_id: string
          training_use_approved?: boolean
          training_use_approved_at?: string | null
          training_use_approved_by?: string | null
        }
        Update: {
          additional_context_needed?: boolean
          context_sufficient?: boolean
          created_at?: string
          deidentification_reviewed?: boolean
          item_id?: string
          training_use_approved?: boolean
          training_use_approved_at?: string | null
          training_use_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_item_flags_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "pr_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_items: {
        Row: {
          batch_id: string
          context: string | null
          created_at: string
          encounter_group: string | null
          facility_id: string | null
          group_key: string
          holdout: boolean
          id: string
          message: string
          mode: string
          patient_group: string | null
          record_id: string
          split: string
          template_group: string | null
        }
        Insert: {
          batch_id: string
          context?: string | null
          created_at?: string
          encounter_group?: string | null
          facility_id?: string | null
          group_key: string
          holdout?: boolean
          id?: string
          message: string
          mode: string
          patient_group?: string | null
          record_id: string
          split?: string
          template_group?: string | null
        }
        Update: {
          batch_id?: string
          context?: string | null
          created_at?: string
          encounter_group?: string | null
          facility_id?: string | null
          group_key?: string
          holdout?: boolean
          id?: string
          message?: string
          mode?: string
          patient_group?: string | null
          record_id?: string
          split?: string
          template_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pr_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "pr_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pr_items_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_outcomes: {
        Row: {
          final_acuity: string | null
          final_routes: string[]
          item_id: string
          label_quality: string | null
          resolved_at: string | null
          routes_state: string
          state: string
          updated_at: string
        }
        Insert: {
          final_acuity?: string | null
          final_routes?: string[]
          item_id: string
          label_quality?: string | null
          resolved_at?: string | null
          routes_state?: string
          state?: string
          updated_at?: string
        }
        Update: {
          final_acuity?: string | null
          final_routes?: string[]
          item_id?: string
          label_quality?: string | null
          resolved_at?: string | null
          routes_state?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_outcomes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "pr_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pr_reviews: {
        Row: {
          acuity: string | null
          created_at: string
          id: string
          is_adjudication: boolean
          item_id: string
          needs_info: boolean
          no_specialty_needed: boolean
          rationale: string
          reviewer_id: string
          routes: string[]
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acuity?: string | null
          created_at?: string
          id?: string
          is_adjudication?: boolean
          item_id: string
          needs_info?: boolean
          no_specialty_needed?: boolean
          rationale?: string
          reviewer_id: string
          routes?: string[]
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acuity?: string | null
          created_at?: string
          id?: string
          is_adjudication?: boolean
          item_id?: string
          needs_info?: boolean
          no_specialty_needed?: boolean
          rationale?: string
          reviewer_id?: string
          routes?: string[]
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pr_reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pr_items"
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
      review_cases: {
        Row: {
          care_setting: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          decision_id: string
          final_acuity: string | null
          id: string
          label_quality: string | null
          message_text: string
          model_version: string
          policy_version: string | null
          predicted_acuity: string
          probabilities: Json
          reason_codes: string[]
          route_destination: string | null
          sender_role: string | null
          state: string
          updated_at: string
          use_case: string
        }
        Insert: {
          care_setting?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          decision_id: string
          final_acuity?: string | null
          id?: string
          label_quality?: string | null
          message_text: string
          model_version: string
          policy_version?: string | null
          predicted_acuity: string
          probabilities?: Json
          reason_codes?: string[]
          route_destination?: string | null
          sender_role?: string | null
          state?: string
          updated_at?: string
          use_case: string
        }
        Update: {
          care_setting?: string | null
          confidence?: number | null
          created_at?: string
          created_by?: string | null
          decision_id?: string
          final_acuity?: string | null
          id?: string
          label_quality?: string | null
          message_text?: string
          model_version?: string
          policy_version?: string | null
          predicted_acuity?: string
          probabilities?: Json
          reason_codes?: string[]
          route_destination?: string | null
          sender_role?: string | null
          state?: string
          updated_at?: string
          use_case?: string
        }
        Relationships: []
      }
      review_verdicts: {
        Row: {
          acuity: string
          case_id: string
          created_at: string
          id: string
          is_adjudication: boolean
          model_version: string
          outcome_code: string
          reviewer_id: string
          route_accepted: boolean
        }
        Insert: {
          acuity: string
          case_id: string
          created_at?: string
          id?: string
          is_adjudication?: boolean
          model_version: string
          outcome_code: string
          reviewer_id: string
          route_accepted: boolean
        }
        Update: {
          acuity?: string
          case_id?: string
          created_at?: string
          id?: string
          is_adjudication?: boolean
          model_version?: string
          outcome_code?: string
          reviewer_id?: string
          route_accepted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "review_verdicts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
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
      is_clinical_reviewer: { Args: { _user_id: string }; Returns: boolean }
      pr_assign_adjudicator: {
        Args: { _item_id: string; _who: string }
        Returns: undefined
      }
      pr_assign_reviewers: {
        Args: { _a: string; _b: string; _item_ids: string[] }
        Returns: number
      }
      pr_audit: {
        Args: {
          _action: string
          _entity: string
          _facility: string
          _id: string
        }
        Returns: undefined
      }
      pr_batch_facility: { Args: { _batch: string }; Returns: string }
      pr_coord_scope: {
        Args: { _facility: string; _uid: string }
        Returns: boolean
      }
      pr_export_batch: {
        Args: { _batch: string }
        Returns: {
          acuity: string
          encounter_group: string
          group_id: string
          label_quality: string
          no_specialty_needed: boolean
          patient_group: string
          record_id: string
          routes: string[]
          routes_state: string
          split: string
          template_group: string
          text_value: string
        }[]
      }
      pr_import_batch: {
        Args: { _facility: string; _items: Json; _mode: string; _name: string }
        Returns: string
      }
      pr_is_conflicted: {
        Args: { _item: string; _uid: string }
        Returns: boolean
      }
      pr_is_coordinator: { Args: { _uid: string }; Returns: boolean }
      pr_is_physician: { Args: { _uid: string }; Returns: boolean }
      pr_item_facility: { Args: { _item: string }; Returns: string }
      pr_list_items: {
        Args: { _batch?: string; _limit?: number; _state?: string }
        Returns: {
          batch_id: string
          batch_name: string
          blinded: boolean
          encounter_group: string
          facility_id: string
          final_acuity: string
          group_key: string
          item_id: string
          label_quality: string
          message: string
          mode: string
          patient_group: string
          privacy_reviewed: boolean
          record_id: string
          reviewers: string[]
          routes_state: string
          split: string
          state: string
          submitted: number
          template_group: string
          training_use_approved: boolean
        }[]
      }
      pr_my_queue: {
        Args: { _include_done?: boolean }
        Returns: {
          assignment_role: string
          batch_name: string
          context: string
          facility_id: string
          item_id: string
          message: string
          mode: string
          my_acuity: string
          my_needs_info: boolean
          my_no_specialty_needed: boolean
          my_rationale: string
          my_routes: string[]
          my_status: string
          record_id: string
          updated_at: string
        }[]
      }
      pr_overview: { Args: never; Returns: Json }
      pr_recompute: { Args: { _item_id: string }; Returns: undefined }
      pr_reviewer_scope: {
        Args: { _item: string; _uid: string }
        Returns: boolean
      }
      pr_save_review: {
        Args: {
          _acuity: string
          _item_id: string
          _needs_info: boolean
          _no_specialty: boolean
          _rationale: string
          _routes: string[]
          _status: string
        }
        Returns: Json
      }
      pr_set_export_approval: {
        Args: {
          _batch: string
          _clinical: boolean
          _privacy: boolean
          _training: boolean
        }
        Returns: undefined
      }
      pr_set_item_training_use: {
        Args: { _approved: boolean; _item_ids: string[] }
        Returns: number
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
      review_queue: {
        Args: {
          _limit?: number
          _predicted?: string
          _state?: string
          _use_case?: string
        }
        Returns: {
          care_setting: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          decision_id: string
          final_acuity: string | null
          id: string
          label_quality: string | null
          message_text: string
          model_version: string
          policy_version: string | null
          predicted_acuity: string
          probabilities: Json
          reason_codes: string[]
          route_destination: string | null
          sender_role: string | null
          state: string
          updated_at: string
          use_case: string
        }[]
        SetofOptions: {
          from: "*"
          to: "review_cases"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      review_stats: { Args: never; Returns: Json }
      setup_complete: { Args: { _user_id: string }; Returns: boolean }
      shares_facility: { Args: { _a: string; _b: string }; Returns: boolean }
      submit_review_verdict: {
        Args: {
          _acuity: string
          _case_id: string
          _outcome_code: string
          _route_accepted: boolean
        }
        Returns: {
          care_setting: string | null
          confidence: number | null
          created_at: string
          created_by: string | null
          decision_id: string
          final_acuity: string | null
          id: string
          label_quality: string | null
          message_text: string
          model_version: string
          policy_version: string | null
          predicted_acuity: string
          probabilities: Json
          reason_codes: string[]
          route_destination: string | null
          sender_role: string | null
          state: string
          updated_at: string
          use_case: string
        }
        SetofOptions: {
          from: "*"
          to: "review_cases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      acuity_level: "critical" | "urgent" | "routine"
      app_role: "admin" | "member" | "clinical_reviewer"
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
      app_role: ["admin", "member", "clinical_reviewer"],
    },
  },
} as const
