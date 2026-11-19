/**
 * Every ai_builds write goes through here, with the privileged server client.
 * Users can only read their own rows (009); they can't insert or update them,
 * so a build's status can only come from this server code.
 *
 * Every query is scoped to the signed-in user's id, which the caller must
 * have taken from supabase.auth.getUser() on the session client, and the
 * database re-checks commitment ownership on insert (009 trigger), because
 * this client bypasses RLS.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiBuildStatus, Database, Json } from "@/types/database";

export type BuildRecord = {
  id: string;
  commitment_id: string;
  user_id: string;
  status: AiBuildStatus;
  deployment_id: string | null;
  deployment_url: string | null;
  project_name: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type BuildPatch = Partial<Pick<BuildRecord, "status" | "deployment_id" | "deployment_url" | "project_name" | "error">>;

export class BuildInsertRefused extends Error {
  constructor(readonly reason: "inflight" | "daily_cap" | "not_owner", message: string) {
    super(message);
  }
}

export interface BuildStore {
  countSince(commitmentId: string, sinceIso: string): Promise<number>;
  latestInflight(commitmentId: string): Promise<BuildRecord | null>;
  insertBuilding(commitmentId: string, buildConfig: Json): Promise<BuildRecord>;
  /**
   * Conditional update: only applies while the row still has `expectStatus`
   * (so two status checks racing can't both move it). Returns the row as the
   * database now has it, or null if no row matched. Throws on a database error.
   */
  update(id: string, patch: BuildPatch, expectStatus: AiBuildStatus): Promise<BuildRecord | null>;
}

const COLUMNS = "id, commitment_id, user_id, status, deployment_id, deployment_url, project_name, error, created_at, updated_at";

export function supabaseBuildStore(admin: SupabaseClient<Database>, userId: string): BuildStore {
  // The generated Database types predate ai_builds' latest shape; keep the
  // cast in one place.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = () => admin.from("ai_builds") as any;
  return {
    async countSince(commitmentId, sinceIso) {
      const { count, error } = await table()
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("commitment_id", commitmentId)
        .gte("created_at", sinceIso);
      if (error) throw new Error(`ai_builds count failed: ${error.message}`);
      return count ?? 0;
    },
    async latestInflight(commitmentId) {
      const { data, error } = await table()
        .select(COLUMNS)
        .eq("user_id", userId)
        .eq("commitment_id", commitmentId)
        .eq("status", "building")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`ai_builds read failed: ${error.message}`);
      return (data as BuildRecord | null) ?? null;
    },
    async insertBuilding(commitmentId, buildConfig) {
      const { data, error } = await table()
        .insert({ commitment_id: commitmentId, user_id: userId, status: "building", build_config: buildConfig })
        .select(COLUMNS)
        .single();
      if (error?.code === "23505") {
        throw new BuildInsertRefused("inflight", "A build is already running for this commitment.");
      }
      if (error?.code === "P0001" && /ai_builds_daily_cap/.test(error.message ?? "")) {
        throw new BuildInsertRefused("daily_cap", "daily cap");
      }
      if (error?.code === "P0001" && /ai_builds_not_owner/.test(error.message ?? "")) {
        throw new BuildInsertRefused("not_owner", "This commitment isn't yours.");
      }
      if (error || !data) throw new Error(`ai_builds insert failed: ${error?.message ?? "no row returned"}`);
      return data as BuildRecord;
    },
    async update(id, patch, expectStatus) {
      const { data, error } = await table()
        .update(patch)
        .eq("id", id)
        .eq("user_id", userId)
        .eq("status", expectStatus)
        .select(COLUMNS)
        .maybeSingle();
      if (error) throw new Error(`ai_builds update failed: ${error.message}`);
      return (data as BuildRecord | null) ?? null;
    },
  };
}
