import type { FailureKind, OnecoreFanPhase, Race, RaceAdminPhase, RaceStatus } from "./types";
import { mapStatusToAdminPhase, resolveOnecoreFanPhase } from "./logic";

/** 목표 달성 전 — 확정적 표현 금지 */
export const ONECORE_THRESHOLD_NOTE =
  "100코어는 공연을 열기 위한 최소 수요입니다. 실제 좌석 수는 공연장 확정 후 정해져요.";

/** Collecting / pre-venue fan copy — no venue, capacity, or neighborhood */
export const ONECORE_COLLECTING_THRESHOLD_NOTE =
  "100코어는 공연을 열기 위한 최소 수요입니다. 아티스트와 공연장은 수요 증명 후 연결됩니다.";

export function isPreVenueFanPhase(phase: OnecoreFanPhase): boolean {
  return phase === "collecting_core" || phase === "threshold_reached" || phase === "artist_accepted";
}

export function fanCampaignCardMeta(artistName: string, genre: string, phase: OnecoreFanPhase): string {
  return `${artistName} · ${genre} · ${fanPhaseLabel(phase)}`;
}

/** Prefer race fan copy over battle pitch before venue is assigned. */
export function resolveFanCampaignPitch(
  race: Race,
  artist: { battlePitch?: string; tagline?: string },
  variant: OnecoreCardVariant
): string | undefined {
  if (variant === "ticket") return undefined;
  if (variant === "collecting" || variant === "reviewing") {
    return race.fanPitch ?? race.proposalReason ?? artist.tagline;
  }
  return artist.battlePitch ?? race.proposalReason;
}

export function thresholdNoteForPhase(phase: OnecoreFanPhase): string {
  if (phase === "collecting_core") return ONECORE_COLLECTING_THRESHOLD_NOTE;
  if (isPreVenueFanPhase(phase)) return ONECORE_COLLECTING_THRESHOLD_NOTE;
  return ONECORE_THRESHOLD_NOTE;
}

export function fanPhaseLabel(phase: OnecoreFanPhase): string {
  const map: Record<OnecoreFanPhase, string> = {
    collecting_core: "모집 중",
    threshold_reached: "아티스트 초대 검토 중",
    artist_accepted: "아티스트 수락",
    venue_assigned: "베뉴 확정",
    ticket_open: "티켓 추가 오픈",
  };
  return map[phase];
}

export type OnecoreCardVariant = "collecting" | "reviewing" | "ticket";

export function resolveOnecoreCardVariant(phase: OnecoreFanPhase): OnecoreCardVariant {
  if (phase === "collecting_core") return "collecting";
  if (phase === "ticket_open") return "ticket";
  return "reviewing";
}

/** One hero line per discover card — no duplicate 100/100 on reviewing/ticket */
export function fanPhaseCardHero(phase: OnecoreFanPhase, race: Race, remainingTickets = 0): string {
  if (phase === "collecting_core") return `${race.currentCount} / ${race.targetCount} core`;
  if (phase === "ticket_open") return `추가 티켓 ${remainingTickets}장 오픈`;
  if (phase === "artist_accepted") return "베뉴 매칭 중";
  if (phase === "venue_assigned") return "티켓 오픈 준비 중";
  return "아티스트 초대장 검토 중";
}

export function fanPhaseReviewingBullets(): readonly string[] {
  return [
    "최소 수요가 증명됐어요",
    "아직 티켓 판매 단계는 아니에요",
    "아티스트 수락 후 베뉴 매칭으로 넘어갑니다",
  ];
}

export function formatCollectingDeadlineLine(race: Race): string {
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  return `${formatCountdown(race.deadlineCountdown)} · ${remaining}코어 남음`;
}

export function fanPhaseSubline(phase: OnecoreFanPhase, race: Race): string {
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  switch (phase) {
    case "collecting_core":
      return `${remaining}코어 더 모이면 아티스트 초대 단계로 넘어갑니다`;
    case "threshold_reached":
      return "fanstage가 아티스트와 공연 조건을 확인합니다";
    case "artist_accepted":
      return "아티스트 수락 후 공연장 매칭이 진행됩니다.";
    case "venue_assigned":
      return "공연장이 정해졌어요. 티켓 오픈을 준비 중입니다.";
    case "ticket_open":
      return "100코어는 공연을 여는 최소 수요였고, 남은 좌석은 베뉴 확정 후 추가로 열립니다.";
    default:
      return ONECORE_THRESHOLD_NOTE;
  }
}

export function raceProgressHeadline(race: Race): string {
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  if (remaining > 0) {
    return `${remaining}코어 더 모이면 아티스트 초대 단계로 넘어갑니다`;
  }
  return fanStatusHeadline(race);
}

export function raceProgressSubline(race: Race): string {
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  if (remaining > 0) {
    return "지금은 core로 수요를 모으는 중이에요. 공연은 아직 확정되지 않았습니다.";
  }
  return fanStatusSubline(race);
}

/** 팬에게만 보이는 상태 문구 — 협상·수수료 노출 없음 */
export function fanStatusHeadline(race: Race): string {
  const fanPhase = resolveOnecoreFanPhase(race);
  if (fanPhase === "ticket_open") return "아티스트 수락 · 베뉴 확정";
  if (fanPhase === "threshold_reached") return "아티스트가 초대장을 검토 중이에요";
  if (fanPhase === "collecting_core") return "모집 중";
  const phase = race.adminPhase ?? mapStatusToAdminPhase(race.status);
  if (phase === "demand_proven" || race.status === "target_reached") return "아티스트 초대 검토 중";
  if (phase === "artist_contacting") return "아티스트에게 비공개 초대장을 보냈어요";
  if (phase === "artist_reviewing_invite") return "아티스트가 초대장을 검토 중이에요";
  if (phase === "venue_matching") return "공연장 후보를 검토 중이에요";
  if (phase === "confirming_terms") return "조건을 확인 중이에요";
  if (phase === "ticketing_ready") return "아티스트 수락 · 베뉴 확정";
  if (phase === "refund_or_alternative_review") return "환불 또는 대안 검토 중이에요";
  return "목표 인원에 도달했습니다";
}

export function fanStatusSubline(race: Race): string {
  const phase = race.adminPhase ?? mapStatusToAdminPhase(race.status);
  if (phase === "collecting_demand") return "100코어가 모이면 공연 준비가 시작돼요. 베뉴 정원은 공연장 확정 후 공개돼요.";
  if (phase === "demand_proven") return "최소 수요가 증명됐어요. fanstage가 아티스트와 공연 조건을 확인합니다.";
  if (phase === "artist_contacting" || phase === "artist_reviewing_invite") {
    return "아티스트 일정·조건은 비공개로 확인 중이에요. 팬에게는 진행 상황만 알려드립니다.";
  }
  if (phase === "venue_matching") return "팬·스카우트가 제안한 곳을 참고하지만, 최종 공연장은 fanstage가 확정합니다.";
  if (phase === "confirming_terms") return "아티스트 수락 후 좌석/티켓 수량이 열려요.";
  if (phase === "ticketing_ready") return "100코어는 최소 수요였고, 남은 좌석은 베뉴 확정 후 추가로 열립니다.";
  return "다음 단계는 fanstage 운영팀이 이어갑니다.";
}

export function adminPhaseLabel(phase: RaceAdminPhase): string {
  const map: Record<RaceAdminPhase, string> = {
    collecting_demand: "수요 모집 중",
    demand_proven: "수요 증명 (100 core)",
    artist_contacting: "아티스트 연락 중",
    artist_reviewing_invite: "초대장 검토 중",
    venue_matching: "공연장 매칭",
    confirming_terms: "조건 확인",
    ticketing_ready: "티켓 오픈 준비",
    refund_or_alternative_review: "환불·대안 검토",
  };
  return map[phase];
}

export function raceStatusLabel(status: RaceStatus): string {
  const map: Record<RaceStatus, string> = {
    draft: "초안",
    active: "모집 중",
    target_reached: "수요 증명",
    admin_review: "운영 검토",
    show_preparation: "공연 준비",
    artist_contacting: "아티스트 연락",
    artist_reviewing_invite: "초대 검토",
    venue_matching: "공연장 매칭",
    confirming_terms: "조건 확인",
    artist_confirmed: "아티스트 확인",
    venue_confirmed: "공연장 확인",
    date_confirmed: "날짜 확정",
    ticketing_ready: "티켓 오픈",
    failed: "종료 · 실패",
    cancelled: "취소됨",
    refunded: "환불 완료",
  };
  return map[status];
}

export function confirmationLabel(s: import("./types").ConfirmationStatus): string {
  if (s === "confirmed") return "확인됨";
  if (s === "unavailable") return "불가";
  if (s === "failed") return "실패";
  return "대기 중";
}

export type PreparationStep = {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
};

/** 팬용 단계 — 협상 디테일 없음 */
export function buildFanProgressSteps(race: Race): PreparationStep[] {
  const phase = race.adminPhase ?? mapStatusToAdminPhase(race.status);
  const steps: { key: RaceAdminPhase; label: string }[] = [
    { key: "demand_proven", label: "수요 증명" },
    { key: "artist_contacting", label: "비공개 아티스트 초대" },
    { key: "venue_matching", label: "공연장 후보 검토" },
    { key: "confirming_terms", label: "조건 확인" },
    { key: "ticketing_ready", label: "티켓 오픈" },
  ];
  const rank: Record<RaceAdminPhase, number> = {
    collecting_demand: 0,
    demand_proven: 1,
    artist_contacting: 2,
    artist_reviewing_invite: 2,
    venue_matching: 3,
    confirming_terms: 4,
    ticketing_ready: 5,
    refund_or_alternative_review: -1,
  };
  const current = rank[phase] ?? 0;
  return steps.map((s) => ({
    id: s.key,
    label: s.label,
    done: current > rank[s.key],
    active: current === rank[s.key],
  }));
}

export function buildPreparationSteps(race: Race): PreparationStep[] {
  return buildFanProgressSteps(race);
}

export function failureCopy(kind?: FailureKind, message?: string): { title: string; body: string; refund: string } {
  if (kind === "target_not_met") {
    return {
      title: "목표 인원 미달",
      body: "마감까지 목표 core에 도달하지 못했습니다.",
      refund: "예치금은 자동 환불됩니다.",
    };
  }
  if (kind === "artist_unavailable") {
    return {
      title: "아티스트 일정 불가",
      body: "아티스트 확인 단계에서 진행이 어렵습니다.",
      refund: "예치금은 자동 환불됩니다.",
    };
  }
  if (kind === "venue_unavailable") {
    return {
      title: "공연장 확보 불가",
      body: "후보 공연장에서 일정을 잡지 못했습니다.",
      refund: "예치금은 자동 환불됩니다.",
    };
  }
  if (kind === "schedule_failed") {
    return {
      title: "일정 확정 실패",
      body: "희망·백업 일정 모두 조율되지 않았습니다.",
      refund: "예치금은 자동 환불됩니다.",
    };
  }
  return {
    title: "캠페인 종료",
    body: message ?? "이번 라운드는 진행되지 않습니다.",
    refund: "예치금은 환불 정책에 따라 처리됩니다.",
  };
}

export function formatDeposit(amount: number): string {
  if (amount >= 10000) return `${Math.round(amount / 10000)}만원`;
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatCountdown(c: Race["deadlineCountdown"]): string {
  if (c.days === 0 && c.hours === 0 && c.minutes === 0) return "마감됨";
  const parts: string[] = [];
  if (c.days > 0) parts.push(`${c.days}일`);
  if (c.hours > 0) parts.push(`${c.hours}시간`);
  if (c.minutes > 0) parts.push(`${c.minutes}분`);
  return parts.length ? `${parts.join(" ")} 남음` : "마감 임박";
}

export const TRUST_COPY = {
  payment: "참여 시 예치금이 보관되며, 공연이 열리지 않으면 환불됩니다.",
  success: "100코어가 모이면 공연 준비가 시작돼요. ‘공연 확정’과 티켓 오픈은 그 다음 단계입니다.",
  venue: "베뉴 정원은 공연장 확정 후 공개돼요. 100코어는 최소 수요 임계치입니다.",
  rules: "성공·실패 규칙은 아래에서 언제든 확인할 수 있습니다.",
  wedge: ONECORE_THRESHOLD_NOTE,
} as const;
