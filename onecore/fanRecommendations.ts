import {
  BATTLE_PITCH_MAX,
  BATTLE_PITCH_TARGET_MIN,
  hasAnySocialProof,
  resolveSocialUrl,
  socialProofFromInput,
  SOCIAL_PLATFORM_OPTIONS,
  type ArtistSocialProof,
  type SocialPlatform,
} from "../lib/artistSocial";

export type FanArtistRecommendation = {
  id: string;
  artistName: string;
  proofPlatform: SocialPlatform;
  proofInput: string;
  artistSocial: ArtistSocialProof;
  fanReason: string;
  fanSocial?: string;
  status: "reviewing" | "approved" | "rejected";
  campaignRaceId?: string;
  createdAt: string;
};

export function fanRecommendationStatusLabel(status: FanArtistRecommendation["status"]): string {
  if (status === "approved") return "ONECORE 캠페인 오픈";
  if (status === "rejected") return "보류됨";
  return "ONECORE 후보 검토 중";
}

export function platformLabelKo(platform: SocialPlatform): string {
  return SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === platform)?.labelKo ?? platform;
}

export function normalizeOptionalFanSocial(raw: string): string | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  for (const platform of ["instagram", "tiktok", "youtube"] as SocialPlatform[]) {
    if (resolveSocialUrl(platform, v)) return v;
  }
  if (resolveSocialUrl("website", v)) return v;
  return undefined;
}

export function validateFanArtistRecommendation(input: {
  artistName: string;
  proofPlatform: SocialPlatform;
  proofInput: string;
  fanReason: string;
}): { ok: boolean; message?: string } {
  if (!input.artistName.trim()) {
    return { ok: false, message: "아티스트 이름을 입력해 주세요." };
  }
  if (!hasAnySocialProof(socialProofFromInput(input.proofPlatform, input.proofInput))) {
    return { ok: false, message: "아티스트 확인 링크를 입력해 주세요." };
  }
  const len = input.fanReason.trim().length;
  if (len < 20) {
    return { ok: false, message: "팬들이 공연을 원하는 이유를 조금 더 적어 주세요." };
  }
  if (len > BATTLE_PITCH_MAX) {
    return { ok: false, message: `이유는 ${BATTLE_PITCH_MAX}자 이하로 입력해 주세요.` };
  }
  return { ok: true };
}

export function fanReasonLengthHint(len: number): string {
  if (len === 0) return `${BATTLE_PITCH_TARGET_MIN}–${BATTLE_PITCH_MAX}자 권장`;
  if (len < BATTLE_PITCH_TARGET_MIN) return `조금 더 적어주세요 (${len}/${BATTLE_PITCH_TARGET_MIN}+)`;
  if (len > BATTLE_PITCH_MAX) return `최대 ${BATTLE_PITCH_MAX}자`;
  return `${len}/${BATTLE_PITCH_MAX}`;
}
