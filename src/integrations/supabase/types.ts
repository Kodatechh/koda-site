export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
        Insert: { user_id: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Update: { user_id?: string; full_name?: string | null; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      devices: {
        Row: {
          id: string;
          serial_number: string;
          model: string;
          status: Database["public"]["Enums"]["koda_device_status"];
          manufactured_at: string | null;
          purchase_date: string | null;
          warranty_start: string | null;
          warranty_end: string | null;
          kodaos_version: string | null;
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
          manufactured_at?: string | null;
          purchase_date?: string | null;
          warranty_start?: string | null;
          warranty_end?: string | null;
          kodaos_version?: string | null;
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
          manufactured_at?: string | null;
          purchase_date?: string | null;
          warranty_start?: string | null;
          warranty_end?: string | null;
          kodaos_version?: string | null;
          owner_user_id?: string | null;
          activated_at?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      device_activation_sessions: {
        Row: {
          id: string;
          device_id: string;
          activation_code: string;
          status: Database["public"]["Enums"]["koda_activation_session_status"];
          claimed_by: string | null;
          expires_at: string;
          created_at: string;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          device_id: string;
          activation_code: string;
          status?: Database["public"]["Enums"]["koda_activation_session_status"];
          claimed_by?: string | null;
          expires_at?: string;
          created_at?: string;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          device_id?: string;
          activation_code?: string;
          status?: Database["public"]["Enums"]["koda_activation_session_status"];
          claimed_by?: string | null;
          expires_at?: string;
          created_at?: string;
          claimed_at?: string | null;
        };
        Relationships: [];
      };
      device_events: {
        Row: { id: string; device_id: string; event_type: string; details: Json; actor_user_id: string | null; created_at: string };
        Insert: { id?: string; device_id: string; event_type: string; details?: Json; actor_user_id?: string | null; created_at?: string };
        Update: { id?: string; device_id?: string; event_type?: string; details?: Json; actor_user_id?: string | null; created_at?: string };
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
      factory_register_device: {
        Args: {
          _serial_number: string;
          _model: string;
          _activation_secret: string;
          _manufactured_at?: string | null;
          _purchase_date?: string | null;
          _warranty_start?: string | null;
          _warranty_end?: string | null;
          _kodaos_version?: string | null;
          _notes?: string | null;
        };
        Returns: string;
      };
      begin_device_activation: {
        Args: { _serial_number: string; _activation_secret: string };
        Returns: { session_id: string; activation_code: string; expires_at: string }[];
      };
      claim_device_activation: {
        Args: { _activation_code: string };
        Returns: string;
      };
      check_device_activation: {
        Args: { _session_id: string; _serial_number: string; _activation_secret: string };
        Returns: {
          activation_status: Database["public"]["Enums"]["koda_activation_session_status"];
          device_activated: boolean;
        }[];
      };
      factory_list_devices: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          serial_number: string;
          model: string;
          status: Database["public"]["Enums"]["koda_device_status"];
          manufactured_at: string | null;
          purchase_date: string | null;
          warranty_start: string | null;
          warranty_end: string | null;
          kodaos_version: string | null;
          activated_at: string | null;
          owner_email_masked: string | null;
          notes: string | null;
          created_at: string;
        }[];
      };
    };
    Enums: {
      app_role: "admin";
      koda_activation_session_status: "pending" | "claimed" | "expired";
      koda_device_status: "not_activated" | "activated" | "service" | "retired";
      koda_support_status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R } ? R : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
      koda_activation_session_status: ["pending", "claimed", "expired"],
      koda_device_status: ["not_activated", "activated", "service", "retired"],
      koda_support_status: ["open", "in_progress", "waiting_customer", "resolved", "closed"],
    },
  },
} as const;
