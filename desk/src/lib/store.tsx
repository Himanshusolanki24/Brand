"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEMO_APPROVER, seedState } from "./seed";
import { analyzeDraft } from "./analyze";
import {
  api,
  clearSession,
  loadSession,
  saveSession,
  snapshotToState,
  type Session,
} from "./api";
import type {
  DemoState,
  Issue,
  Review,
  Role,
} from "./types";

export type DemoAction =
  | { type: "resolve"; reviewId: string; issueId: string; status: "accepted" | "edited"; replacement?: string }
  | { type: "dismiss"; reviewId: string; issueId: string; reason: string }
  | { type: "reopen"; reviewId: string; issueId: string }
  | { type: "ready"; reviewId: string; approver?: string }
  | { type: "sign"; entryId: string; by: string }
  | { type: "return"; entryId: string; note: string; by: string }
  | { type: "analyze"; review: Review }
  | { type: "analysisDone"; reviewId: string; issues: Issue[] }
  | { type: "ratify"; amendmentId: string }
  | { type: "setRole"; role: Role }
  | { type: "__hydrate"; patch: Partial<DemoState> };

function mapIssue(
  state: DemoState,
  reviewId: string,
  issueId: string,
  fn: (issue: Issue) => Issue,
): DemoState {
  return {
    ...state,
    reviews: state.reviews.map((r) =>
      r.id !== reviewId
        ? r
        : { ...r, issues: r.issues.map((i) => (i.id === issueId ? fn(i) : i)) },
    ),
  };
}

function bumpVersion(version: string): string {
  /** "v2.3" → "v2.4-draft" — mirrors the review service's version bump. */
  const n = version.replace(/^v/, "");
  const [major, minor] = n.split(".");
  const next = Number(minor);
  return Number.isFinite(next) ? `v${major}.${next + 1}-draft` : `${version}-draft`;
}

function reducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "resolve":
      return mapIssue(state, action.reviewId, action.issueId, (i) => ({
        ...i,
        status: action.status,
        replacement: action.replacement,
      }));
    case "dismiss":
      return mapIssue(state, action.reviewId, action.issueId, (i) => ({
        ...i,
        status: "dismissed",
        reason: action.reason,
      }));
    case "reopen":
      return mapIssue(state, action.reviewId, action.issueId, (i) => ({
        ...i,
        status: "open",
        reason: undefined,
        replacement: undefined,
      }));
    case "ready":
      return {
        ...state,
        reviews: state.reviews.map((r) =>
          r.id === action.reviewId
            ? { ...r, status: "ready_for_approval" }
            : r,
        ),
        approvals: [
          ...state.approvals.filter((a) => a.reviewId !== action.reviewId),
          {
            id: `apr-${action.reviewId}`,
            reviewId: action.reviewId,
            // Product mode: the review service assigns the approver and the
            // desk re-hydrates — this value is never rendered there. Demo
            // mode: the sample desk's dedicated approver (mirrors the
            // service's dedicated-approver-first assignment rule).
            approver: action.approver ?? DEMO_APPROVER,
            state: "waiting",
          },
        ],
      };
    case "sign": {
      const entry = state.approvals.find((a) => a.id === action.entryId);
      if (!entry) return state;
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.entryId
            ? { ...a, state: "signed", signedAt: Date.now(), note: undefined }
            : a,
        ),
        reviews: state.reviews.map((r) =>
          r.id === entry.reviewId ? { ...r, status: "approved" } : r,
        ),
      };
    }
    case "return": {
      const entry = state.approvals.find((a) => a.id === action.entryId);
      if (!entry) return state;
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.entryId ? { ...a, state: "returned", note: action.note } : a,
        ),
        reviews: state.reviews.map((r) =>
          r.id === entry.reviewId
            ? {
                ...r,
                status: "changes_requested",
                returnedBy: action.by,
                approverNote: action.note,
              }
            : r,
        ),
      };
    }
    case "analyze":
      return {
        ...state,
        reviews: [action.review, ...state.reviews],
      };
    case "analysisDone":
      return {
        ...state,
        reviews: state.reviews.map((r) =>
          r.id === action.reviewId
            ? { ...r, issues: action.issues, status: "in_review" }
            : r,
        ),
      };
    case "ratify": {
      const amp = state.amendments.find((a) => a.id === action.amendmentId);
      if (!amp) return state;
      // Same change the review service's ratify makes on real data: append
      // the draft language to the clause, lift that clause's clarity by 10
      // capped at 95, and cut a -draft display version. Radar scores are
      // engine-measured data — the desk never invents their movement.
      return {
        ...state,
        amendments: state.amendments.map((a) =>
          a.id === action.amendmentId ? { ...a, state: "ratified" } : a,
        ),
        guidelines: state.guidelines.map((g) =>
          g.number === amp.clause
            ? {
                ...g,
                text: `${g.text} ${amp.draft.replace(/^Add to §[^\s]+: /, "")}`.trim(),
                clarity: g.clarity === null ? null : Math.min(95, g.clarity + 10),
              }
            : g,
        ),
        guidelineVersion: state.guidelineVersion.endsWith("draft")
          ? state.guidelineVersion
          : bumpVersion(state.guidelineVersion),
      };
    }
    case "setRole":
      return { ...state, role: action.role };
    case "__hydrate":
      return { ...state, ...action.patch };
    default:
      return state;
  }
}

interface DemoContextValue {
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
  /** null ⇒ demo lane; set ⇒ every action is a governed engine call. */
  session: Session | null;
  busy: boolean;
  engineError: string | null;
  connect: (email: string) => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => void;
  refresh: () => Promise<void>;
  dismissError: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatchRaw] = useReducer(reducer, undefined, seedState);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const refresh = useCallback(async (token?: string) => {
    const t = token ?? tokenRef.current;
    if (!t) return;
    try {
      const snapshot = await api.workspace(t);
      dispatchRaw({ type: "__hydrate", patch: snapshotToState(snapshot) });
      setEngineError(null);
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : "Engine unreachable.");
    }
  }, []);

  // Rehydrate on first mount — a real token upgrades the desk to product mode.
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return;
    tokenRef.current = saved.token;
    setSession({ token: saved.token, user: { id: "", email: "", name: "", role: "creator", orgId: "" } });
    setBusy(true);
    void (async () => {
      try {
        const snapshot = await api.workspace(saved.token);
        dispatchRaw({ type: "__hydrate", patch: snapshotToState(snapshot) });
        tokenRef.current = saved.token;
        setSession({ token: saved.token, user: snapshot.user });
      } catch {
        clearSession();
        tokenRef.current = null;
        setSession(null);
        setEngineError("Could not reach the engine — showing the demo workspace.");
      } finally {
        setBusy(false);
      }
    })();
  }, []);

  const connect = useCallback(async (email: string) => {
    try {
      const s = await api.login(email);
      saveSession(s);
      tokenRef.current = s.token;
      setSession(s);
      setBusy(true);
      try {
        await refresh(s.token);
      } finally {
        setBusy(false);
      }
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Engine unreachable.";
      return { ok: false, error: message };
    }
  }, [refresh]);

  const disconnect = useCallback(() => {
    clearSession();
    tokenRef.current = null;
    setSession(null);
    setEngineError(null);
  }, []);

  const dispatch = useCallback((action: DemoAction) => {
    // Product mode: mutating actions hit the governed engine, then the whole
    // desk re-hydrates from the authoritative snapshot. In demo mode the
    // reducer stays the whole story.
    void (async () => {
      if (action.type === "__hydrate") return;
      if (!tokenRef.current) {
        dispatchRaw(action);
        // Demo lane only: the analyzing pass is real work here — the runner
        // computes the findings, and the desk settles them once the four
        // steps have read out. The timer lives in the provider, so
        // navigating away from the intake screen cannot cancel it.
        if (action.type === "analyze" && action.review.status === "analyzing") {
          const reviewId = action.review.id;
          const issues = analyzeDraft(action.review.sections[0]?.body ?? "");
          window.setTimeout(() => {
            // If an engine session takes over mid-run, the reducer no-ops on
            // the unknown id — nothing is fabricated either way.
            dispatchRaw({ type: "analysisDone", reviewId, issues });
          }, 2800);
        }
        return;
      }
      const t = tokenRef.current;
      setBusy(true);
      let failed = false;
      try {
        switch (action.type) {
          case "analyze":
            dispatchRaw(action); // the real review arrived in the intake screen
            break;
          case "resolve":
            await api.resolveIssue(t, action.reviewId, action.issueId, action.status, action.replacement);
            break;
          case "dismiss":
            await api.dismissIssue(t, action.reviewId, action.issueId, action.reason);
            break;
          case "reopen":
            await api.reopenIssue(t, action.reviewId, action.issueId);
            break;
          case "ready":
            await api.sendForApproval(t, action.reviewId);
            break;
          case "sign":
            await api.signApproval(t, action.entryId);
            break;
          case "return":
            await api.returnApproval(t, action.entryId, action.note);
            break;
          case "ratify":
            await api.ratify(t, action.amendmentId);
            break;
          default:
            // analysisDone & setRole are demo-only; the engine has nothing for them.
            break;
        }
      } catch (err) {
        failed = true;
        setEngineError(err instanceof Error ? err.message : "Engine call failed.");
        return;
      } finally {
        setBusy(false);
        // On success only — a failed call's message must survive.
        if (tokenRef.current && !failed) await refresh(t);
      }
    })();
  }, [refresh]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      session: session?.user.email ? session : null,
      busy,
      engineError,
      connect,
      disconnect,
      refresh: () => refresh(),
      dismissError: () => setEngineError(null),
    }),
    [state, dispatch, session, busy, engineError, connect, disconnect, refresh],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}

export function unresolved(review: Review): Issue[] {
  return review.issues.filter((i) => i.status === "open");
}

export function bySeverity(issues: Issue[]): Issue[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...issues].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export function fmtDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}
