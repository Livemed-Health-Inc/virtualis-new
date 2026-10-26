/* Read-only recommendation preparation. Runtime transport is injectable for
   synthetic unit tests only; the development RPC never invokes inference. */
import { z } from "zod";
import { projectDecision, toDecisionRequest, type Decision } from "../modellab/contract";
import { screenOutbound } from "../modellab/training";

export const consultScopeSchema = z.object({
  facility: z.string().min(1).max(60).regex(/^[a-zA-Z0-9_-]+$/),
}).strict();

export const UNAVAILABLE = {
  status: "unavailable" as const,
  review_required: true as const,
  clinically_validated: false as const,
  reason: "Live model calls are disabled for this development integration.",
};
export type Recommendation = typeof UNAVAILABLE | {
  status: "recommended";
  review_required: true;
  clinically_validated: false;
  decision: Decision;
};
export const DISPLAY_ACUITY = { low: "Green", medium: "Yellow", high: "Red" } as const;

export interface ScopeAccess {
  userId: string | null;
  setupComplete: () => Promise<boolean>;
  assignedFacilities: () => Promise<string[]>;
  hasFacilityAccess: (facility: string) => Promise<boolean>;
}

export async function authorizeConsultScope(access: ScopeAccess, facility: string) {
  if (!access.userId) throw new Error("Unauthorized");
  if (!(await access.setupComplete())) throw new Error("Forbidden");
  const assigned = await access.assignedFacilities();
  if (!assigned.includes(facility) || !(await access.hasFacilityAccess(facility)))
    throw new Error("Forbidden");
  return facility;
}

export async function prepareRecommendation(
  access: ScopeAccess,
  facility: string,
  syntheticText?: string,
  transport?: (body: ReturnType<typeof toDecisionRequest>) => Promise<unknown>,
): Promise<Recommendation> {
  await authorizeConsultScope(access, facility);
  if (!transport) return UNAVAILABLE;
  // Only the fixed synthetic Model Lab contract is supported, never a clinical channel.
  if (!syntheticText || syntheticText.length > 4000 || screenOutbound(syntheticText).length)
    return UNAVAILABLE;
  try {
    const body = toDecisionRequest({
      message_id: "synthetic-consult", text: syntheticText,
      use_case: "specialist_consult", sender_role: "provider", care_setting: "ed",
    });
    return { status: "recommended", decision: projectDecision(await transport(body), syntheticText),
      review_required: true, clinically_validated: false };
  } catch {
    return UNAVAILABLE;
  }
}

// A result never chooses or routes on behalf of the clinician.
export function chooseAfterRecommendation(result: Recommendation | null, choice: "low" | "medium" | "high") {
  if (!result) throw new Error("Recommendation must be attempted before selection");
  return { choice, recommendation: result };
}