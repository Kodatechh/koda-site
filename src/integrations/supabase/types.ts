export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.15" };
  public: {
    Tables: {
      site_content: {
        Row: { data: Json; id: string; updated_at: string };
        Insert: { data?: Json; id: string; updated_at?: string };
        Update: { data?: Json; id?: string; updated_at?: string };
        Relationships: [];
      };
      user_roles: {
        Row: { id: string; role: Database["public"]["Enums"]["app_role"]; user_id: string };
        Insert: { id?: string; role: Database["public"]["Enums"]["app_role"]; user_id: string };
        Update: { id?: string; role?: Database["public"]["Enums"]["app_role"]; user_id?: string };
        Relationships: [];
      };
      profiles: {
        Row: { user_id: string; full_name: string | null; created_at: string; updated_at: string };
        Insert: {
          user_id: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          serial_number: string;
          model: string;
          status: Database["public"]["Enums"]["koda_device_status"];
          provisioning_status: Database["public"]["Enums"]["koda_provisioning_status"];
          provisioned_at: string | null;
          factory_tested_at: string | null;
          ready_at: string | null;
          batch_id: string | null;
          hardware_revision: string | null;
          manufactured_at: string | null;
          purchase_date: string | null;
          warranty_start: string | null;
          warranty_end: string | null;
          kodaos_version: string | null;
          board_uid: string | null;
          last_seen_at: string | null;
          owner_user_id: string | null;
          activated_at: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          serial_number: string;
          model: string;
          status?: Database["public"]["Enums"]["koda_device_status"];
          provisioning_status?: Database["public"]["Enums"]["koda_provisioning_status"];
          provisioned_at?: string | null;
          factory_tested_at?: string | null;
          ready_at?: string | null;
          batch_id?: string | null;
          hardware_revision?: string | null;
          manufactured_at?: string | null;
          purchase_date?: string | null;
          warranty_start?: string | null;
          warranty_end?: string | null;
          kodaos_version?: string | null;
          board_uid?: string | null;
          last_seen_at?: string | null;
          owner_user_id?: string | null;
          activated_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          serial_number?: string;
          model?: string;
          status?: Database["public"]["Enums"]["koda_device_status"];
          provisioning_status?: Database["public"]["Enums"]["koda_provisioning_status"];
          provisioned_at?: string | null;
          factory_tested_at?: string | null;
          ready_at?: string | null;
          batch_id?: string | null;
          hardware_revision?: string | null;
          manufactured_at?: string | null;
          purchase_date?: string | null;
          warranty_start?: string | null;
          warranty_end?: string | null;
          kodaos_version?: string | null;
          board_uid?: string | null;
          last_seen_at?: string | null;
          owner_user_id?: string | null;
          activated_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      device_events: {
        Row: {
          id: string;
          device_id: string;
          event_type: string;
          details: Json;
          actor_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          event_type: string;
          details?: Json;
          actor_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          event_type?: string;
          details?: Json;
          actor_user_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      device_coverages: {
        Row: {
          id: string;
          device_id: string;
          plan: Database["public"]["Enums"]["koda_care_plan"];
          status: Database["public"]["Enums"]["koda_coverage_status"];
          purchased_at: string;
          coverage_start: string;
          coverage_end: string;
          eligibility_deadline: string;
          accidental_damage_coverage: boolean;
          accidental_damage_uses_per_year: number;
          accidental_damage_deductible_required: boolean;
          repair_discount_percent: number;
          cleaning_and_inspection_included: boolean;
          cancelled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          plan: Database["public"]["Enums"]["koda_care_plan"];
          status?: Database["public"]["Enums"]["koda_coverage_status"];
          purchased_at?: string;
          coverage_start?: string;
          coverage_end?: string;
          eligibility_deadline?: string;
          accidental_damage_coverage?: boolean;
          accidental_damage_uses_per_year?: number;
          accidental_damage_deductible_required?: boolean;
          repair_discount_percent?: number;
          cleaning_and_inspection_included?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: Database["public"]["Enums"]["koda_coverage_status"];
          cancelled_at?: string | null;
        };
        Relationships: [];
      };
      device_coverage_incidents: {
        Row: {
          id: string;
          device_id: string;
          coverage_id: string;
          incident_type: string;
          repair_service_id: string | null;
          status: string;
          opened_at: string;
          approved_at: string | null;
          completed_at: string | null;
          coverage_year_start: string | null;
          coverage_year_end: string | null;
          consumes_accidental_occurrence: boolean;
          deductible_rule_id: string | null;
          deductible_amount_cents: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      kodacare_deductible_rules: {
        Row: {
          id: string;
          repair_service_id: string | null;
          amount_cents: number | null;
          currency: string;
          effective_from: string;
          effective_until: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      device_health: {
        Row: {
          device_id: string;
          online: boolean;
          last_seen_at: string | null;
          wifi_status: string | null;
          wifi_signal: number | null;
          system_status: string;
          display_status: string | null;
          touch_status: string | null;
          sensor_status: string | null;
          audio_status: string | null;
          storage_status: string | null;
          last_boot_at: string | null;
          last_restart_reason: string | null;
          diagnostics: Json;
          checks: Json;
          last_diagnostic_at: string | null;
          uptime_seconds: number | null;
          last_boot_reason: string | null;
          updated_at: string;
        };
        Insert: {
          device_id: string;
          online?: boolean;
          last_seen_at?: string | null;
          checks?: Json;
          last_diagnostic_at?: string | null;
        };
        Update: {
          online?: boolean;
          last_seen_at?: string | null;
          checks?: Json;
          last_diagnostic_at?: string | null;
        };
        Relationships: [];
      };
      device_commands: {
        Row: {
          id: string;
          device_id: string;
          requested_by: string | null;
          command: string;
          payload: Json;
          status: string;
          result: Json;
          created_at: string;
          delivered_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          device_id: string;
          requested_by?: string | null;
          command: string;
          payload?: Json;
          status?: string;
        };
        Update: {
          status?: string;
          result?: Json;
          delivered_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      admin_audit_log: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: { details?: Json };
        Relationships: [];
      };
      support_cases: {
        Row: {
          id: string;
          owner_user_id: string;
          device_id: string | null;
          category: string;
          subject: string;
          message: string;
          status: Database["public"]["Enums"]["koda_support_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          device_id?: string | null;
          category: string;
          subject: string;
          message: string;
          status?: Database["public"]["Enums"]["koda_support_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_user_id?: string;
          device_id?: string | null;
          category?: string;
          subject?: string;
          message?: string;
          status?: Database["public"]["Enums"]["koda_support_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string };
        Returns: boolean;
      };
      factory_list_devices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          serial_number: string;
          model: string;
          status: Database["public"]["Enums"]["koda_device_status"];
          provisioning_status: Database["public"]["Enums"]["koda_provisioning_status"];
          manufactured_at: string | null;
          purchase_date: string | null;
          warranty_start: string | null;
          warranty_end: string | null;
          kodaos_version: string | null;
          hardware_revision: string | null;
          activated_at: string | null;
          owner_email_masked: string | null;
          notes: string | null;
          created_at: string;
        }[];
      };
      factory_delete_device: {
        Args: { _device_id: string };
        Returns: undefined;
      };
      get_device_factory_tests: {
        Args: { _device_id: string };
        Returns: {
          component_name: string;
          status: string;
          tested_at: string | null;
          notes: string | null;
        }[];
      };
      update_device_factory_test: {
        Args: { _device_id: string; _component_name: string; _status: string };
        Returns: undefined;
      };
      mark_device_factory_tested: {
        Args: { _device_id: string };
        Returns: undefined;
      };
      mark_device_ready_for_sale: {
        Args: { _device_id: string };
        Returns: undefined;
      };
      support_factory_reset_device: {
        Args: { _device_id: string; _reason: string };
        Returns: {
          serial: string;
          model: string;
          board_uid: string;
          device_secret_hex: string;
        }[];
      };
      koda_factory_register_device: {
        Args: {
          p_serial_number: string;
          p_model: string;
          p_manufactured_at?: string | null;
          p_purchase_date?: string | null;
          p_warranty_start?: string | null;
          p_warranty_end?: string | null;
          p_kodaos_version?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      get_device_kodacare_status: {
        Args: { _device_id: string };
        Returns: {
          eligible: boolean;
          eligibility_deadline: string | null;
          eligibility_days_remaining: number;
          plan: Database["public"]["Enums"]["koda_care_plan"] | null;
          coverage_status: Database["public"]["Enums"]["koda_coverage_status"] | null;
          purchased_at: string | null;
          coverage_start: string | null;
          coverage_end: string | null;
          accidental_damage_coverage: boolean | null;
          accidental_damage_uses_per_year: number | null;
          accidental_damage_uses_in_current_period: number | null;
          accidental_damage_period_start: string | null;
          accidental_damage_period_end: string | null;
          accidental_damage_deductible_required: boolean | null;
          repair_discount_percent: number | null;
          cleaning_and_inspection_included: boolean | null;
        }[];
      };
      open_kodacare_accidental_incident: {
        Args: { _coverage_id: string; _incident_type: string; _repair_service_id?: string | null };
        Returns: string;
      };
      set_kodacare_accidental_incident_status: {
        Args: { _incident_id: string; _status: string };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "support_agent" | "support_advanced";
      koda_activation_session_status: "pending" | "claimed" | "expired";
      koda_care_plan: "kodacare" | "kodacare_plus_1y" | "kodacare_plus_2y";
      koda_coverage_status: "active" | "expired" | "cancelled";
      koda_device_status: "not_activated" | "activated" | "service" | "retired";
      koda_provisioning_status: "registered" | "provisioned" | "factory_tested" | "ready";
      koda_support_status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "support_agent", "support_advanced"],
      koda_activation_session_status: ["pending", "claimed", "expired"],
      koda_care_plan: ["kodacare", "kodacare_plus_1y", "kodacare_plus_2y"],
      koda_coverage_status: ["active", "expired", "cancelled"],
      koda_device_status: ["not_activated", "activated", "service", "retired"],
      koda_support_status: ["open", "in_progress", "waiting_customer", "resolved", "closed"],
    },
  },
} as const;
