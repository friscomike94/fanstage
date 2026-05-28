import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Artist, ArtistInviteDraft, ArtistInviteResponse, Race, VenueCandidate } from "./types";
import { estimateEconomics } from "./logic";
import { formatDeposit } from "./copy";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  race: Race;
  artist: Artist;
  venues: VenueCandidate[];
  backerCount: number;
  fanNotes: string[];
  inviteToken: string;
  onSubmit: (draft: ArtistInviteDraft) => void;
  onBack?: () => void;
  submitted?: boolean;
};

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: S.md }}>
      <Text style={{ color: OC.dim, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={OC.dim}
        style={{
          backgroundColor: OC.surface,
          borderRadius: 12,
          padding: S.md,
          color: OC.text,
          borderWidth: 1,
          borderColor: OC.border,
          minHeight: multiline ? 72 : undefined,
        }}
      />
    </View>
  );
}

export function ArtistInviteScreen({ race, artist, venues, backerCount, fanNotes, inviteToken, onSubmit, onBack, submitted }: Props) {
  const insets = useSafeAreaInsets();
  const [response, setResponse] = useState<ArtistInviteResponse | null>(null);
  const [preferredDates, setPreferredDates] = useState(race.preferredDate);
  const [minGuarantee, setMinGuarantee] = useState("");
  const [minAttendance, setMinAttendance] = useState("");
  const [productionNeeds, setProductionNeeds] = useState("");
  const [venueNotes, setVenueNotes] = useState("");
  const [preferredVenueId, setPreferredVenueId] = useState<string | undefined>(venues[0]?.id);
  const [notes, setNotes] = useState("");

  const economics = estimateEconomics(venues);

  const submit = () => {
    if (!response) return;
    onSubmit({
      response,
      preferredDates,
      minGuarantee: minGuarantee || undefined,
      minAttendance: minAttendance || undefined,
      productionNeeds: productionNeeds || undefined,
      venuePreferenceNotes: venueNotes || undefined,
      preferredVenueCandidateId: preferredVenueId,
      notes: notes || undefined,
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: OC.bg }}
      contentContainerStyle={{
        paddingHorizontal: S.lg,
        paddingTop: Math.max(insets.top + S.lg, 56),
        paddingBottom: Math.max(insets.bottom + S.xl, S.xl),
      }}
    >
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{ marginBottom: S.md }}>
          <Text style={{ color: OC.dim, fontWeight: "700" }}>← 닫기</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={{ color: OC.muted, fontWeight: "800", fontSize: 11, letterSpacing: 1.2 }}>PRIVATE INVITE · FANSTAGE</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 26, marginTop: S.xs, lineHeight: 32 }}>{artist.name}</Text>
      <Text style={{ color: OC.muted, fontSize: 15, marginTop: 4, lineHeight: 22 }}>
        {race.targetCity}에서 팬 {race.currentCount}명의 core가 이미 이 공연을 요청했습니다.
      </Text>

      <View style={{ backgroundColor: OC.card, borderRadius: 20, padding: S.md, marginTop: S.lg, borderWidth: 1, borderColor: OC.border }}>
        <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 12 }}>DEMAND SUMMARY</Text>
        <Text style={{ color: OC.text, fontWeight: "800", fontSize: 16, marginTop: S.sm, lineHeight: 24 }}>
          이 도시의 팬들이 이미 이 공연에 대한 수요를 증명했습니다.
        </Text>
        <Text style={{ color: OC.muted, marginTop: S.md, fontSize: 14 }}>
          {race.targetCity} · {artist.name} · {race.currentCount} core · 참여 {backerCount}명
        </Text>
        {fanNotes.length > 0 ? (
          <View style={{ marginTop: S.md }}>
            <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.xs }}>팬 메모 (샘플)</Text>
            {fanNotes.map((n, i) => (
              <Text key={i} style={{ color: OC.muted, fontSize: 13, lineHeight: 20 }}>
                · {n}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ backgroundColor: OC.surface, borderRadius: 16, padding: S.md, marginTop: S.md, borderWidth: 1, borderColor: OC.border }}>
        <Text style={{ color: OC.dim, fontWeight: "800", fontSize: 11 }}>제안 공연장 (2–3곳 · fanstage 검토)</Text>
        {venues.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => setPreferredVenueId(v.id)}
            style={{
              marginTop: S.sm,
              padding: S.sm,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: preferredVenueId === v.id ? OC.gold : OC.border,
              backgroundColor: preferredVenueId === v.id ? "#422006" : OC.card,
            }}
          >
            <Text style={{ color: OC.text, fontWeight: "800" }}>{v.name}</Text>
            <Text style={{ color: OC.muted, fontSize: 12, marginTop: 2 }}>
              {v.district} · 정원 {v.capacity}
              {v.note ? ` · ${v.note}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={{ color: OC.dim, fontSize: 11, marginTop: S.sm }}>최종 홀드·확정은 fanstage 운영이 진행합니다.</Text>
      </View>

      {economics ? (
        <View style={{ backgroundColor: OC.card, borderRadius: 16, padding: S.md, marginTop: S.md, borderWidth: 1, borderColor: OC.border }}>
          <Text style={{ color: OC.dim, fontWeight: "800", fontSize: 11 }}>ESTIMATED ECONOMICS (ROUGH)</Text>
          <Text style={{ color: OC.muted, marginTop: S.sm, fontSize: 13, lineHeight: 20 }}>
            정원 약 {economics.capacity}석 · 티켓 {formatDeposit(economics.ticketMin)}–{formatDeposit(economics.ticketMax)} 가정
          </Text>
          <Text style={{ color: OC.text, fontWeight: "800", marginTop: S.sm }}>
            예상 매출 {formatDeposit(economics.grossLow)} – {formatDeposit(economics.grossHigh)}
          </Text>
          <Text style={{ color: OC.muted, fontSize: 12, marginTop: 4 }}>
            아티스트 추정 net {formatDeposit(economics.netLow)} – {formatDeposit(economics.netHigh)} (베뉴·제작비 전)
          </Text>
        </View>
      ) : null}

      <View style={{ marginTop: S.md }}>
        <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.xs }}>가능 일정</Text>
        <Text style={{ color: OC.muted, fontSize: 14 }}>희망: {race.preferredDate}</Text>
        {race.backupDates.map((d) => (
          <Text key={d} style={{ color: OC.dim, fontSize: 13 }}>
            · {d}
          </Text>
        ))}
      </View>

      {submitted ? (
        <View style={{ marginTop: S.xl, padding: S.lg, backgroundColor: OC.fan.bg, borderRadius: 16, borderWidth: 1, borderColor: OC.fan.border }}>
          <Text style={{ color: OC.fan.primary, fontWeight: "900", fontSize: 17 }}>응답이 전달되었습니다</Text>
          <Text style={{ color: OC.muted, marginTop: S.sm, lineHeight: 22 }}>fanstage 운영팀이 조건을 검토한 뒤 연락드립니다.</Text>
        </View>
      ) : (
        <>
          <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18, marginTop: S.xl, marginBottom: S.sm }}>응답</Text>
          {(
            [
              { id: "interested" as const, label: "관심 있어요" },
              { id: "adjust_terms" as const, label: "조건 조정이 필요해요" },
              { id: "not_available" as const, label: "지금은 어려워요" },
            ] as const
          ).map((opt) => (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setResponse(opt.id)}
              style={{
                padding: S.md,
                borderRadius: 14,
                marginBottom: S.sm,
                borderWidth: 2,
                borderColor: response === opt.id ? OC.accent : OC.border,
                backgroundColor: response === opt.id ? "#14532d44" : OC.surface,
              }}
            >
              <Text style={{ color: OC.text, fontWeight: "800" }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}

          {response ? (
            <View style={{ marginTop: S.md }}>
              <Field label="선호 일정" value={preferredDates} onChange={setPreferredDates} />
              <Field label="최소 개런티 / 출연료 기대" value={minGuarantee} onChange={setMinGuarantee} placeholder="예: 150만원" />
              <Field label="최소 관객 / 입장 인원" value={minAttendance} onChange={setMinAttendance} placeholder="예: 80석" />
              <Field label="제작·기술 요구" value={productionNeeds} onChange={setProductionNeeds} multiline />
              <Field label="공연장 선호·제약" value={venueNotes} onChange={setVenueNotes} multiline />
              <Field label="추가 메모" value={notes} onChange={setNotes} multiline />
              <TouchableOpacity
                onPress={submit}
                style={{ backgroundColor: OC.accent, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: S.md }}
              >
                <Text style={{ color: OC.ink, fontWeight: "900", fontSize: 16 }}>비공개 응답 보내기</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </>
      )}

      <Text style={{ color: OC.dim, fontSize: 10, marginTop: S.lg, textAlign: "center" }}>
        Invite ref · {inviteToken.slice(0, 12)}…
      </Text>
    </ScrollView>
  );
}
