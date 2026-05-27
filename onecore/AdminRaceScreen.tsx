import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { OnecoreState, Race, RaceDraft, RaceEventLog, RaceOperations, RaceStatus } from "./types";
import { raceStatusLabel } from "./copy";
import { allStatuses } from "./logic";
import { DEFAULT_REFUND_POLICY_ID } from "./seed";
import { OC, OC_SPACE as S } from "./tokens";

type AdminMode = "list" | "edit" | "status" | "ops" | "logs";

type Props = {
  state: OnecoreState;
  adminId: string;
  onBack: () => void;
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
};

const emptyDraft = (): RaceDraft => ({
  title: "",
  artistId: "",
  proposalReason: "",
  targetCount: 100,
  deadline: "2026-12-31",
  paymentType: "deposit",
  depositAmount: 30000,
  refundPolicyId: DEFAULT_REFUND_POLICY_ID,
  preferredDate: "",
  backupDates: [],
  venueCandidateIds: [],
});

const emptyOperations = (): RaceOperations => ({
  artistContactChannel: "instagram_dm",
  artistContactTarget: "",
  artistOutreachNote: "",
  artistResponseDeadline: "",
  assignedVenueId: "",
  venueHoldUntil: "",
  productionCostEstimate: 0,
  scoutFeePercent: 3,
  platformFeePercent: 8,
  minTicketPrice: 35000,
  termsNote: "",
  refundReviewDate: "",
});

export function AdminRaceScreen({ state, adminId, onBack, onCreate, onUpdate, onUpdateOperations, onStatusChange }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AdminMode>("list");
  const [selectedId, setSelectedId] = useState(state.races[0]?.id ?? "");
  const [draft, setDraft] = useState<RaceDraft>(emptyDraft());
  const [statusTo, setStatusTo] = useState<RaceStatus>("active");
  const [statusReason, setStatusReason] = useState("");
  const [statusPublic, setStatusPublic] = useState(true);
  const [operations, setOperations] = useState<RaceOperations>(emptyOperations());
  const [isNew, setIsNew] = useState(false);

  const selected = state.races.find((r) => r.id === selectedId);
  const logs = state.eventLogs.filter((l) => l.raceId === selectedId);
  const screenContentStyle = {
    paddingHorizontal: S.lg,
    paddingTop: Math.max(insets.top + S.lg, 56),
    paddingBottom: Math.max(insets.bottom + S.xl, S.xl),
  };

  const openEdit = (race?: Race) => {
    if (race) {
      setIsNew(false);
      setSelectedId(race.id);
      setDraft({
        title: race.title,
        artistId: race.artistId,
        proposalReason: race.proposalReason,
        targetCount: race.targetCount,
        deadline: race.deadline,
        paymentType: race.paymentType,
        depositAmount: race.depositAmount,
        refundPolicyId: race.refundPolicyId,
        preferredDate: race.preferredDate,
        backupDates: race.backupDates,
        venueCandidateIds: race.venueCandidateIds,
      });
    } else {
      setIsNew(true);
      setDraft(emptyDraft());
      if (state.artists[0]) setDraft((d) => ({ ...d, artistId: state.artists[0].id }));
    }
    setMode("edit");
  };

  const openOps = (race: Race) => {
    setSelectedId(race.id);
    setOperations({
      artistContactChannel: race.artistContactChannel ?? "instagram_dm",
      artistContactTarget: race.artistContactTarget ?? "",
      artistOutreachNote: race.artistOutreachNote ?? "",
      artistResponseDeadline: race.artistResponseDeadline ?? "",
      assignedVenueId: race.assignedVenueId ?? "",
      venueHoldUntil: race.venueHoldUntil ?? "",
      productionCostEstimate: race.productionCostEstimate ?? 0,
      scoutFeePercent: race.scoutFeePercent ?? 3,
      platformFeePercent: race.platformFeePercent ?? 8,
      minTicketPrice: race.minTicketPrice ?? 35000,
      termsNote: race.termsNote ?? "",
      refundReviewDate: race.refundReviewDate ?? "",
    });
    setMode("ops");
  };

  const saveDraft = () => {
    if (!draft.title.trim() || !draft.artistId) return;
    if (isNew) {
      onCreate(draft, false);
      setMode("list");
    } else {
      onUpdate(selectedId, draft);
      setMode("list");
    }
  };

  const publishDraft = () => {
    if (!draft.title.trim()) return;
    if (isNew) onCreate(draft, true);
    else onUpdate(selectedId, draft);
    if (!isNew && selected) onStatusChange(selectedId, "active", "관리자 게시", true);
    setMode("list");
  };

  if (mode === "edit") {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: OC.bg }} contentContainerStyle={screenContentStyle}>
        <Header title={isNew ? "Race 생성" : "Race 수정"} onBack={() => setMode("list")} />
        <Field label="제목" value={draft.title} onChange={(t) => setDraft((d) => ({ ...d, title: t }))} />
        <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.sm }}>아티스트 ID</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs, marginBottom: S.md }}>
          {state.artists.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setDraft((d) => ({ ...d, artistId: a.id }))}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: draft.artistId === a.id ? OC.fan.bg : OC.surface,
                borderWidth: 1,
                borderColor: draft.artistId === a.id ? OC.fan.border : OC.border,
              }}
            >
              <Text style={{ color: OC.text, fontWeight: "700" }}>{a.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="제안 이유"
          value={draft.proposalReason}
          onChange={(t) => setDraft((d) => ({ ...d, proposalReason: t }))}
          multiline
        />
        <Field
          label="목표 인원"
          value={String(draft.targetCount)}
          onChange={(t) => setDraft((d) => ({ ...d, targetCount: parseInt(t, 10) || 0 }))}
          keyboard="numeric"
        />
        <Field label="마감일" value={draft.deadline} onChange={(t) => setDraft((d) => ({ ...d, deadline: t }))} />
        <Field
          label="예치금 (원)"
          value={String(draft.depositAmount)}
          onChange={(t) => setDraft((d) => ({ ...d, depositAmount: parseInt(t, 10) || 0 }))}
          keyboard="numeric"
        />
        <Field label="희망일" value={draft.preferredDate} onChange={(t) => setDraft((d) => ({ ...d, preferredDate: t }))} />
        <TouchableOpacity onPress={saveDraft} style={btnSecondary}>
          <Text style={{ color: OC.text, fontWeight: "900" }}>저장 (초안)</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={publishDraft} style={[btnPrimary, { marginTop: S.sm }]}>
          <Text style={{ color: OC.ink, fontWeight: "900" }}>게시 · active</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (mode === "status" && selected) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: OC.bg }} contentContainerStyle={screenContentStyle}>
        <Header title="상태 변경" onBack={() => setMode("list")} />
        <Text style={{ color: OC.muted, marginBottom: S.md }}>
          현재: {raceStatusLabel(selected.status)} · {selected.currentCount}/{selected.targetCount}
        </Text>
        <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.sm }}>변경할 상태</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs, marginBottom: S.md }}>
          {allStatuses().map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusTo(s)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: statusTo === s ? OC.gold + "33" : OC.surface,
                borderWidth: 1,
                borderColor: statusTo === s ? OC.gold : OC.border,
              }}
            >
              <Text style={{ color: OC.text, fontSize: 11, fontWeight: "700" }}>{raceStatusLabel(s)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field label="사유 (로그에 기록)" value={statusReason} onChange={setStatusReason} multiline />
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: S.md }}>
          <Text style={{ color: OC.text, flex: 1, fontWeight: "700" }}>팬에게 공개</Text>
          <Switch value={statusPublic} onValueChange={setStatusPublic} />
        </View>
        <TouchableOpacity
          onPress={() => {
            if (!statusReason.trim()) return;
            onStatusChange(selectedId, statusTo, statusReason.trim(), statusPublic);
            setStatusReason("");
            setMode("list");
          }}
          style={btnPrimary}
        >
          <Text style={{ color: OC.ink, fontWeight: "900" }}>상태 변경 · 로그 남기기</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (mode === "ops" && selected) {
    const assignedVenue = state.venueCandidates.find((v) => v.id === operations.assignedVenueId);

    return (
      <ScrollView style={{ flex: 1, backgroundColor: OC.bg }} contentContainerStyle={screenContentStyle}>
        <Header title="운영 플로우" onBack={() => setMode("list")} />
        <Text style={{ color: OC.muted, marginBottom: S.md, lineHeight: 20 }}>
          {selected.title} · {raceStatusLabel(selected.status)}
        </Text>

        <OpsStage
          title="1. 아티스트 연락"
          body="공개 압박이 아니라 private invitation으로 시작합니다."
          active={selected.status === "artist_contacting"}
        />
        <ChannelPicker
          value={operations.artistContactChannel ?? "instagram_dm"}
          onChange={(artistContactChannel) => setOperations((o) => ({ ...o, artistContactChannel }))}
        />
        <Field
          label="연락 대상"
          value={operations.artistContactTarget ?? ""}
          onChange={(artistContactTarget) => setOperations((o) => ({ ...o, artistContactTarget }))}
        />
        <Field
          label="아티스트 응답 마감"
          value={operations.artistResponseDeadline ?? ""}
          onChange={(artistResponseDeadline) => setOperations((o) => ({ ...o, artistResponseDeadline }))}
        />
        <Field
          label="아티스트 연락 메모"
          value={operations.artistOutreachNote ?? ""}
          onChange={(artistOutreachNote) => setOperations((o) => ({ ...o, artistOutreachNote }))}
          multiline
        />

        <OpsStage
          title="2. 공연장 매칭"
          body="100코어는 자동 배정이 아니라 운영자가 room fit을 판단하는 신호입니다."
          active={selected.status === "venue_matching"}
        />
        <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.sm }}>배정 공연장</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs, marginBottom: S.md }}>
          {state.venueCandidates.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              onPress={() => setOperations((o) => ({ ...o, assignedVenueId: venue.id }))}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: operations.assignedVenueId === venue.id ? OC.fan.bg : OC.surface,
                borderWidth: 1,
                borderColor: operations.assignedVenueId === venue.id ? OC.fan.border : OC.border,
              }}
            >
              <Text style={{ color: OC.text, fontWeight: "800", fontSize: 12 }}>{venue.name}</Text>
              <Text style={{ color: OC.dim, fontSize: 10, marginTop: 2 }}>
                {venue.district} · {venue.capacity}명
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Field
          label="베뉴 hold 만료"
          value={operations.venueHoldUntil ?? ""}
          onChange={(venueHoldUntil) => setOperations((o) => ({ ...o, venueHoldUntil }))}
        />

        <OpsStage
          title="3. 조건 확인"
          body="베뉴/제작비를 먼저 빼고도 아티스트 payout이 살아있는지 확인합니다."
          active={selected.status === "confirming_terms"}
        />
        <Field
          label="제작/설치/정리 예상비"
          value={String(operations.productionCostEstimate ?? 0)}
          onChange={(t) => setOperations((o) => ({ ...o, productionCostEstimate: parseInt(t, 10) || 0 }))}
          keyboard="numeric"
        />
        <Field
          label="최소 티켓가"
          value={String(operations.minTicketPrice ?? 0)}
          onChange={(t) => setOperations((o) => ({ ...o, minTicketPrice: parseInt(t, 10) || 0 }))}
          keyboard="numeric"
        />
        <View style={{ flexDirection: "row", gap: S.sm }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Scout %"
              value={String(operations.scoutFeePercent ?? 0)}
              onChange={(t) => setOperations((o) => ({ ...o, scoutFeePercent: parseFloat(t) || 0 }))}
              keyboard="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Platform %"
              value={String(operations.platformFeePercent ?? 0)}
              onChange={(t) => setOperations((o) => ({ ...o, platformFeePercent: parseFloat(t) || 0 }))}
              keyboard="numeric"
            />
          </View>
        </View>
        <Field
          label="조건 메모"
          value={operations.termsNote ?? ""}
          onChange={(termsNote) => setOperations((o) => ({ ...o, termsNote }))}
          multiline
        />
        <Field
          label="환불 검토일"
          value={operations.refundReviewDate ?? ""}
          onChange={(refundReviewDate) => setOperations((o) => ({ ...o, refundReviewDate }))}
        />

        <View style={{ backgroundColor: OC.surface, borderRadius: 14, padding: S.md, marginBottom: S.md, borderWidth: 1, borderColor: OC.border }}>
          <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 12 }}>운영 요약</Text>
          <Text style={{ color: OC.text, fontWeight: "800", marginTop: 6 }}>{assignedVenue?.name ?? "공연장 미배정"}</Text>
          <Text style={{ color: OC.dim, fontSize: 12, marginTop: 4 }}>
            Scout {operations.scoutFeePercent ?? 0}% · Platform {operations.platformFeePercent ?? 0}% · 티켓 {operations.minTicketPrice ?? 0}원
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            onUpdateOperations(selectedId, operations);
            setMode("list");
          }}
          style={btnPrimary}
        >
          <Text style={{ color: OC.ink, fontWeight: "900" }}>운영 플로우 저장</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (mode === "logs") {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: OC.bg }} contentContainerStyle={screenContentStyle}>
        <Header title="상태 변경 로그" onBack={() => setMode("list")} />
        {logs.length === 0 ? (
          <Text style={{ color: OC.dim }}>로그가 없습니다.</Text>
        ) : (
          logs.map((log) => <LogRow key={log.id} log={log} />)
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: OC.bg }} contentContainerStyle={screenContentStyle}>
      <Header title="ONECORE Race Admin" onBack={onBack} />
      <Text style={{ color: OC.muted, marginBottom: S.md, lineHeight: 20 }}>
        Race 생성/수정 · 상태 변경은 반드시 RaceEventLog에 기록됩니다.
      </Text>
      <TouchableOpacity onPress={() => openEdit()} style={[btnPrimary, { marginBottom: S.md }]}>
        <Text style={{ color: OC.ink, fontWeight: "900" }}>+ 새 Race</Text>
      </TouchableOpacity>
      {state.races.map((race) => {
        const artist = state.artists.find((a) => a.id === race.artistId);
        return (
          <View
            key={race.id}
            style={{
              backgroundColor: OC.card,
              borderRadius: 16,
              padding: S.md,
              marginBottom: S.sm,
              borderWidth: 1,
              borderColor: OC.border,
            }}
          >
            <Text style={{ color: OC.gold, fontWeight: "800", fontSize: 11 }}>{raceStatusLabel(race.status)}</Text>
            <Text style={{ color: OC.text, fontWeight: "900", fontSize: 17, marginTop: 4 }}>{race.title}</Text>
            <Text style={{ color: OC.muted, fontSize: 13 }}>
              {artist?.name} · {race.currentCount}/{race.targetCount} · {race.deadline}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs, marginTop: S.sm }}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedId(race.id);
                  openEdit(race);
                }}
                style={chip}
              >
                <Text style={chipText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedId(race.id);
                  setStatusTo(race.status);
                  setMode("status");
                }}
                style={chip}
              >
                <Text style={chipText}>상태</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openOps(race)} style={chip}>
                <Text style={chipText}>운영</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedId(race.id);
                  setMode("logs");
                }}
                style={chip}
              >
                <Text style={chipText}>로그</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={{ marginBottom: S.lg }}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 12, right: 16, bottom: 12, left: 16 }}
        style={{ alignSelf: "flex-start", marginBottom: S.lg }}
      >
        <Text style={{ color: OC.muted, fontWeight: "800", fontSize: 15 }}>← 뒤로</Text>
      </TouchableOpacity>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 22 }}>{title}</Text>
      <Text style={{ color: OC.dim, fontSize: 12, marginTop: 4 }}>운영자 · {title}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  keyboard?: "numeric" | "default";
}) {
  return (
    <View style={{ marginBottom: S.md }}>
      <Text style={{ color: OC.dim, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        keyboardType={keyboard}
        placeholderTextColor={OC.dim}
        style={{
          backgroundColor: OC.surface,
          borderRadius: 12,
          padding: S.md,
          color: OC.text,
          borderWidth: 1,
          borderColor: OC.border,
          minHeight: multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}

function ChannelPicker({
  value,
  onChange,
}: {
  value: NonNullable<Race["artistContactChannel"]>;
  onChange: (value: NonNullable<Race["artistContactChannel"]>) => void;
}) {
  const channels: { id: NonNullable<Race["artistContactChannel"]>; label: string }[] = [
    { id: "official_email", label: "공식 이메일" },
    { id: "instagram_dm", label: "Instagram DM" },
    { id: "agency", label: "소속사" },
    { id: "other", label: "기타" },
  ];

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs, marginBottom: S.md }}>
      {channels.map((channel) => (
        <TouchableOpacity
          key={channel.id}
          onPress={() => onChange(channel.id)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: value === channel.id ? OC.gold + "33" : OC.surface,
            borderWidth: 1,
            borderColor: value === channel.id ? OC.gold : OC.border,
          }}
        >
          <Text style={{ color: OC.text, fontWeight: "800", fontSize: 12 }}>{channel.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function OpsStage({ title, body, active }: { title: string; body: string; active: boolean }) {
  return (
    <View
      style={{
        backgroundColor: active ? OC.fan.bg : OC.card,
        borderRadius: 14,
        padding: S.md,
        marginTop: S.md,
        marginBottom: S.md,
        borderWidth: 1,
        borderColor: active ? OC.fan.border : OC.border,
      }}
    >
      <Text style={{ color: active ? OC.fan.primary : OC.gold, fontWeight: "900" }}>{title}</Text>
      <Text style={{ color: OC.muted, fontSize: 13, lineHeight: 19, marginTop: 4 }}>{body}</Text>
    </View>
  );
}

function LogRow({ log }: { log: RaceEventLog }) {
  return (
    <View
      style={{
        backgroundColor: OC.surface,
        borderRadius: 12,
        padding: S.md,
        marginBottom: S.sm,
        borderWidth: 1,
        borderColor: OC.border,
      }}
    >
      <Text style={{ color: OC.dim, fontSize: 11 }}>{log.timestamp}</Text>
      <Text style={{ color: OC.text, fontWeight: "800", marginTop: 4 }}>
        {raceStatusLabel(log.fromStatus)} → {raceStatusLabel(log.toStatus)}
      </Text>
      <Text style={{ color: OC.muted, marginTop: 4, fontSize: 13 }}>{log.reason}</Text>
      <Text style={{ color: OC.dim, fontSize: 11, marginTop: 4 }}>
        by {log.changedBy} · {log.visibleToPublic ? "공개" : "비공개"}
      </Text>
    </View>
  );
}

const btnPrimary = { backgroundColor: OC.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" as const };
const btnSecondary = { backgroundColor: OC.surface, borderRadius: 14, paddingVertical: 14, alignItems: "center" as const, borderWidth: 1, borderColor: OC.border };
const chip = { backgroundColor: OC.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: OC.border };
const chipText = { color: OC.accentSoft, fontWeight: "800" as const, fontSize: 12 };
