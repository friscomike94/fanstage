import type { ConfirmationStatus, FailureKind, Race, RaceStatus } from "./types";

/** 목표 달성 전 — 확정적 표현 금지 */
export function raceProgressHeadline(race: Race): string {
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  if (remaining > 0) {
    return `${remaining}명 더 모이면 공연 준비 단계로 넘어갑니다`;
  }
  return "목표 인원에 도달했습니다";
}

export function raceProgressSubline(race: Race): string {
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  if (remaining > 0) {
    return "지금은 core로 참여만 가능해요. 공연은 아직 준비 단계 전입니다.";
  }
  return "다음은 아티스트·공연장·일정 확인 순서로 진행됩니다.";
}

export function raceStatusLabel(status: RaceStatus): string {
  const map: Record<RaceStatus, string> = {
    draft: "초안",
    active: "모집 중",
    target_reached: "목표 달성",
    admin_review: "운영 검토",
    show_preparation: "공연 준비 단계",
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

export function confirmationLabel(s: ConfirmationStatus): string {
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

export function buildPreparationSteps(race: Race): PreparationStep[] {
  const order: { key: RaceStatus; label: string }[] = [
    { key: "target_reached", label: "목표 달성" },
    { key: "show_preparation", label: "공연 준비 단계 진입" },
    { key: "artist_confirmed", label: "아티스트 확인" },
    { key: "venue_confirmed", label: "공연장 확인" },
    { key: "date_confirmed", label: "날짜 확정" },
    { key: "ticketing_ready", label: "티켓 오픈" },
  ];

  const rank: Record<RaceStatus, number> = {
    draft: -1,
    active: 0,
    target_reached: 1,
    admin_review: 1,
    show_preparation: 2,
    artist_confirmed: 3,
    venue_confirmed: 4,
    date_confirmed: 5,
    ticketing_ready: 6,
    failed: -2,
    cancelled: -2,
    refunded: -2,
  };

  const current = rank[race.status] ?? 0;

  return order.map((step) => {
    const stepRank = rank[step.key];
    return {
      id: step.key,
      label: step.label,
      done: current > stepRank,
      active: current === stepRank || (race.status === "admin_review" && step.key === "target_reached"),
    };
  });
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
  payment: "참여 시 예치금이 보관되며, 공연 준비가 진행되지 않으면 환불됩니다.",
  success: "목표 달성 후에도 ‘공연 확정’이 아니라 ‘공연 준비 단계’로 안내됩니다.",
  rules: "성공·실패 규칙은 아래에서 언제든 확인할 수 있습니다.",
} as const;
