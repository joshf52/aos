export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type SourceLink = { label: string; url: string };

export type BuildMode = "self" | "ai";
export type ReputationStage = "Explorer" | "Builder" | "Shipper" | "Proven";
export type CommitmentStatus = "active" | "completed" | "abandoned";
export type Tier = "free" | "pro";
export type EmailKind = "welcome" | "checkin_nudge";
export type EmailStatus =
  | "sent"
  | "failed"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "delivery_delayed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          capability: string | null;
          unfair_advantage: string | null;
          // Phase 2 extensions
          domains: string[] | null;
          audience: string | null;
          commitment_level: string | null;
          build_mode: BuildMode | null;
          reputation_stage: ReputationStage;
          active_commitment_count: number;
          tier: Tier;
          pro_until: string | null;
          stripe_customer_id: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          capability?: string | null;
          unfair_advantage?: string | null;
          domains?: string[] | null;
          audience?: string | null;
          commitment_level?: string | null;
          build_mode?: BuildMode | null;
          reputation_stage?: ReputationStage;
          active_commitment_count?: number;
          tier?: Tier;
          pro_until?: string | null;
          stripe_customer_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          capability?: string | null;
          unfair_advantage?: string | null;
          domains?: string[] | null;
          audience?: string | null;
          commitment_level?: string | null;
          build_mode?: BuildMode | null;
          reputation_stage?: ReputationStage;
          active_commitment_count?: number;
          tier?: Tier;
          pro_until?: string | null;
          stripe_customer_id?: string | null;
        };
      };
      opportunities: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          slug: string;
          capability: string;
          gap: string;
          signal: string;
          wedge: string;
          example_customer: string;
          why_now: string;
          confidence: number;
          builder_count: number;
          is_active: boolean;
          domains: string[];
          market_hint: string | null;
          source_links: SourceLink[];
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          slug: string;
          capability: string;
          gap: string;
          signal: string;
          wedge: string;
          example_customer: string;
          why_now: string;
          confidence: number;
          builder_count?: number;
          is_active?: boolean;
          domains?: string[];
          market_hint?: string | null;
          source_links?: SourceLink[];
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          slug?: string;
          capability?: string;
          gap?: string;
          signal?: string;
          wedge?: string;
          example_customer?: string;
          why_now?: string;
          confidence?: number;
          builder_count?: number;
          is_active?: boolean;
          domains?: string[];
          market_hint?: string | null;
          source_links?: SourceLink[];
        };
      };
      decision_lenses: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          opportunity_id: string;
          answer_1: string | null;
          answer_2: string | null;
          answer_3: string | null;
          answer_4: string | null;
          answer_5: string | null;
          current_step: number;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          opportunity_id: string;
          answer_1?: string | null;
          answer_2?: string | null;
          answer_3?: string | null;
          answer_4?: string | null;
          answer_5?: string | null;
          current_step?: number;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          opportunity_id?: string;
          answer_1?: string | null;
          answer_2?: string | null;
          answer_3?: string | null;
          answer_4?: string | null;
          answer_5?: string | null;
          current_step?: number;
          completed_at?: string | null;
        };
      };
      commitments: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          opportunity_id: string;
          lens_id: string;
          status: CommitmentStatus;
          started_at: string;
          completed_at: string | null;
          abandoned_at: string | null;
          shipped_url: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          opportunity_id: string;
          lens_id: string;
          status?: CommitmentStatus;
          started_at?: string;
          completed_at?: string | null;
          abandoned_at?: string | null;
          shipped_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          opportunity_id?: string;
          lens_id?: string;
          status?: CommitmentStatus;
          started_at?: string;
          completed_at?: string | null;
          abandoned_at?: string | null;
          shipped_url?: string | null;
        };
      };
      checkins: {
        Row: {
          id: string;
          created_at: string;
          commitment_id: string;
          week_number: number;
          shipped_learned: string;
          blockers: string | null;
          next_focus: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          commitment_id: string;
          week_number: number;
          shipped_learned: string;
          blockers?: string | null;
          next_focus: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          commitment_id?: string;
          week_number?: number;
          shipped_learned?: string;
          blockers?: string | null;
          next_focus?: string;
        };
      };
      events: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          event: string;
          properties: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          event: string;
          properties?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          event?: string;
          properties?: Json | null;
        };
      };
      email_events: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          email: string;
          kind: EmailKind;
          status: EmailStatus;
          resend_id: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          email: string;
          kind: EmailKind;
          status: EmailStatus;
          resend_id?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          email?: string;
          kind?: EmailKind;
          status?: EmailStatus;
          resend_id?: string | null;
          metadata?: Json | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Opportunity = Database["public"]["Tables"]["opportunities"]["Row"];
export type DecisionLens = Database["public"]["Tables"]["decision_lenses"]["Row"];
export type Commitment = Database["public"]["Tables"]["commitments"]["Row"];
export type Checkin = Database["public"]["Tables"]["checkins"]["Row"];
export type EmailEvent = Database["public"]["Tables"]["email_events"]["Row"];
