import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch } from "react-native";
import type { Artist, OnecoreState, Race, RefundPolicy, VenueCandidate } from "./types";
import {
  buildPreparationSteps,
  confirmationLabel,
  failureCopy,
  formatCountdown,
  formatDeposit,
  raceProgressHeadline,
  raceProgressSubline,
  raceStatusLabel,
  TRUST_COPY,
} from "./copy";
import { canFanCommit, isTerminalStatus } from "./logic";
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
  const [showCommit, setShowCommit] = useState(false);
  const [displayConsent, setDisplayConsent] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nick, setNick] = useState(currentUserDisplayName);

  const remaining = Math.max(0, race.targetCount - race.currentCount);
  const pct = Math.min(100, Math.round((race.currentCount / Math.max(race.targetCount, 1)) * 100));
  const canCommit = canFanCommit(race);
  const terminal = isTerminalStatus(race.status);
  const failed = race.status === "failed" || race.status === "cancelled" || race.status === "refunded";
  const inPreparation =
    race.status === "target_reached" ||
    race.status === "admin_review" ||
    race.status === "show_preparation" ||
    race.status === "artist_confirmed" ||
    race.status === "venue_confirmed" ||
    race.status === "date_confirmed" ||
    race.status === "ticketing_ready";

  const prepSteps = buildPreparationSteps(race);
  const fail = failed ? failureCopy(race.failureKind, race.failureMessage) : null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: S.xl }} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={onBack} style={{ marginBottom: S.md }}>
        <Text style={{ color: OC.dim, fontWeight: "700" }}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 11, letterSpacing: 1.2 }}>ONECORE · 공연 제안</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 28, marginTop: S.xs, letterSpacing: -0.5 }}>{race.title}</Text>
      <Text style={{ color: OC.muted, marginTop: 4, fontSize: 15, fontWeight: "700" }}>
        {artist.name} · {artist.genre}
      </Text>

      <Card border={OC.fan.border}>
        <SectionLabel>WHY THIS SHOW</SectionLabel>
        <Text style={{ color: OC.text, fontSize: 16, lineHeight: 24, fontWeight: "600" }}>{race.proposalReason}</Text>
        <Text style={{ color: OC.dim, marginTop: S.md, fontSize: 13, lineHeight: 20 }}>{artist.bio}</Text>
      </Card>

      {!terminal ? (
        <Card border={OC.gold + "66"}>
          <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 12 }}>{raceStatusLabel(race.status)}</Text>
          <Text style={{ color: OC.text, fontWeight: "900", fontSize: 32, marginTop: S.sm }}>
            {race.currentCount} / {race.targetCount}
          </Text>
          <Text style={{ color: OC.text, fontSize: 17, fontWeight: "800", marginTop: S.xs, lineHeight: 24 }}>
            {raceProgressHeadline(race)}
          </Text>
          <Text style={{ color: OC.muted, marginTop: S.xs, fontSize: 14, lineHeight: 20 }}>{raceProgressSubline(race)}</Text>
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
                core로 참여하기 · {formatDeposit(race.depositAmount)}
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

      {inPreparation ? (
        <Card border={OC.fan.border}>
          <SectionLabel>공연 준비 진행</SectionLabel>
          <Text style={{ color: OC.fan.soft, fontSize: 14, marginBottom: S.md, lineHeight: 20 }}>
            목표를 달성했습니다. 지금은 공연 준비 단계예요 — 아직 ‘공연 확정’이 아닙니다.
          </Text>
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
          <View style={{ marginTop: S.md, paddingTop: S.md, borderTopWidth: 1, borderTopColor: OC.border }}>
            <Text style={{ color: OC.dim, fontSize: 12 }}>아티스트 {confirmationLabel(race.artistConfirmationStatus)}</Text>
            <Text style={{ color: OC.dim, fontSize: 12, marginTop: 4 }}>공연장 {confirmationLabel(race.venueConfirmationStatus)}</Text>
            <Text style={{ color: OC.dim, fontSize: 12, marginTop: 4 }}>희망일 {race.preferredDate}</Text>
          </View>
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
            공연장 후보: {venues.map((v) => v.name).join(" · ")}
          </Text>
        ) : null}
        <Text style={{ color: OC.dim, fontSize: 12, marginTop: S.sm }}>성공 후 일정은 희망일 → 백업일 순으로 조율됩니다.</Text>
      </Card>
    </ScrollView>
  );
}
