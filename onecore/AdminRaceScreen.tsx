import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatSocialProofSummary } from "../lib/artistSocial";
import type { FanArtistRecommendation } from "./fanRecommendations";
import { fanRecommendationStatusLabel, platformLabelKo } from "./fanRecommendations";
import { adminPhaseLabel, raceStatusLabel } from "./copy";
import type { OnecoreState, Race, RaceDraft, RaceOperations, RaceStatus } from "./types";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  state: OnecoreState;
  fanRecommendations: FanArtistRecommendation[];
  adminId: string;
  onBack: () => void;
  onApproveRecommendation: (recommendationId: string) => void;
  onRejectRecommendation: (recommendationId: string) => void;
  onCreate: (draft: RaceDraft, publishActive: boolean) => void;
  onUpdate: (raceId: string, draft: Partial<RaceDraft>) => void;
  onUpdateOperations: (raceId: string, operations: Partial<RaceOperations>) => void;
  onStatusChange: (
    raceId: string,
    toStatus: RaceStatus,
    reason: string,
    visibleToPublic: boolean,
    failureKind?: Race["failureKind"]
  ) => void;
  onSendArtistInvite: (raceId: string) => void;
  onPreviewArtistInvite: (raceId: string) => void;
};

function nextActionForRace(race: Race): { label: string; toStatus?: RaceStatus; reason?: string } | null {
  if (race.status === "active" && race.currentCount < race.targetCount) return null;
  if (race.status === "active" || race.status === "target_reached" || race.status === "admin_review") {
    return { label: "아티스트 연락 시작", toStatus: "artist_contacting", reason: "수요 확인 후 아티스트 연락 시작" };
  }
  if (race.status === "artist_contacting") {
    return { label: "초대 검토로 이동", toStatus: "artist_reviewing_invite", reason: "아티스트 초대장 전달" };
  }
  if (race.status === "artist_reviewing_invite") {
    return { label: "공연장 검토로 이동", toStatus: "venue_matching", reason: "아티스트 관심 확인 · 공연장 후보 검토" };
  }
  if (race.status === "venue_matching" || race.status === "artist_confirmed" || race.status === "venue_confirmed") {
    return { label: "조건 확인으로 이동", toStatus: "confirming_terms", reason: "아티스트·공연장 조건 확인" };
  }
  if (race.status === "confirming_terms" || race.status === "date_confirmed") {
    return { label: "티켓 오픈 준비", toStatus: "ticketing_ready", reason: "티켓 오픈 준비 완료" };
  }
  return null;
}

function campaignStatusLine(race: Race) {
  if (race.currentCount < race.targetCount) {
    return `${race.targetCount - race.currentCount}코어 더 필요`;
  }
  if (race.status === "ticketing_ready") return "티켓 오픈 단계";
  return "100코어 도달 · 운영 확인 필요";
}

export function AdminRaceScreen({
  state,
  fanRecommendations,
  onBack,
  onApproveRecommendation,
  onRejectRecommendation,
  onStatusChange,
  onSendArtistInvite,
  onPreviewArtistInvite,
}: Props) {
  const insets = useSafeAreaInsets();
  const pendingRecommendations = fanRecommendations.filter((rec) => rec.status === "reviewing");
  const activeCampaigns = state.races.filter((race) => race.status !== "draft");
  const reviewCount = pendingRecommendations.length;
  const needsWorkCount = activeCampaigns.filter((race) => race.currentCount >= race.targetCount && race.status !== "ticketing_ready").length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: OC.bg }}
      contentContainerStyle={{
        paddingHorizontal: S.lg,
        paddingTop: Math.max(insets.top + S.lg, 56),
        paddingBottom: Math.max(insets.bottom + S.xl, S.xl),
      }}
    >
      <View style={{ marginBottom: S.lg }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 12, right: 16, bottom: 12, left: 16 }}
          style={{ alignSelf: "flex-start", marginBottom: S.lg }}
        >
          <Text style={{ color: OC.muted, fontWeight: "800", fontSize: 15 }}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 11, letterSpacing: 1 }}>ONECORE 운영</Text>
        <Text style={{ color: OC.text, fontWeight: "900", fontSize: 26, marginTop: 6 }}>공연 만들기 대시보드</Text>
        <Text style={{ color: OC.muted, marginTop: 10, lineHeight: 20, fontSize: 13 }}>
          팬 추천을 캠페인으로 열고, 100코어 이후 아티스트·공연장·티켓 준비만 순서대로 확인합니다.
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: S.sm, marginBottom: S.lg }}>
        <Metric label="검토할 추천" value={String(reviewCount)} tone={reviewCount > 0 ? "gold" : "quiet"} />
        <Metric label="운영 확인" value={String(needsWorkCount)} tone={needsWorkCount > 0 ? "green" : "quiet"} />
      </View>

      <SectionHeader title="1. 팬 추천 검토" subtitle="승인하면 홈에 ONECORE 캠페인으로 바로 열립니다." />
      {pendingRecommendations.length === 0 ? (
        <EmptyCard text="지금 검토할 팬 추천이 없습니다." />
      ) : (
        pendingRecommendations.map((rec) => (
          <View key={rec.id} style={card}>
            <Text style={eyebrow}>{fanRecommendationStatusLabel(rec.status)}</Text>
            <Text style={titleText}>{rec.artistName}</Text>
            <Text style={mutedText}>{platformLabelKo(rec.proofPlatform)} · 팬 추천</Text>
            <Text style={[bodyText, { marginTop: S.sm }]} numberOfLines={3}>
              {rec.fanReason}
            </Text>
            <View style={actionRow}>
              <TouchableOpacity onPress={() => onApproveRecommendation(rec.id)} style={primarySmall}>
                <Text style={primarySmallText}>캠페인 열기</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onRejectRecommendation(rec.id)} style={secondarySmall}>
                <Text style={secondarySmallText}>보류</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <SectionHeader title="2. 캠페인 운영" subtitle="MVP에서는 이 목록만 보고 다음 단계로 넘깁니다." />
      {activeCampaigns.map((race) => {
        const artist = state.artists.find((a) => a.id === race.artistId);
        const next = nextActionForRace(race);
        const canPreviewInvite = race.currentCount >= race.targetCount && race.status !== "ticketing_ready";

        return (
          <View key={race.id} style={card}>
            <Text style={eyebrow}>{adminPhaseLabel(race.adminPhase)}</Text>
            <Text style={titleText}>{race.title}</Text>
            <Text style={mutedText}>
              {artist?.name ?? "아티스트 미지정"} · {race.currentCount}/{race.targetCount} core · {raceStatusLabel(race.status)}
            </Text>
            {artist?.social ? (
              <Text style={[mutedText, { marginTop: 5 }]} numberOfLines={2}>
                확인 링크 · {formatSocialProofSummary(artist.social)}
              </Text>
            ) : null}
            <View style={statusPill}>
              <Text style={statusPillText}>{campaignStatusLine(race)}</Text>
            </View>
            <View style={actionRow}>
              {next?.toStatus ? (
                <TouchableOpacity
                  onPress={() => onStatusChange(race.id, next.toStatus!, next.reason ?? next.label, true)}
                  style={primarySmall}
                >
                  <Text style={primarySmallText}>{next.label}</Text>
                </TouchableOpacity>
              ) : null}
              {canPreviewInvite ? (
                <TouchableOpacity onPress={() => onPreviewArtistInvite(race.id)} style={secondarySmall}>
                  <Text style={secondarySmallText}>초대장 보기</Text>
                </TouchableOpacity>
              ) : null}
              {race.status === "artist_contacting" ? (
                <TouchableOpacity onPress={() => onSendArtistInvite(race.id)} style={secondarySmall}>
                  <Text style={secondarySmallText}>초대 발송</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "gold" | "green" | "quiet" }) {
  const color = tone === "gold" ? OC.gold : tone === "green" ? OC.accentSoft : OC.dim;
  return (
    <View style={{ flex: 1, backgroundColor: OC.card, borderRadius: 14, padding: S.md, borderWidth: 1, borderColor: OC.border }}>
      <Text style={{ color, fontWeight: "900", fontSize: 22 }}>{value}</Text>
      <Text style={{ color: OC.muted, fontWeight: "800", fontSize: 11, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={{ marginTop: S.md, marginBottom: S.sm }}>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18 }}>{title}</Text>
      <Text style={{ color: OC.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{subtitle}</Text>
    </View>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <View style={card}>
      <Text style={{ color: OC.dim, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

const card = {
  backgroundColor: OC.card,
  borderRadius: 16,
  padding: S.md,
  marginBottom: S.sm,
  borderWidth: 1,
  borderColor: OC.border,
};
const eyebrow = { color: OC.gold, fontWeight: "900" as const, fontSize: 11, marginBottom: 5 };
const titleText = { color: OC.text, fontWeight: "900" as const, fontSize: 17, lineHeight: 23 };
const mutedText = { color: OC.muted, fontSize: 12, lineHeight: 18, marginTop: 2 };
const bodyText = { color: OC.dim, fontSize: 12, lineHeight: 18 };
const actionRow = { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: S.xs, marginTop: S.sm };
const primarySmall = { backgroundColor: OC.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 };
const primarySmallText = { color: OC.ink, fontWeight: "900" as const, fontSize: 12 };
const secondarySmall = {
  backgroundColor: OC.surface,
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderWidth: 1,
  borderColor: OC.border,
};
const secondarySmallText = { color: OC.accentSoft, fontWeight: "800" as const, fontSize: 12 };
const statusPill = {
  alignSelf: "flex-start" as const,
  backgroundColor: OC.surface,
  borderRadius: 8,
  paddingHorizontal: 9,
  paddingVertical: 5,
  borderWidth: 1,
  borderColor: OC.border,
  marginTop: S.sm,
};
const statusPillText = { color: OC.accentSoft, fontWeight: "800" as const, fontSize: 11 };
