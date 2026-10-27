"use client";

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { seedState } from "./seed";
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
  | { type: "ready"; reviewId: string }
  | { type: "sign"; entryId: string; by: string }
  | { type: "return"; entryId: string; note: string; by: string }
  | { type: "analyze"; review: Review }
  | { type: "analysisDone"; reviewId: string; issues: Issue[] }
  | { type: "ratify"; amendmentId: string }
  | { type: "setRole"; role: Role };

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
            approver: "Maya Okafor",
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
      return {
        ...state,
        amendments: state.amendments.map((a) =>
          a.id === action.amendmentId ? { ...a, state: "ratified" } : a,
        ),
        guidelines: state.guidelines.map((g) =>
          g.number === amp.clause ? { ...g, text: amp.draft.replace(/^Add to §[^\s]+: /, "") , clarity: (g.clarity ?? 40) + 10 } : g,
        ),
        guidelineVersion: state.guidelineVersion === "v2.3" ? "v2.4-draft" : state.guidelineVersion,
        radar: state.radar.map((r) => ({ ...r, score: Math.min(95, r.score + 5) })),
      };
    }
    case "setRole":
      return { ...state, role: action.role };
    default:
      return state;
  }
}

const DemoContext = createContext<{ state: DemoState; dispatch: React.Dispatch<DemoAction> } | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
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
