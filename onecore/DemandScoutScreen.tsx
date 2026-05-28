import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BattleArtistSocialProof } from "../components/BattleArtistSocialProof";
import {
  BattleProofPitchFields,
  buildBattleProofPitchValue,
  validateBattleProofPitch,
} from "../components/BattleProofPitchFields";
import type { SocialPlatform } from "../lib/artistSocial";
import { formatSocialProofSummary } from "../lib/artistSocial";
import type { DemandScoutCampaign, OnecoreState, ScoutCampaignDraft, ScoutConfidence } from "./types";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  state: OnecoreState;
  scoutId: string;
  onBack: () => void;
  onCreateCampaign: (draft: ScoutCampaignDraft) => void;
  onHandoff: (campaignId: string) => void;
  /** Legacy artist roster approvals — secondary tab */
  artistApprovalsSlot?: React.ReactNode;
};

const CONFIDENCE: { id: ScoutConfidence; label: string }[] = [
  { id: "low", label: "낮음" },
  { id: "medium", label: "중간" },
  { id: "high", label: "높음" },
];

function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (t: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: S.md }}>
      <Text style={{ color: OC.text, fontWeight: "800", fontSize: 14 }}>{label}</Text>
      {hint ? <Text style={{ color: OC.dim, fontSize: 12, marginTop: 2 }}>{hint}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor={OC.dim}
        style={{
          backgroundColor: OC.surface,
          borderRadius: 12,
          padding: S.md,
          color: OC.text,
          marginTop: S.xs,
          borderWidth: 1,
          borderColor: OC.border,
          minHeight: multiline ? 80 : undefined,
        }}
      />
    </View>
  );
}

export function DemandScoutScreen({ state, scoutId, onBack, onCreateCampaign, onHandoff, artistApprovalsSlot }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"scout" | "roster">("scout");
  const [artistId, setArtistId] = useState(state.artists[0]?.id ?? "");
  const [targetCity, setTargetCity] = useState("서울 · 홍대");
  const [whyNow, setWhyNow] = useState("");
  const [estimatedDemand, setEstimatedDemand] = useState("");
  const [venueSuggestions, setVenueSuggestions] = useState("");
  const [rallyCopy, setRallyCopy] = useState("");
  const [proofPlatform, setProofPlatform] = useState<SocialPlatform>("instagram");
  const [proofInput, setProofInput] = useState("");
  const [battlePitch, setBattlePitch] = useState("");
  const [scoutFormError, setScoutFormError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<ScoutConfidence>("medium");

  const campaigns = state.scoutCampaigns.filter((c) => c.scoutId === scoutId);

  const saveCampaign = () => {
    if (!artistId || !whyNow.trim()) return;
    const validation = validateBattleProofPitch(proofPlatform, proofInput, battlePitch);
    if (!validation.ok) {
      setScoutFormError(validation.message ?? "입력을 확인해 주세요.");
      return;
    }
    setScoutFormError(null);
    const proofPitch = buildBattleProofPitchValue(proofPlatform, proofInput, battlePitch);
    onCreateCampaign({
      artistId,
      targetCity,
      whyNow,
      estimatedDemand,
      venueSuggestions,
      rallyCopy: rallyCopy.trim() || proofPitch.battlePitch,
      artistBattlePitch: proofPitch.battlePitch,
      artistSocial: proofPitch.social,
      scoutConfidence: confidence,
      handoffState: "draft",
    });
    setWhyNow("");
    setRallyCopy("");
    setProofInput("");
    setBattlePitch("");
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
      <TouchableOpacity onPress={onBack} style={{ marginBottom: S.md }}>
        <Text style={{ color: OC.dim, fontWeight: "700" }}>← 뒤로</Text>
      </TouchableOpacity>

      <Text style={{ color: "#93c5fd", fontWeight: "900", fontSize: 11, letterSpacing: 1.2 }}>DEMAND SCOUT</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 24, marginTop: 4 }}>수요 캠페인 스카우팅</Text>
      <Text style={{ color: OC.muted, marginTop: S.sm, fontSize: 14, lineHeight: 22 }}>
        스카우트는 공연을 만드는 사람이 아니라, 팬이 증명할 수요를 찾습니다. 100 core 이후 fanstage가 아티스트·공연장을 비공개로 연결합니다.
      </Text>

      <View style={{ flexDirection: "row", marginTop: S.lg, marginBottom: S.md, gap: S.sm }}>
        <TouchableOpacity
          onPress={() => setTab("scout")}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: tab === "scout" ? "#1e3a5f" : OC.surface,
            borderWidth: 1,
            borderColor: tab === "scout" ? "#3b82f666" : OC.border,
          }}
        >
          <Text style={{ color: tab === "scout" ? "#93c5fd" : OC.dim, fontWeight: "900", textAlign: "center", fontSize: 13 }}>
            수요 스카우트
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab("roster")}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: tab === "roster" ? "#1e3a5f" : OC.surface,
            borderWidth: 1,
            borderColor: tab === "roster" ? "#3b82f666" : OC.border,
          }}
        >
          <Text style={{ color: tab === "roster" ? "#93c5fd" : OC.dim, fontWeight: "900", textAlign: "center", fontSize: 13 }}>
            아티스트 승인
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "roster" ? (
        artistApprovalsSlot ?? <Text style={{ color: OC.dim }}>승인 큐가 없습니다.</Text>
      ) : (
        <>
          <View style={{ backgroundColor: OC.card, borderRadius: 16, padding: S.md, marginBottom: S.lg, borderWidth: 1, borderColor: OC.border }}>
            <Text style={{ color: OC.dim, fontSize: 12, lineHeight: 20 }}>
              · 스카우트 → 팬이 core로 수요 증명{"\n"}· 100 core → 운영이 비공개 아티스트 초대{"\n"}· 공연장 최종 확정은 운영 전용
            </Text>
          </View>

          <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18, marginBottom: S.sm }}>새 수요 캠페인</Text>
          <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.sm }}>스카우트할 아티스트</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: S.xs, marginBottom: S.md }}>
            {state.artists.map((a) => (
              <TouchableOpacity
                key={a.id}
                onPress={() => setArtistId(a.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: artistId === a.id ? OC.fan.border : OC.border,
                  backgroundColor: artistId === a.id ? OC.fan.bg : OC.surface,
                }}
              >
                <Text style={{ color: OC.text, fontWeight: "700" }}>{a.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="타깃 도시" value={targetCity} onChange={setTargetCity} hint="예: 서울 · 홍대" />
          <Field
            label="왜 지금 이 아티스트인가"
            value={whyNow}
            onChange={setWhyNow}
            multiline
            hint="이 도시·이 시기에 통할 이유"
          />
          <Field label="예상 팬 수요" value={estimatedDemand} onChange={setEstimatedDemand} hint="예: 재즈 팬 80–120명" />
          <Field
            label="공연장 타입 / 후보 제안"
            value={venueSuggestions}
            onChange={setVenueSuggestions}
            multiline
            hint="팬·스카우트 제안일 뿐, 최종 확정은 운영"
          />
          <BattleProofPitchFields
            proofPlatform={proofPlatform}
            proofInput={proofInput}
            battlePitch={battlePitch}
            onProofPlatformChange={setProofPlatform}
            onProofInputChange={setProofInput}
            onBattlePitchChange={setBattlePitch}
          />
          {scoutFormError ? (
            <Text style={{ color: "#f87171", marginBottom: S.sm, fontWeight: "700", fontSize: 13 }}>{scoutFormError}</Text>
          ) : null}
          <Field label="팬 rally 카피 초안 (선택)" value={rallyCopy} onChange={setRallyCopy} multiline hint="비우면 응원 이유를 rally 카피로 사용" />
          <Text style={{ color: OC.dim, fontSize: 12, marginBottom: S.xs }}>스카우트 확신</Text>
          <View style={{ flexDirection: "row", gap: S.xs, marginBottom: S.md }}>
            {CONFIDENCE.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setConfidence(c.id)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: confidence === c.id ? OC.gold : OC.border,
                  backgroundColor: confidence === c.id ? "#422006" : OC.surface,
                }}
              >
                <Text style={{ color: OC.text, fontWeight: "700", textAlign: "center", fontSize: 12 }}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={saveCampaign}
            style={{ backgroundColor: "#3b82f6", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>캠페인 초안 저장</Text>
          </TouchableOpacity>

          <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18, marginTop: S.xl, marginBottom: S.sm }}>내 스카우트</Text>
          {campaigns.length === 0 ? (
            <Text style={{ color: OC.dim }}>아직 캠페인이 없습니다.</Text>
          ) : (
            campaigns.map((c) => <CampaignRow key={c.id} campaign={c} state={state} onHandoff={onHandoff} />)
          )}
        </>
      )}
    </ScrollView>
  );
}

function CampaignRow({
  campaign,
  state,
  onHandoff,
}: {
  campaign: DemandScoutCampaign;
  state: OnecoreState;
  onHandoff: (id: string) => void;
}) {
  const artist = state.artists.find((a) => a.id === campaign.artistId);
  return (
    <View
      style={{
        backgroundColor: OC.surface,
        borderRadius: 14,
        padding: S.md,
        marginBottom: S.sm,
        borderWidth: 1,
        borderColor: OC.border,
      }}
    >
      <Text style={{ color: OC.gold, fontSize: 11, fontWeight: "800" }}>{campaign.handoffState.toUpperCase()}</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 16, marginTop: 4 }}>
        {artist?.name} · {campaign.targetCity}
      </Text>
      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 4 }} numberOfLines={2}>
        {campaign.whyNow}
      </Text>
      {campaign.artistBattlePitch ? (
        <>
          <Text style={{ color: OC.dim, fontSize: 11, fontWeight: "800", marginTop: 8 }}>팬들이 응원할 이유</Text>
          <Text style={{ color: OC.muted, fontSize: 12, marginTop: 2 }} numberOfLines={2}>
            {campaign.artistBattlePitch}
          </Text>
        </>
      ) : null}
      {campaign.artistSocial ? (
        <>
          <Text style={{ color: OC.dim, fontSize: 11, fontWeight: "800", marginTop: 6 }}>소셜 증거</Text>
          <Text style={{ color: OC.dim, fontSize: 11, marginTop: 2 }}>{formatSocialProofSummary(campaign.artistSocial)}</Text>
          <BattleArtistSocialProof social={campaign.artistSocial} compact sectionLabel="아티스트 확인하기" />
        </>
      ) : artist?.social ? (
        <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" />
      ) : null}
      {campaign.handoffState !== "handed_off" ? (
        <TouchableOpacity
          onPress={() => onHandoff(campaign.id)}
          style={{ marginTop: S.sm, paddingVertical: 10, alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: OC.gold }}
        >
          <Text style={{ color: OC.gold, fontWeight: "800", fontSize: 13 }}>100 core 후 admin handoff 표시</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
