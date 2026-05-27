import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { FanArtistRecommendation } from "../onecore/fanRecommendations";
import { platformLabelKo } from "../onecore/fanRecommendations";
import { fanPhaseLabel } from "../onecore/copy";
import type { OnecoreFanPhase } from "../onecore/types";
import type { Artist, Race } from "../onecore/types";

const C = {
  bg: "#08111f",
  card: "#0f172a",
  surface: "#111827",
  border: "#1e293b",
  text: "#f8fafc",
  muted: "#94a3b8",
  dim: "#64748b",
  accent: "#22c55e",
  accentSoft: "#86efac",
  gold: "#f59e0b",
  fanBorder: "#4ade8099",
  fanBg: "#14532d44",
};

type ArtistApprovalStatus = "not_applied" | "pending" | "approved";

type TicketPreview = {
  artist: string;
  venue: string;
  date: string;
};

type JoinedCampaign = {
  race: Race;
  artist: Artist;
  phase: OnecoreFanPhase;
};

type Props = {
  handle: string;
  displayName?: string;
  joinedCampaigns: JoinedCampaign[];
  recommendations: FanArtistRecommendation[];
  readyTickets: TicketPreview[];
  coresJoinedCount: number;
  recommendationsCount: number;
  readyTicketCount: number;
  artistRoleStatus: ArtistApprovalStatus;
  isCurator: boolean;
  onOpenCampaign: (raceId: string) => void;
  onOpenFanRecommend: () => void;
  onGoTickets: () => void;
  onApplyForArtist: () => void;
  onOpenOnecoreAdmin: () => void;
  onOpenVenueAdmin: () => void;
  onOpenCuratorTools: () => void;
  onSettingsAction: (key: "notifications" | "refund" | "account") => void;
};

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 10, marginTop: 4 }}>
      <Text style={{ color: C.gold, fontWeight: "900", fontSize: 11, letterSpacing: 0.6 }}>{title}</Text>
      {subtitle ? (
        <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "30%",
        backgroundColor: C.surface,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderWidth: 1,
        borderColor: C.border,
        alignItems: "center",
      }}
    >
      <Text style={{ color: C.text, fontWeight: "900", fontSize: 18 }}>{value}</Text>
      <Text style={{ color: C.dim, fontSize: 10, fontWeight: "700", marginTop: 3, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function QuietRow({
  title,
  subtitle,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.border,
      }}
    >
      <Text style={{ color: C.muted, fontWeight: "700", fontSize: 14 }}>{title}</Text>
      {subtitle ? <Text style={{ color: C.dim, fontSize: 11, marginTop: 3 }}>{subtitle}</Text> : null}
    </TouchableOpacity>
  );
}

export function MyFanstageProfile({
  handle,
  displayName,
  joinedCampaigns,
  recommendations,
  readyTickets,
  coresJoinedCount,
  recommendationsCount,
  readyTicketCount,
  artistRoleStatus,
  isCurator,
  onOpenCampaign,
  onOpenFanRecommend,
  onGoTickets,
  onApplyForArtist,
  onOpenOnecoreAdmin,
  onOpenVenueAdmin,
  onOpenCuratorTools,
  onSettingsAction,
}: Props) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const name = displayName?.trim() || `@${handle}`;
  const latestTicket = readyTickets[0];

  const activityEmpty = joinedCampaigns.length === 0 && recommendations.length === 0;

  const artistStatusKo = useMemo(() => {
    if (artistRoleStatus === "approved") return "아티스트 승인됨";
    if (artistRoleStatus === "pending") return "아티스트 신청 검토 중";
    return "아티스트 미신청";
  }, [artistRoleStatus]);

  return (
    <>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: C.dim, fontWeight: "800", fontSize: 10, letterSpacing: 1.2 }}>MY FANSTAGE</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 26, marginTop: 4 }}>{name}</Text>
        <Text style={{ color: C.accentSoft, fontWeight: "700", fontSize: 14, marginTop: 4 }}>공연을 여는 팬</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          <StatChip label="참여한 코어" value={String(coresJoinedCount)} />
          <StatChip label="추천한 아티스트" value={String(recommendationsCount)} />
          <StatChip label="준비된 티켓" value={String(readyTicketCount)} />
        </View>
      </View>

      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 16,
          padding: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: C.fanBorder,
        }}
      >
        <SectionTitle
          title="내가 만든 공연의 흔적"
          subtitle="참여하거나 추천한 ONECORE 활동을 모아봤어요."
        />

        {activityEmpty ? (
          <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginBottom: 10 }}>
            아직 ONECORE 참여나 추천이 없어요. 캠페인에 코어를 걸거나 아티스트를 추천해 보세요.
          </Text>
        ) : null}

        {joinedCampaigns.map(({ race, artist, phase }) => (
          <TouchableOpacity
            key={race.id}
            onPress={() => onOpenCampaign(race.id)}
            activeOpacity={0.9}
            style={{
              backgroundColor: C.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ color: C.text, fontWeight: "800", fontSize: 14 }}>{race.title}</Text>
                <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                  {artist.name} · {artist.genre}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: C.fanBg,
                  borderWidth: 1,
                  borderColor: C.fanBorder,
                }}
              >
                <Text style={{ color: C.accentSoft, fontWeight: "800", fontSize: 10 }}>{fanPhaseLabel(phase)}</Text>
              </View>
            </View>
            <Text style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
              {race.currentCount} / {race.targetCount} core · 참여함
            </Text>
          </TouchableOpacity>
        ))}

        {recommendations.map((rec) => (
          <View
            key={rec.id}
            style={{
              backgroundColor: C.surface,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
              borderWidth: 1,
              borderColor: C.border,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: C.text, fontWeight: "800", fontSize: 14 }}>{rec.artistName}</Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: "#422006",
                  borderWidth: 1,
                  borderColor: C.gold + "55",
                }}
              >
                <Text style={{ color: C.gold, fontWeight: "800", fontSize: 10 }}>추천 검토 중</Text>
              </View>
            </View>
            <Text style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>{platformLabelKo(rec.proofPlatform)} · 팬 추천</Text>
            <Text style={{ color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 17 }} numberOfLines={2}>
              {rec.fanReason}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={onOpenFanRecommend}
          style={{
            marginTop: 4,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: C.accent,
            paddingVertical: 11,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 13 }}>아티스트 추천하기</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <SectionTitle title="티켓" subtitle="확정된 공연 티켓만 간단히 보여드려요." />
        <Text style={{ color: C.text, fontWeight: "800", fontSize: 15 }}>
          준비된 티켓 <Text style={{ color: C.accentSoft }}>{readyTicketCount}장</Text>
        </Text>
        {latestTicket ? (
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 6, lineHeight: 18 }}>
            최근 · {latestTicket.artist}
            {latestTicket.venue ? ` · ${latestTicket.venue}` : ""}
          </Text>
        ) : (
          <Text style={{ color: C.dim, fontSize: 12, marginTop: 6 }}>아직 준비된 티켓이 없어요.</Text>
        )}
        <TouchableOpacity onPress={onGoTickets} style={{ marginTop: 10 }}>
          <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 13 }}>Tickets에서 보기 →</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: C.surface,
          borderRadius: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: C.border,
          overflow: "hidden",
        }}
      >
        <TouchableOpacity
          onPress={() => setToolsOpen((o) => !o)}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 14,
            paddingVertical: 12,
          }}
        >
          <View>
            <Text style={{ color: C.dim, fontWeight: "800", fontSize: 11 }}>아티스트/큐레이터 도구</Text>
            <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{artistStatusKo}</Text>
          </View>
          <Text style={{ color: C.dim, fontWeight: "900" }}>{toolsOpen ? "▲" : "▼"}</Text>
        </TouchableOpacity>
        {toolsOpen ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 10, borderTopWidth: 1, borderTopColor: C.border }}>
            {artistRoleStatus === "not_applied" ? (
              <QuietRow title="아티스트로 신청하기" subtitle="베타 배틀·무대 지원용" onPress={onApplyForArtist} />
            ) : null}
            {artistRoleStatus === "pending" ? (
              <View style={{ paddingVertical: 10 }}>
                <Text style={{ color: C.muted, fontSize: 12 }}>아티스트 신청을 검토 중이에요.</Text>
              </View>
            ) : null}
            {isCurator ? (
              <>
                <QuietRow title="ONECORE Admin · Race & logs" onPress={onOpenOnecoreAdmin} />
                <QuietRow title="Venue Admin · 라인업" onPress={onOpenVenueAdmin} />
                <QuietRow title="Demand scout · 수요 캠페인" onPress={onOpenCuratorTools} last />
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 4,
          marginBottom: 24,
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        <SectionTitle title="설정" />
        <QuietRow title="알림" subtitle="공연·캠페인 업데이트" onPress={() => onSettingsAction("notifications")} />
        <QuietRow title="결제/환불 안내" subtitle="코어 예치·환불 정책" onPress={() => onSettingsAction("refund")} />
        <QuietRow title="계정 설정" subtitle={`@${handle}`} onPress={() => onSettingsAction("account")} last />
      </View>
    </>
  );
}
