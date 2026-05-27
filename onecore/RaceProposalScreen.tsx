import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BattleArtistSocialProof } from "../components/BattleArtistSocialProof";
import type { Artist, Race, RefundPolicy, VenueCandidate } from "./types";
import {
  buildPreparationSteps,
  failureCopy,
  fanPhaseLabel,
  fanPhaseSubline,
  formatCountdown,
  formatDeposit,
  fanStatusHeadline,
  fanStatusSubline,
  ONECORE_THRESHOLD_NOTE,
  TRUST_COPY,
} from "./copy";
import { canFanCommit, isTerminalStatus, resolveOnecoreFanPhase } from "./logic";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  race: Race;
  artist: Artist;
  refundPolicy: RefundPolicy;
  venues: VenueCandidate[];
  foundingFans: string[];
  currentUserDisplayName: string;
  onBack: () => void;
  onCommit: (opts: { displayConsent: boolean; isAnonymous: boolean; displayName?: string }) => void;
  commitError?: string;
};

function SectionLabel({ children }: { children: string }) {
  return (
    <Text style={{ color: OC.accentSoft, fontWeight: "800", fontSize: 11, letterSpacing: 1.2, marginBottom: S.sm }}>
      {children}
    </Text>
  );
}

function Card({ children, border }: { children: React.ReactNode; border?: string }) {
  return (
    <View
      style={{
        backgroundColor: OC.card,
        borderRadius: 20,
        padding: S.md,
        marginBottom: S.md,
        borderWidth: 1,
        borderColor: border ?? OC.border,
      }}
    >
      {children}
    </View>
  );
}

export function RaceProposalScreen({
  race,
  artist,
  refundPolicy,
  venues,
  foundingFans,
  currentUserDisplayName,
  onBack,
  onCommit,
  commitError,
}: Props) {
  const insets = useSafeAreaInsets();
  const [showCommit, setShowCommit] = useState(false);
  const [displayConsent, setDisplayConsent] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nick, setNick] = useState(currentUserDisplayName);

  const remaining = Math.max(0, race.targetCount - race.currentCount);
  const pct = Math.min(100, Math.round((race.currentCount / Math.max(race.targetCount, 1)) * 100));
  const canCommit = canFanCommit(race);
  const terminal = isTerminalStatus(race.status);
  const failed = race.status === "failed" || race.status === "cancelled" || race.status === "refunded";
  const inPreparation = race.currentCount >= race.targetCount || race.status !== "active";

  const prepSteps = buildPreparationSteps(race);
  const fail = failed ? failureCopy(race.failureKind, race.failureMessage) : null;
  const assignedVenue = venues.find((v) => v.id === race.assignedVenueId);
  const fanPhase = resolveOnecoreFanPhase(race);
  const pitch = artist.battlePitch ?? race.proposalReason;
  const isTicketOpen = fanPhase === "ticket_open";
  const venueCapacity = assignedVenue?.capacity ?? 180;
  const remainingTickets = Math.max(0, venueCapacity - race.targetCount);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: OC.bg }}
      contentContainerStyle={{
        paddingHorizontal: S.lg,
        paddingTop: Math.max(insets.top + S.lg, 56),
        paddingBottom: Math.max(insets.bottom + S.xl, S.xl),
      }}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 12, right: 16, bottom: 12, left: 16 }}
        style={{ alignSelf: "flex-start", marginBottom: S.lg }}
      >
        <Text style={{ color: OC.muted, fontWeight: "800", fontSize: 15 }}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 11, letterSpacing: 1.2 }}>
        {isTicketOpen ? "티켓 추가 오픈" : "ONECORE · 캠페인"}
      </Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 28, marginTop: S.xs, letterSpacing: -0.5 }}>
        100코어로 공연을 열자
      </Text>
      <Text style={{ color: OC.muted, marginTop: 4, fontSize: 15, fontWeight: "700" }}>
        {race.title} · {artist.name} · {fanPhaseLabel(fanPhase)}
      </Text>
      <Text style={{ color: OC.dim, marginTop: S.xs, fontSize: 13, lineHeight: 20 }}>{ONECORE_THRESHOLD_NOTE}</Text>

      <Card border={OC.fan.border}>
        <SectionLabel>팬들이 응원할 이유</SectionLabel>
        <Text style={{ color: OC.text, fontSize: 16, lineHeight: 24, fontWeight: "600" }}>{pitch}</Text>
        <Text style={{ color: OC.dim, marginTop: S.md, fontSize: 13, lineHeight: 20 }}>{artist.bio}</Text>
        <BattleArtistSocialProof social={artist.social} sectionLabel="아티스트 확인하기" />
      </Card>

      {!terminal ? (
        <Card border={OC.gold + "66"}>
          <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 12 }}>{fanStatusHeadline(race)}</Text>
          <Text style={{ color: OC.text, fontWeight: "900", fontSize: 32, marginTop: S.sm }}>
            {race.currentCount} / {race.targetCount}
          </Text>
          <Text style={{ color: OC.dim, fontSize: 12, marginTop: 2 }}>최소 수요 100코어</Text>
          <Text style={{ color: OC.text, fontSize: 17, fontWeight: "800", marginTop: S.xs, lineHeight: 24 }}>
            {fanPhaseSubline(fanPhase, race)}
          </Text>
          <Text style={{ color: OC.muted, marginTop: S.xs, fontSize: 14, lineHeight: 20 }}>
            공연이 잡히기 전에 팬들이 먼저 수요를 증명합니다
          </Text>
          <View style={{ height: 10, backgroundColor: OC.border, borderRadius: 999, marginTop: S.md, overflow: "hidden" }}>
            <View style={{ width: `${pct}%`, height: "100%", backgroundColor: OC.fan.primary }} />
          </View>
          <Text style={{ color: OC.dim, marginTop: S.md, fontSize: 12 }}>
            마감 {race.deadline} · {formatCountdown(race.deadlineCountdown)}
          </Text>
        </Card>
      ) : null}

      {canCommit ? (
        <Card>
          <SectionLabel>CORE 참여</SectionLabel>
          {!showCommit ? (
            <TouchableOpacity
              onPress={() => setShowCommit(true)}
              style={{ backgroundColor: OC.accent, borderRadius: 16, paddingVertical: 18, alignItems: "center" }}
            >
              <Text style={{ color: OC.ink, fontWeight: "900", fontSize: 17 }}>
                코어 참여하기 · {formatDeposit(race.depositAmount)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 20, marginBottom: S.md }}>
                예치금은 공연 준비가 진행될 때까지 보관됩니다. 목표 미달·확정 실패 시 환불됩니다.
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm }}>
                <Text style={{ color: OC.text, fontWeight: "700" }}>Founding fan으로 표시</Text>
                <Switch value={displayConsent} onValueChange={setDisplayConsent} />
              </View>
              {displayConsent ? (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S.sm }}>
                    <Text style={{ color: OC.text, fontWeight: "700" }}>익명으로 표시</Text>
                    <Switch value={isAnonymous} onValueChange={setIsAnonymous} />
                  </View>
                  {!isAnonymous ? (
                    <TextInput
                      value={nick}
                      onChangeText={setNick}
                      placeholder="표시할 닉네임"
                      placeholderTextColor={OC.dim}
                      style={{
                        backgroundColor: OC.surface,
                        borderRadius: 12,
                        padding: S.md,
                        color: OC.text,
                        marginBottom: S.md,
                        borderWidth: 1,
                        borderColor: OC.border,
                      }}
                    />
                  ) : null}
                </>
              ) : (
                <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.md }}>동의하지 않으면 founding fan 목록에 표시되지 않습니다.</Text>
              )}
              {commitError ? (
                <Text style={{ color: "#f87171", marginBottom: S.sm, fontWeight: "700" }}>{commitError}</Text>
              ) : null}
              <TouchableOpacity
                onPress={() =>
                  onCommit({
                    displayConsent,
                    isAnonymous,
                    displayName: displayConsent && !isAnonymous ? nick.trim() || currentUserDisplayName : undefined,
                  })
                }
                style={{ backgroundColor: OC.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
              >
                <Text style={{ color: OC.ink, fontWeight: "900", fontSize: 16 }}>참여 확정 · {formatDeposit(race.depositAmount)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      ) : null}

      <Card>
        <SectionLabel>FOUNDING FANS</SectionLabel>
        <Text style={{ color: OC.muted, fontSize: 13, marginBottom: S.sm }}>표시 동의한 참여자만 공개됩니다.</Text>
        {foundingFans.length === 0 ? (
          <Text style={{ color: OC.dim }}>아직 공개된 founding fan이 없어요.</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs }}>
            {foundingFans.map((name, i) => (
              <View
                key={`${name}-${i}`}
                style={{
                  backgroundColor: OC.surface,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: OC.gold + "44",
                }}
              >
                <Text style={{ color: OC.gold, fontWeight: "800", fontSize: 13 }}>{name}</Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {isTicketOpen && assignedVenue ? (
        <Card border={OC.fan.border}>
          <SectionLabel>추가 티켓</SectionLabel>
          <Text style={{ color: OC.text, fontWeight: "800", fontSize: 16 }}>
            {assignedVenue.name} · 정원 {venueCapacity}
          </Text>
          <Text style={{ color: OC.muted, marginTop: S.xs, fontSize: 14, lineHeight: 20 }}>
            100코어 확보 · 추가 티켓 {remainingTickets}장 · {formatDeposit(race.depositAmount)}
          </Text>
          <Text style={{ color: OC.dim, marginTop: S.sm, fontSize: 12, lineHeight: 18 }}>
            {fanPhaseSubline("ticket_open", race)}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: S.md,
              backgroundColor: OC.fan.bg,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: OC.fan.border,
            }}
          >
            <Text style={{ color: OC.accentSoft, fontWeight: "900", fontSize: 15 }}>티켓 보기</Text>
          </TouchableOpacity>
        </Card>
      ) : null}

      {inPreparation ? (
        <Card border={OC.fan.border}>
          <SectionLabel>공연 준비 진행</SectionLabel>
          <Text style={{ color: OC.fan.soft, fontSize: 14, marginBottom: S.md, lineHeight: 20 }}>{fanStatusSubline(race)}</Text>
          {prepSteps.map((step) => (
            <View key={step.id} style={{ flexDirection: "row", alignItems: "center", marginBottom: S.sm }}>
              <Text style={{ color: step.done ? OC.fan.primary : step.active ? OC.gold : OC.dim, fontWeight: "900", width: 22 }}>
                {step.done ? "✓" : step.active ? "→" : "·"}
              </Text>
              <Text
                style={{
                  color: step.done ? OC.fan.primary : step.active ? OC.text : OC.dim,
                  fontWeight: step.active ? "800" : "600",
                  fontSize: 15,
                }}
              >
                {step.label}
              </Text>
            </View>
          ))}
          <Text style={{ color: OC.dim, fontSize: 12, marginTop: S.md }}>
            {TRUST_COPY.venue}
            {assignedVenue ? ` · ${assignedVenue.name} 후보 검토 중` : ""}
          </Text>
        </Card>
      ) : null}

      {fail && fail ? (
        <Card border="#f8717155">
          <SectionLabel>종료 안내</SectionLabel>
          <Text style={{ color: "#fca5a5", fontWeight: "900", fontSize: 18 }}>{fail.title}</Text>
          <Text style={{ color: OC.muted, marginTop: S.sm, lineHeight: 22 }}>{fail.body}</Text>
          <Text style={{ color: OC.fan.primary, marginTop: S.md, fontWeight: "800" }}>{fail.refund}</Text>
        </Card>
      ) : null}

      <Card>
        <SectionLabel>신뢰 · 규칙</SectionLabel>
        <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 22 }}>· {TRUST_COPY.payment}</Text>
        <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 22, marginTop: S.xs }}>· {TRUST_COPY.success}</Text>
        <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 22, marginTop: S.xs }}>· {TRUST_COPY.venue}</Text>
        <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 22, marginTop: S.xs }}>· {TRUST_COPY.wedge}</Text>
        <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 22, marginTop: S.xs }}>
          · 결제: {race.paymentType === "deposit" ? "예치금" : "전액"} {formatDeposit(race.depositAmount)}
        </Text>
        <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 22, marginTop: S.xs }}>· 마감 {race.deadline}</Text>
        <Text style={{ color: OC.text, fontWeight: "800", marginTop: S.md }}>{refundPolicy.title}</Text>
        <Text style={{ color: OC.dim, fontSize: 13, marginTop: 4 }}>{refundPolicy.summary}</Text>
        {refundPolicy.rules.map((rule) => (
          <Text key={rule} style={{ color: OC.dim, fontSize: 12, marginTop: 4, lineHeight: 18 }}>
            · {rule}
          </Text>
        ))}
        {venues.length > 0 ? (
          <Text style={{ color: OC.dim, fontSize: 12, marginTop: S.md }}>
            참고용 후보 (확정 아님): {venues.map((v) => v.name).join(" · ")}
          </Text>
        ) : null}
        <Text style={{ color: OC.dim, fontSize: 12, marginTop: S.sm }}>성공 후 일정은 희망일 → 백업일 순으로 조율됩니다.</Text>
      </Card>
    </ScrollView>
  );
}
