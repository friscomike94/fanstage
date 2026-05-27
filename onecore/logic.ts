import type {
  ArtistInviteDraft,
  CoreCommitment,
  CoreCommitInput,
  DemandScoutCampaign,
  OnecoreState,
  Race,
  RaceAdminPhase,
  RaceDraft,
  RaceEventLog,
  RaceOperations,
  RaceStatus,
  ScoutCampaignDraft,
} from "./types";

const TERMINAL: RaceStatus[] = ["failed", "cancelled", "refunded", "ticketing_ready"];

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function mapStatusToAdminPhase(status: RaceStatus): RaceAdminPhase {
  if (status === "active" || status === "draft") return "collecting_demand";
  if (status === "target_reached" || status === "admin_review" || status === "show_preparation") return "demand_proven";
  if (status === "artist_contacting") return "artist_contacting";
  if (status === "artist_reviewing_invite") return "artist_reviewing_invite";
  if (status === "venue_matching" || status === "artist_confirmed" || status === "venue_confirmed") return "venue_matching";
  if (status === "confirming_terms" || status === "date_confirmed") return "confirming_terms";
  if (status === "ticketing_ready") return "ticketing_ready";
  if (status === "failed" || status === "cancelled" || status === "refunded") return "refund_or_alternative_review";
  return "collecting_demand";
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

  const races = state.races.map((r) => {
    if (r.id !== raceId) return r;
    const next = {
      ...r,
      status: toStatus,
      adminPhase: mapStatusToAdminPhase(toStatus),
      failureKind: opts?.failureKind ?? r.failureKind,
      failureMessage: opts?.failureMessage ?? r.failureMessage,
      showPreparationStatus:
        toStatus === "show_preparation" ||
        toStatus === "artist_contacting" ||
        toStatus === "artist_reviewing_invite" ||
        toStatus === "venue_matching" ||
        toStatus === "confirming_terms"
          ? "in_progress"
          : toStatus === "ticketing_ready"
            ? "complete"
            : r.showPreparationStatus,
      artistConfirmationStatus: toStatus === "artist_confirmed" ? "confirmed" : r.artistConfirmationStatus,
      venueConfirmationStatus: toStatus === "venue_confirmed" ? "confirmed" : r.venueConfirmationStatus,
    };
    if (toStatus === "artist_reviewing_invite" && !next.artistInviteToken) {
      next.artistInviteToken = newId("inv");
      next.artistInviteSentAt = nowIso();
    }
    return next;
  });

  return { ...state, races, eventLogs: [log, ...state.eventLogs] };
}

/** 100 cores: demand proven → fanstage starts private artist outreach */
export function applyTargetReached(state: OnecoreState, raceId: string): OnecoreState {
  let next = applyRaceStatusChange(state, raceId, "target_reached", "system", "100 core · 수요 증명", {
    visibleToPublic: true,
  });
  next = applyRaceStatusChange(next, raceId, "artist_contacting", "system", "비공개 아티스트 연락 시작", {
    visibleToPublic: true,
  });
  return next;
}

export function sendArtistPrivateInvite(state: OnecoreState, raceId: string, adminId: string): OnecoreState {
  const race = state.races.find((r) => r.id === raceId);
  if (!race) return state;
  const shortlist =
    race.shortlistedVenueIds && race.shortlistedVenueIds.length > 0
      ? race.shortlistedVenueIds
      : race.venueCandidateIds.slice(0, 3);
  const races = state.races.map((r) =>
    r.id === raceId ? { ...r, shortlistedVenueIds: shortlist, artistInviteToken: r.artistInviteToken ?? newId("inv") } : r
  );
  return applyRaceStatusChange({ ...state, races }, raceId, "artist_reviewing_invite", adminId, "비공개 초대장 발송", {
    visibleToPublic: true,
  });
}

export function submitArtistInvite(
  state: OnecoreState,
  raceId: string,
  token: string,
  draft: ArtistInviteDraft
): { state: OnecoreState; error?: string } {
  const race = state.races.find((r) => r.id === raceId);
  if (!race) return { state, error: "초대를 찾을 수 없습니다." };
  if (race.artistInviteToken && race.artistInviteToken !== token) {
    return { state, error: "유효하지 않은 초대 링크입니다." };
  }
  const submission = { ...draft, submittedAt: nowIso() };
  const races = state.races.map((r) =>
    r.id === raceId
      ? {
          ...r,
          artistInvite: submission,
          artistConfirmationStatus:
            draft.response === "interested"
              ? ("confirmed" as const)
              : draft.response === "not_available"
                ? ("unavailable" as const)
                : r.artistConfirmationStatus,
        }
      : r
  );
  const log = createEventLog(
    raceId,
    `artist:${race.artistId}`,
    race.status,
    race.status,
    `아티스트 응답: ${draft.response}`,
    false
  );
  return { state: { ...state, races, eventLogs: [log, ...state.eventLogs] } };
}

export function createScoutCampaign(
  state: OnecoreState,
  scoutId: string,
  draft: ScoutCampaignDraft
): OnecoreState {
  const campaign: DemandScoutCampaign = {
    id: newId("scout"),
    scoutId,
    artistId: draft.artistId,
    targetCity: draft.targetCity,
    whyNow: draft.whyNow,
    estimatedDemand: draft.estimatedDemand,
    venueSuggestions: draft.venueSuggestions,
    rallyCopy: draft.rallyCopy,
    scoutConfidence: draft.scoutConfidence,
    handoffState: draft.handoffState ?? "draft",
    raceId: draft.raceId,
    createdAt: nowIso(),
  };
  return { ...state, scoutCampaigns: [campaign, ...state.scoutCampaigns] };
}

export function handoffScoutToAdmin(state: OnecoreState, campaignId: string, adminId: string): OnecoreState {
  const campaign = state.scoutCampaigns.find((c) => c.id === campaignId);
  if (!campaign) return state;
  const scoutCampaigns = state.scoutCampaigns.map((c) =>
    c.id === campaignId ? { ...c, handoffState: "handed_off" as const } : c
  );
  if (campaign.raceId) {
    const log = createEventLog(
      campaign.raceId,
      adminId,
      "active",
      "active",
      `스카우트 handoff: ${campaign.targetCity}`,
      false
    );
    return { ...state, scoutCampaigns, eventLogs: [log, ...state.eventLogs] };
  }
  return { ...state, scoutCampaigns };
}

export function backerCount(state: OnecoreState, raceId: string) {
  return state.commitments.filter((c) => c.raceId === raceId).length;
}

export function inviteVenuesForRace(state: OnecoreState, race: Race) {
  const ids = race.shortlistedVenueIds?.length ? race.shortlistedVenueIds : race.venueCandidateIds.slice(0, 3);
  return state.venueCandidates.filter((v) => ids.includes(v.id));
}

export function estimateEconomics(venues: { capacity: number; estimatedTicketMin?: number; estimatedTicketMax?: number }[]) {
  if (venues.length === 0) return null;
  const cap = venues[0].capacity;
  const minT = venues[0].estimatedTicketMin ?? 30000;
  const maxT = venues[0].estimatedTicketMax ?? 55000;
  const grossLow = Math.round(cap * 0.55 * minT);
  const grossHigh = Math.round(cap * 0.85 * maxT);
  const netLow = Math.round(grossLow * 0.62);
  const netHigh = Math.round(grossHigh * 0.68);
  return { capacity: cap, ticketMin: minT, ticketMax: maxT, grossLow, grossHigh, netLow, netHigh };
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
  const status = publishAsActive ? "active" : "draft";
  const race: Race = {
    id,
    title: draft.title,
    artistId: draft.artistId,
    targetCity: draft.targetCity || "서울",
    adminPhase: mapStatusToAdminPhase(status),
    proposalReason: draft.proposalReason,
    targetCount: draft.targetCount,
    currentCount: 0,
    deadline: draft.deadline,
    deadlineCountdown: { days: 7, hours: 0, minutes: 0 },
    status,
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

export function updateRaceOperations(
  state: OnecoreState,
  raceId: string,
  operations: Partial<RaceOperations>,
  adminId: string
): OnecoreState {
  const race = state.races.find((r) => r.id === raceId);
  if (!race) return state;

  const races = state.races.map((r) =>
    r.id === raceId
      ? {
          ...r,
          ...operations,
          shortlistedVenueIds: operations.shortlistedVenueIds ?? r.shortlistedVenueIds,
        }
      : r
  );
  const log = createEventLog(raceId, adminId, race.status, race.status, "운영 플로우 업데이트", false);

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
    "artist_reviewing_invite",
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
