import type {
  CoreCommitment,
  CoreCommitInput,
  OnecoreState,
  Race,
  RaceDraft,
  RaceEventLog,
  RaceStatus,
} from "./types";

const TERMINAL: RaceStatus[] = ["failed", "cancelled", "refunded", "ticketing_ready"];

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEventLog(
  raceId: string,
  changedBy: string,
  fromStatus: RaceStatus,
  toStatus: RaceStatus,
  reason: string,
  visibleToPublic = true
): RaceEventLog {
  return {
    id: newId("log"),
    raceId,
    changedBy,
    fromStatus,
    toStatus,
    reason,
    timestamp: nowIso(),
    visibleToPublic,
  };
}

/** 관리자 상태 변경 — 반드시 로그 */
export function applyRaceStatusChange(
  state: OnecoreState,
  raceId: string,
  toStatus: RaceStatus,
  changedBy: string,
  reason: string,
  opts?: { visibleToPublic?: boolean; failureKind?: Race["failureKind"]; failureMessage?: string }
): OnecoreState {
  const race = state.races.find((r) => r.id === raceId);
  if (!race || race.status === toStatus) return state;

  const log = createEventLog(raceId, changedBy, race.status, toStatus, reason, opts?.visibleToPublic ?? true);

  const races = state.races.map((r) =>
    r.id === raceId
      ? {
          ...r,
          status: toStatus,
          failureKind: opts?.failureKind ?? r.failureKind,
          failureMessage: opts?.failureMessage ?? r.failureMessage,
          showPreparationStatus:
            toStatus === "show_preparation" ||
            toStatus === "artist_contacting" ||
            toStatus === "venue_matching" ||
            toStatus === "confirming_terms"
              ? "in_progress"
              : toStatus === "ticketing_ready"
                ? "complete"
                : r.showPreparationStatus,
          artistConfirmationStatus:
            toStatus === "artist_confirmed" ? "confirmed" : r.artistConfirmationStatus,
          venueConfirmationStatus:
            toStatus === "venue_confirmed" ? "confirmed" : r.venueConfirmationStatus,
        }
      : r
  );

  return { ...state, races, eventLogs: [log, ...state.eventLogs] };
}

/** 목표 달성 시 preparation으로 (두 단계 로그) */
export function applyTargetReached(state: OnecoreState, raceId: string): OnecoreState {
  let next = applyRaceStatusChange(state, raceId, "target_reached", "system", "목표 core 인원 달성", {
    visibleToPublic: true,
  });
  next = applyRaceStatusChange(next, raceId, "show_preparation", "system", "공연 준비 단계로 전환", {
    visibleToPublic: true,
  });
  return next;
}

export function commitCore(
  state: OnecoreState,
  raceId: string,
  userId: string,
  input: CoreCommitInput
): { state: OnecoreState; error?: string } {
  const race = state.races.find((r) => r.id === raceId);
  if (!race) return { state, error: "라운드를 찾을 수 없습니다." };
  if (race.status !== "active") return { state, error: "지금은 core 참여를 받지 않습니다." };
  if (race.currentCount >= race.targetCount) return { state, error: "목표 인원에 이미 도달했습니다." };

  if (state.commitments.some((c) => c.raceId === raceId && c.userId === userId)) {
    return { state, error: "이미 이 라운드에 참여했습니다." };
  }

  const commitment: CoreCommitment = {
    id: newId("core"),
    raceId,
    userId,
    amount: race.depositAmount,
    createdAt: nowIso(),
    displayConsent: input.displayConsent,
    isAnonymous: input.isAnonymous,
    displayName: input.displayConsent && !input.isAnonymous ? input.displayName : undefined,
  };

  const paymentIntent = {
    id: newId("pay"),
    raceId,
    userId,
    amount: race.depositAmount,
    currency: "KRW" as const,
    status: "held" as const,
    createdAt: nowIso(),
  };

  const newCount = race.currentCount + 1;
  let races = state.races.map((r) => (r.id === raceId ? { ...r, currentCount: newCount } : r));

  let next: OnecoreState = {
    ...state,
    races,
    commitments: [commitment, ...state.commitments],
    paymentIntents: [paymentIntent, ...state.paymentIntents],
  };

  if (newCount >= race.targetCount) {
    next = { ...next, races: next.races.map((r) => (r.id === raceId ? { ...r, currentCount: newCount } : r)) };
    next = applyTargetReached(next, raceId);
  }

  return { state: next };
}

export function createRaceFromDraft(
  state: OnecoreState,
  draft: RaceDraft,
  adminId: string,
  publishAsActive: boolean
): OnecoreState {
  const id = newId("race");
  const race: Race = {
    id,
    title: draft.title,
    artistId: draft.artistId,
    proposalReason: draft.proposalReason,
    targetCount: draft.targetCount,
    currentCount: 0,
    deadline: draft.deadline,
    deadlineCountdown: { days: 7, hours: 0, minutes: 0 },
    status: publishAsActive ? "active" : "draft",
    paymentType: draft.paymentType,
    depositAmount: draft.depositAmount,
    refundPolicyId: draft.refundPolicyId,
    preferredDate: draft.preferredDate,
    backupDates: draft.backupDates,
    venueCandidateIds: draft.venueCandidateIds,
    artistConfirmationStatus: "pending",
    venueConfirmationStatus: "pending",
    showPreparationStatus: "not_started",
  };

  const log = createEventLog(
    id,
    adminId,
    "draft",
    publishAsActive ? "active" : "draft",
    publishAsActive ? "라운드 게시" : "라운드 초안 생성"
  );

  return {
    ...state,
    races: [race, ...state.races],
    eventLogs: [log, ...state.eventLogs],
  };
}

export function updateRaceDraft(state: OnecoreState, raceId: string, draft: Partial<RaceDraft>, adminId: string): OnecoreState {
  const race = state.races.find((r) => r.id === raceId);
  if (!race) return state;

  const races = state.races.map((r) =>
    r.id === raceId
      ? {
          ...r,
          ...draft,
          targetCount: draft.targetCount ?? r.targetCount,
        }
      : r
  );

  const log = createEventLog(raceId, adminId, race.status, race.status, "라운드 정보 수정", false);

  return { ...state, races, eventLogs: [log, ...state.eventLogs] };
}

export function getPublicFoundingFans(state: OnecoreState, raceId: string): string[] {
  return state.commitments
    .filter((c) => c.raceId === raceId && c.displayConsent)
    .map((c) => {
      if (c.isAnonymous) return "익명 팬";
      return c.displayName ?? state.users.find((u) => u.id === c.userId)?.displayName ?? "팬";
    });
}

export function raceById(state: OnecoreState, id: string) {
  return state.races.find((r) => r.id === id);
}

export function artistById(state: OnecoreState, id: string) {
  return state.artists.find((a) => a.id === id);
}

export function refundPolicyById(state: OnecoreState, id: string) {
  return state.refundPolicies.find((p) => p.id === id);
}

export function publicLogsForRace(state: OnecoreState, raceId: string) {
  return state.eventLogs.filter((l) => l.raceId === raceId && l.visibleToPublic);
}

export function allStatuses(): RaceStatus[] {
  return [
    "draft",
    "active",
    "target_reached",
    "admin_review",
    "show_preparation",
    "artist_contacting",
    "venue_matching",
    "confirming_terms",
    "artist_confirmed",
    "venue_confirmed",
    "date_confirmed",
    "ticketing_ready",
    "failed",
    "cancelled",
    "refunded",
  ];
}

export function canFanCommit(race: Race) {
  return race.status === "active" && race.currentCount < race.targetCount;
}

export function isTerminalStatus(status: RaceStatus) {
  return TERMINAL.includes(status) || status === "failed" || status === "cancelled" || status === "refunded";
}
