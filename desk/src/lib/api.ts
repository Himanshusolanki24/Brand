/**
 * Engine client — the desk talks to the BrandProof governance engine
 * (FastAPI, default http://localhost:8900) when a real sign-in succeeds.
 *
 * Every response is a plain camelCase JSON matching src/lib/types.ts, so
 * hydration is a straight cast — there is no second schema to keep in sync.
 */

import type {
  ApprovalEntry,
  Amendment,
  Channel,
  Issue,
  Review,
  Role,
  TrustGraphResponse,
} from "./types";
import type { DemoState } from "./types";

export const ENGINE_URL =
  process.env.NEXT_PUBLIC_ENGINE_URL?.replace(/\/$/, "") || "http://localhost:8900";

export interface EngineUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  orgId: string;
}

export interface WorkspaceResponse {
  user: EngineUser;
  brand: string;
  guidelineVersion: string;
  reviews: Review[];
  guidelines: DemoState["guidelines"];
  facts: DemoState["facts"];
  terms: DemoState["terms"];
  assets: DemoState["assets"];
  approvals: ApprovalEntry[];
  amendments: Amendment[];
  radar: DemoState["radar"];
  engineInfo: Record<string, unknown>;
}

export interface LoginResponse {
  token: string;
  user: EngineUser;
}

/** POST /reviews/checks/preview — isolated dry run; nothing persists. */
export interface ChecksPreviewResponse {
  issues: Issue[];
}

/** Signed-in identity for the product lane. */
export interface Session {
  token: string;
  user: EngineUser;
}

export class EngineError extends Error {
  status: number;
  code: string;
  message_: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.message_ = message;
  }
}

async function request<T>(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ENGINE_URL}/api${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new EngineError(0, "engine.unreachable", "The engine is unreachable.");
  }
  if (res.status === 204) return undefined as T;
  const raw = await res.text();
  let body: unknown = null;
  try {
    body = raw.length > 0 ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    // problem+json — error detail can be a string or a structured object.
    let code = "engine.error";
    let message = "The engine could not complete that request.";
    const detail = (body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string" && detail.length > 0) {
      message = detail;
    } else if (detail && typeof detail === "object") {
      const d = detail as Record<string, unknown>;
      code = String(d.error_code ?? code);
      message = String(d.message ?? message);
    }
    throw new EngineError(res.status, code, message);
  }
  return body as T;
}

export const api = {
  /** POST /auth/login — null role claim: the row's role is authoritative. */
  async login(email: string): Promise<Session> {
    const data = await request<LoginResponse>("/auth/login", null, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    return { token: data.token, user: data.user };
  },

  /** GET /workspace — the full hydration snapshot. */
  workspace(token: string): Promise<WorkspaceResponse> {
    return request<WorkspaceResponse>("/workspace", token);
  },

  /** POST /reviews/analyze — submit a draft; persists a real review. */
  analyze(
    token: string,
    payload: { title: string; channel: Channel; sections: Array<{ heading: string; body: string }> },
  ): Promise<Review> {
    return request<Review>(`/reviews/analyze`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  resolveIssue(
    token: string,
    reviewId: string,
    issueId: string,
    status: "accepted" | "edited",
    replacement?: string,
  ): Promise<Review> {
    return request<Review>(`/reviews/${reviewId}/issues/${issueId}/resolve`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, replacement: replacement ?? null }),
    });
  },

  dismissIssue(
    token: string,
    reviewId: string,
    issueId: string,
    reason: string,
  ): Promise<Review> {
    return request<Review>(`/reviews/${reviewId}/issues/${issueId}/dismiss`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
  },

  reopenIssue(token: string, reviewId: string, issueId: string): Promise<Review> {
    return request<Review>(`/reviews/${reviewId}/issues/${issueId}/reopen`, token, {
      method: "POST",
    });
  },

  sendForApproval(token: string, reviewId: string): Promise<Review> {
    return request<Review>(`/reviews/${reviewId}/send-for-approval`, token, {
      method: "POST",
    });
  },

  signApproval(token: string, approvalId: string): Promise<ApprovalEntry> {
    return request<ApprovalEntry>(`/approvals/${approvalId}/sign`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "" }),
    });
  },

  returnApproval(token: string, approvalId: string, note: string): Promise<ApprovalEntry> {
    return request<ApprovalEntry>(`/approvals/${approvalId}/return`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
  },

  ratify(token: string, amendmentId: string): Promise<Amendment> {
    return request<Amendment>(`/proposals/${amendmentId}/ratify`, token, {
      method: "POST",
    });
  },

  /** GET /trust — the traceability graph every signed-in role may read. */
  trust(token: string): Promise<TrustGraphResponse> {
    return request<TrustGraphResponse>("/trust", token);
  },

  /** GET /proposals — the learning-proposal queue (read-only list here). */
  proposals(token: string): Promise<Amendment[]> {
    return request<Amendment[]>("/proposals", token);
  },

  /**
   * POST /reviews/checks/preview — a quarantined recheck of flat text against
   * the review service's CURRENT guideline version. Nothing persists, and the
   * findings match an existing issue only by (citation.clause, quote) — never
   * by preview ids.
   */
  checksPreview(token: string, text: string): Promise<ChecksPreviewResponse> {
    return request<ChecksPreviewResponse>("/reviews/checks/preview", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  },

  /** Download the signed approval's deterministic manifest PDF. */
  async manifestPdf(token: string, approvalId: string): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${ENGINE_URL}/api/approvals/${approvalId}/manifest.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      throw new EngineError(0, "engine.unreachable", "The engine is unreachable.");
    }
    if (!res.ok) {
      throw new EngineError(res.status, "manifest.error", "The manifest could not be exported.");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${approvalId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

/**
 * Hydrate a DemoState from the engine's workspace snapshot. Strict: every
 * field comes from the snapshot — no seed data survives underneath a live
 * desk, and anything the engine did not send simply stays absent.
 */
export function snapshotToState(snapshot: WorkspaceResponse): DemoState {
  return {
    role: snapshot.user.role,
    reviews: snapshot.reviews,
    guidelines: snapshot.guidelines,
    guidelineVersion: snapshot.guidelineVersion,
    facts: snapshot.facts,
    terms: snapshot.terms,
    assets: snapshot.assets,
    approvals: snapshot.approvals,
    amendments: snapshot.amendments,
    radar: snapshot.radar,
  };
}

/** LocalStorage keys — no persistence library for one token + one flag. */
export const TOKEN_KEY = "brandproof.token";
export const MODE_KEY = "brandproof.mode";

export function loadSession(): { token: string; mode: "product" } | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  return { token, mode: "product" };
}

export function saveSession(session: Session): void {
  window.localStorage.setItem(TOKEN_KEY, session.token);
  window.localStorage.setItem(MODE_KEY, "product");
}

export function clearSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(MODE_KEY);
}
