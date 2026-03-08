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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata_json: Json | null
          target_id: string | null
          target_type: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          target_id?: string | null
          target_type?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata_json?: Json | null
          target_id?: string | null
          target_type?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string
          collection_id: string
          id: string
          prompt_id: string
          sort_order: number
        }
        Insert: {
          added_at?: string
          collection_id: string
          id?: string
          prompt_id: string
          sort_order?: number
        }
        Update: {
          added_at?: string
          collection_id?: string
          id?: string
          prompt_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      drift_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          baseline_score: number | null
          created_at: string
          current_score: number | null
          drift_policy_id: string
          eval_run_id: string | null
          id: string
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          workspace_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          baseline_score?: number | null
          created_at?: string
          current_score?: number | null
          drift_policy_id: string
          eval_run_id?: string | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          workspace_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          baseline_score?: number | null
          created_at?: string
          current_score?: number | null
          drift_policy_id?: string
          eval_run_id?: string | null
          id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drift_alerts_drift_policy_id_fkey"
            columns: ["drift_policy_id"]
            isOneToOne: false
            referencedRelation: "drift_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_alerts_eval_run_id_fkey"
            columns: ["eval_run_id"]
            isOneToOne: false
            referencedRelation: "eval_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_alerts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      drift_policies: {
        Row: {
          created_at: string
          enabled: boolean
          environment_id: string
          id: string
          prompt_id: string
          schedule_cron: string
          test_suite_id: string
          threshold: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          environment_id: string
          id?: string
          prompt_id: string
          schedule_cron?: string
          test_suite_id: string
          threshold?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          environment_id?: string
          id?: string
          prompt_id?: string
          schedule_cron?: string
          test_suite_id?: string
          threshold?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drift_policies_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_policies_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_policies_test_suite_id_fkey"
            columns: ["test_suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drift_policies_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      environments: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "environments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_results: {
        Row: {
          check_results_json: Json
          created_at: string
          eval_run_id: string
          id: string
          latency_ms: number | null
          output_text: string | null
          passed: boolean
          test_case_id: string
          token_usage_json: Json | null
        }
        Insert: {
          check_results_json?: Json
          created_at?: string
          eval_run_id: string
          id?: string
          latency_ms?: number | null
          output_text?: string | null
          passed?: boolean
          test_case_id: string
          token_usage_json?: Json | null
        }
        Update: {
          check_results_json?: Json
          created_at?: string
          eval_run_id?: string
          id?: string
          latency_ms?: number | null
          output_text?: string | null
          passed?: boolean
          test_case_id?: string
          token_usage_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "eval_results_eval_run_id_fkey"
            columns: ["eval_run_id"]
            isOneToOne: false
            referencedRelation: "eval_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eval_results_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      eval_runs: {
        Row: {
          completed_at: string | null
          cost_json: Json | null
          created_at: string
          created_by: string
          critical_failed: boolean
          error_message: string | null
          id: string
          model: string
          prompt_version_id: string
          provider: Database["public"]["Enums"]["provider"]
          score: number | null
          settings_json: Json
          started_at: string | null
          status: Database["public"]["Enums"]["eval_run_status"]
          test_suite_id: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          cost_json?: Json | null
          created_at?: string
          created_by: string
          critical_failed?: boolean
          error_message?: string | null
          id?: string
          model?: string
          prompt_version_id: string
          provider?: Database["public"]["Enums"]["provider"]
          score?: number | null
          settings_json?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["eval_run_status"]
          test_suite_id: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          cost_json?: Json | null
          created_at?: string
          created_by?: string
          critical_failed?: boolean
          error_message?: string | null
          id?: string
          model?: string
          prompt_version_id?: string
          provider?: Database["public"]["Enums"]["provider"]
          score?: number | null
          settings_json?: Json
          started_at?: string | null
          status?: Database["public"]["Enums"]["eval_run_status"]
          test_suite_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eval_runs_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eval_runs_test_suite_id_fkey"
            columns: ["test_suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eval_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      idempotency_keys: {
        Row: {
          created_at: string
          id: string
          key: string
          response_json: Json | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          response_json?: Json | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          response_json?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idempotency_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      prompt_categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      prompt_category_mappings: {
        Row: {
          category_id: string
          created_at: string
          id: string
          prompt_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          prompt_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          prompt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "prompt_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_category_mappings_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          prompt_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          prompt_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          prompt_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "prompt_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompt_comments_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_likes: {
        Row: {
          created_at: string
          id: string
          prompt_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompt_likes_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_versions: {
        Row: {
          changelog: string | null
          content_json: Json
          contract_json: Json
          created_at: string
          created_by: string
          id: string
          prompt_id: string
          settings_json: Json
          status: Database["public"]["Enums"]["prompt_version_status"]
          version_number: number
        }
        Insert: {
          changelog?: string | null
          content_json?: Json
          contract_json?: Json
          created_at?: string
          created_by: string
          id?: string
          prompt_id: string
          settings_json?: Json
          status?: Database["public"]["Enums"]["prompt_version_status"]
          version_number: number
        }
        Update: {
          changelog?: string | null
          content_json?: Json
          contract_json?: Json
          created_at?: string
          created_by?: string
          id?: string
          prompt_id?: string
          settings_json?: Json
          status?: Database["public"]["Enums"]["prompt_version_status"]
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "prompt_versions_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          comment_count: number
          created_at: string
          created_by: string
          description: string | null
          featured: boolean
          fts_vector: unknown
          id: string
          like_count: number
          name: string
          slug: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          view_count: number
          visibility: Database["public"]["Enums"]["visibility"]
          workspace_id: string
        }
        Insert: {
          comment_count?: number
          created_at?: string
          created_by: string
          description?: string | null
          featured?: boolean
          fts_vector?: unknown
          id?: string
          like_count?: number
          name: string
          slug: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["visibility"]
          workspace_id: string
        }
        Update: {
          comment_count?: number
          created_at?: string
          created_by?: string
          description?: string | null
          featured?: boolean
          fts_vector?: unknown
          id?: string
          like_count?: number
          name?: string
          slug?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["public"]["Enums"]["visibility"]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "prompts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_keys: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          encrypted_key: string
          id: string
          provider: Database["public"]["Enums"]["provider"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_name: string
          encrypted_key: string
          id?: string
          provider: Database["public"]["Enums"]["provider"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          encrypted_key?: string
          id?: string
          provider?: Database["public"]["Enums"]["provider"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_keys_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          created_at: string
          environment_id: string
          id: string
          notes: string | null
          prompt_id: string
          prompt_version_id: string
          released_by: string
        }
        Insert: {
          created_at?: string
          environment_id: string
          id?: string
          notes?: string | null
          prompt_id: string
          prompt_version_id: string
          released_by: string
        }
        Update: {
          created_at?: string
          environment_id?: string
          id?: string
          notes?: string | null
          prompt_id?: string
          prompt_version_id?: string
          released_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "releases_environment_id_fkey"
            columns: ["environment_id"]
            isOneToOne: false
            referencedRelation: "environments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_prompt_version_id_fkey"
            columns: ["prompt_version_id"]
            isOneToOne: false
            referencedRelation: "prompt_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          checks_json: Json
          created_at: string
          critical: boolean
          id: string
          inputs_json: Json
          name: string
          suite_id: string
          updated_at: string
        }
        Insert: {
          checks_json?: Json
          created_at?: string
          critical?: boolean
          id?: string
          inputs_json?: Json
          name?: string
          suite_id: string
          updated_at?: string
        }
        Update: {
          checks_json?: Json
          created_at?: string
          critical?: boolean
          id?: string
          inputs_json?: Json
          name?: string
          suite_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_suite_id_fkey"
            columns: ["suite_id"]
            isOneToOne: false
            referencedRelation: "test_suites"
            referencedColumns: ["id"]
          },
        ]
      }
      test_suites: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          prompt_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          prompt_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          prompt_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_suites_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          personal: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          personal?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          personal?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      has_workspace_role_at_least: {
        Args: {
          _min_role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _actor_id: string
          _metadata?: Json
          _target_id?: string
          _target_type?: string
          _workspace_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      alert_severity: "low" | "medium" | "high" | "critical"
      alert_status: "open" | "acknowledged" | "resolved"
      eval_run_status:
        | "queued"
        | "running"
        | "succeeded"
        | "failed"
        | "cancelled"
      prompt_version_status: "draft" | "in_review" | "approved" | "deprecated"
      provider: "openai" | "anthropic" | "google"
      visibility: "private" | "workspace" | "public"
      workspace_role: "owner" | "admin" | "editor" | "viewer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      alert_severity: ["low", "medium", "high", "critical"],
      alert_status: ["open", "acknowledged", "resolved"],
      eval_run_status: [
        "queued",
        "running",
        "succeeded",
        "failed",
        "cancelled",
      ],
      prompt_version_status: ["draft", "in_review", "approved", "deprecated"],
      provider: ["openai", "anthropic", "google"],
      visibility: ["private", "workspace", "public"],
      workspace_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
