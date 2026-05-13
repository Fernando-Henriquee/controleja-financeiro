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
      accounts: {
        Row: {
          balance: number
          closing_day: number | null
          color: string
          created_at: string
          credit_limit: number | null
          credit_used: number
          due_day: number | null
          id: string
          kind: string
          name: string
          overdraft_limit: number | null
          position: number
          profile_id: string
        }
        Insert: {
          balance?: number
          closing_day?: number | null
          color?: string
          created_at?: string
          credit_limit?: number | null
          credit_used?: number
          due_day?: number | null
          id?: string
          kind?: string
          name: string
          overdraft_limit?: number | null
          position?: number
          profile_id: string
        }
        Update: {
          balance?: number
          closing_day?: number | null
          color?: string
          created_at?: string
          credit_limit?: number | null
          credit_used?: number
          due_day?: number | null
          id?: string
          kind?: string
          name?: string
          overdraft_limit?: number | null
          position?: number
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_invoices: {
        Row: {
          account_id: string
          created_at: string
          cycle_key: string
          due_date: string
          id: string
          paid_at: string | null
          paid_from_account_id: string | null
          period_end: string
          period_start: string
          profile_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          cycle_key: string
          due_date: string
          id?: string
          paid_at?: string | null
          paid_from_account_id?: string | null
          period_end: string
          period_start: string
          profile_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          cycle_key?: string
          due_date?: string
          id?: string
          paid_at?: string | null
          paid_from_account_id?: string | null
          period_end?: string
          period_start?: string
          profile_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      coach_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          month_key: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          month_key: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          month_key?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_patterns: {
        Row: {
          account_id: string
          category: string
          created_at: string
          id: string
          last_used_at: string
          method: string
          pattern: string
          profile_id: string
          use_count: number
        }
        Insert: {
          account_id: string
          category?: string
          created_at?: string
          id?: string
          last_used_at?: string
          method: string
          pattern: string
          profile_id: string
          use_count?: number
        }
        Update: {
          account_id?: string
          category?: string
          created_at?: string
          id?: string
          last_used_at?: string
          method?: string
          pattern?: string
          profile_id?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_patterns_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_patterns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          account_id: string
          amount: number
          category: string
          created_at: string
          description: string
          id: string
          invoice_id: string | null
          is_pending: boolean
          method: string
          occurred_at: string
          profile_id: string
          raw: string | null
        }
        Insert: {
          account_id: string
          amount: number
          category?: string
          created_at?: string
          description: string
          id?: string
          invoice_id?: string | null
          is_pending?: boolean
          method: string
          occurred_at?: string
          profile_id: string
          raw?: string | null
        }
        Update: {
          account_id?: string
          amount?: number
          category?: string
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string | null
          is_pending?: boolean
          method?: string
          occurred_at?: string
          profile_id?: string
          raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_records: {
        Row: {
          created_at: string
          deposit_account_id: string | null
          extra_income: number
          hourly_rate: number
          id: string
          mode: string
          month_key: string
          monthly_salary: number
          paid_at: string | null
          profile_id: string
          updated_at: string
          worked_hours: number | null
          working_days: number
        }
        Insert: {
          created_at?: string
          deposit_account_id?: string | null
          extra_income?: number
          hourly_rate?: number
          id?: string
          mode?: string
          month_key: string
          monthly_salary?: number
          paid_at?: string | null
          profile_id: string
          updated_at?: string
          worked_hours?: number | null
          working_days?: number
        }
        Update: {
          created_at?: string
          deposit_account_id?: string | null
          extra_income?: number
          hourly_rate?: number
          id?: string
          mode?: string
          month_key?: string
          monthly_salary?: number
          paid_at?: string | null
          profile_id?: string
          updated_at?: string
          worked_hours?: number | null
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      income_settings: {
        Row: {
          extra_income: number
          hourly_rate: number
          hours_per_day: number
          manual_adjustment: number
          mode: string
          monthly_salary: number
          profile_id: string
          updated_at: string
          working_days: number
        }
        Insert: {
          extra_income?: number
          hourly_rate?: number
          hours_per_day?: number
          manual_adjustment?: number
          mode?: string
          monthly_salary?: number
          profile_id: string
          updated_at?: string
          working_days?: number
        }
        Update: {
          extra_income?: number
          hourly_rate?: number
          hours_per_day?: number
          manual_adjustment?: number
          mode?: string
          monthly_salary?: number
          profile_id?: string
          updated_at?: string
          working_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "income_settings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          account_id: string
          created_at: string
          description: string
          first_month_key: string
          id: string
          installment_amount: number
          installment_count: number
          paid_installments: number
          profile_id: string
          total_amount: number
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string
          first_month_key: string
          id?: string
          installment_amount?: number
          installment_count?: number
          paid_installments?: number
          profile_id: string
          total_amount?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string
          first_month_key?: string
          id?: string
          installment_amount?: number
          installment_count?: number
          paid_installments?: number
          profile_id?: string
          total_amount?: number
        }
        Relationships: []
      }
      loans: {
        Row: {
          bank: string
          created_at: string
          id: string
          installment_amount: number
          notes: string | null
          paid_installments: number
          payment_day: number
          profile_id: string
          total_amount: number
          total_installments: number
        }
        Insert: {
          bank: string
          created_at?: string
          id?: string
          installment_amount?: number
          notes?: string | null
          paid_installments?: number
          payment_day?: number
          profile_id: string
          total_amount?: number
          total_installments?: number
        }
        Update: {
          bank?: string
          created_at?: string
          id?: string
          installment_amount?: number
          notes?: string | null
          paid_installments?: number
          payment_day?: number
          profile_id?: string
          total_amount?: number
          total_installments?: number
        }
        Relationships: [
          {
            foreignKeyName: "loans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          color: string
          created_at: string
          cycle_start_day: number
          emoji: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          cycle_start_day?: number
          emoji?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          cycle_start_day?: number
          emoji?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          account_id: string
          amount: number
          applied_months: string[]
          auto_apply: boolean
          category: string
          created_at: string
          day_of_month: number
          description: string
          id: string
          method: string
          paid_months: string[]
          profile_id: string
        }
        Insert: {
          account_id: string
          amount: number
          applied_months?: string[]
          auto_apply?: boolean
          category?: string
          created_at?: string
          day_of_month: number
          description: string
          id?: string
          method: string
          paid_months?: string[]
          profile_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          applied_months?: string[]
          auto_apply?: boolean
          category?: string
          created_at?: string
          day_of_month?: number
          description?: string
          id?: string
          method?: string
          paid_months?: string[]
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          day_of_month: number
          enabled: boolean
          id: string
          profile_id: string
          title: string
        }
        Insert: {
          created_at?: string
          day_of_month: number
          enabled?: boolean
          id?: string
          profile_id: string
          title: string
        }
        Update: {
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          id?: string
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      is_profile_owner: { Args: { _profile_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
