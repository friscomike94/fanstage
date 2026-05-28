import React, { useMemo, type RefObject } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import {
  BATTLE_PITCH_MAX,
  BATTLE_PITCH_TARGET_MIN,
  SOCIAL_PLATFORM_OPTIONS,
  type SocialPlatform,
  socialProofFromInput,
  hasAnySocialProof,
  type ArtistSocialProof,
} from "../lib/artistSocial";

const FIELD = {
  card: "#172033",
  border: "#334155",
  text: "#e2e8f0",
  muted: "#94a3b8",
  dim: "#64748b",
  accent: "#a78bfa",
  accentSoft: "#c4b5fd",
  warn: "#fbbf24",
};

export type BattleProofPitchValue = {
  proofPlatform: SocialPlatform;
  proofInput: string;
  battlePitch: string;
  social: ArtistSocialProof;
};

type Props = {
  proofPlatform: SocialPlatform;
  proofInput: string;
  battlePitch: string;
  onProofPlatformChange: (p: SocialPlatform) => void;
  onProofInputChange: (v: string) => void;
  onBattlePitchChange: (v: string) => void;
  labelsKo?: boolean;
  proofAnchorRef?: RefObject<View | null>;
  pitchAnchorRef?: RefObject<View | null>;
  onProofInputFocus?: () => void;
  onBattlePitchFocus?: () => void;
};

export function buildBattleProofPitchValue(
  proofPlatform: SocialPlatform,
  proofInput: string,
  battlePitch: string
): BattleProofPitchValue {
  const social = socialProofFromInput(proofPlatform, proofInput);
  return { proofPlatform, proofInput, battlePitch: battlePitch.trim(), social };
}

export function BattleProofPitchFields({
  proofPlatform,
  proofInput,
  battlePitch,
  onProofPlatformChange,
  onProofInputChange,
  onBattlePitchChange,
  labelsKo = true,
  proofAnchorRef,
  pitchAnchorRef,
  onProofInputFocus,
  onBattlePitchFocus,
}: Props) {
  const pitchLen = battlePitch.length;
  const pitchHint = useMemo(() => {
    if (pitchLen === 0) return labelsKo ? `${BATTLE_PITCH_TARGET_MIN}–${BATTLE_PITCH_MAX}자 권장` : `${BATTLE_PITCH_TARGET_MIN}–${BATTLE_PITCH_MAX} chars`;
    if (pitchLen < BATTLE_PITCH_TARGET_MIN) return labelsKo ? `조금 더 적어주세요 (${pitchLen}/${BATTLE_PITCH_TARGET_MIN}+)` : `Add detail (${pitchLen}/${BATTLE_PITCH_TARGET_MIN}+)`;
    if (pitchLen > BATTLE_PITCH_MAX) return labelsKo ? `최대 ${BATTLE_PITCH_MAX}자` : `Max ${BATTLE_PITCH_MAX}`;
    return `${pitchLen}/${BATTLE_PITCH_MAX}`;
  }, [pitchLen, labelsKo]);

  const proofOk = hasAnySocialProof(socialProofFromInput(proofPlatform, proofInput));

  return (
    <View>
      <Text style={{ color: FIELD.muted, fontWeight: "800", fontSize: 13, marginBottom: 8 }}>
        {labelsKo ? "배틀 증거 (소셜)" : "Battle proof"}
      </Text>
      <Text style={{ color: FIELD.dim, fontSize: 12, marginBottom: 8, lineHeight: 18 }}>
        {labelsKo ? "팬이 아티스트를 확인할 수 있는 링크 · 최소 1개" : "At least one profile link for fans to verify"}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {SOCIAL_PLATFORM_OPTIONS.map((opt) => {
          const on = proofPlatform === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => onProofPlatformChange(opt.id)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: on ? FIELD.accent : FIELD.border,
                backgroundColor: on ? "#2d1f4e" : FIELD.card,
              }}
            >
              <Text style={{ color: on ? FIELD.accentSoft : FIELD.dim, fontWeight: "800", fontSize: 11 }}>{opt.labelKo}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View ref={proofAnchorRef} collapsable={false}>
        <View
          style={{
            backgroundColor: FIELD.card,
            borderRadius: 16,
            padding: 14,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: proofOk ? FIELD.border : "#7f1d1d",
          }}
        >
          <TextInput
            placeholder={SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === proofPlatform)?.placeholder}
            placeholderTextColor={FIELD.dim}
            value={proofInput}
            onChangeText={onProofInputChange}
            onFocus={onProofInputFocus}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ color: FIELD.text, fontWeight: "600" }}
          />
        </View>
      </View>

      <View ref={pitchAnchorRef} collapsable={false}>
        <Text style={{ color: FIELD.muted, fontWeight: "800", fontSize: 13, marginBottom: 8 }}>
          {labelsKo ? "팬들이 응원할 이유" : "Battle pitch"}
        </Text>
        <View
          style={{
            backgroundColor: FIELD.card,
            borderRadius: 16,
            padding: 14,
            marginBottom: 6,
            borderWidth: 1,
            borderColor: FIELD.border,
          }}
        >
          <TextInput
            placeholder={labelsKo ? "이 밤에 이 아티스트를 응원해야 하는 이유…" : "Why fans should back this artist…"}
            placeholderTextColor={FIELD.dim}
            value={battlePitch}
            onChangeText={(t) => onBattlePitchChange(t.slice(0, BATTLE_PITCH_MAX))}
            onFocus={onBattlePitchFocus}
            multiline
            maxLength={BATTLE_PITCH_MAX}
            style={{ color: FIELD.text, fontWeight: "600", minHeight: 88, textAlignVertical: "top" }}
          />
        </View>
      </View>
      <Text style={{ color: pitchLen > BATTLE_PITCH_MAX ? FIELD.warn : FIELD.dim, fontSize: 12, marginBottom: 16 }}>{pitchHint}</Text>
    </View>
  );
}

/** Validate proof + pitch for submit. */
export function validateBattleProofPitch(
  proofPlatform: SocialPlatform,
  proofInput: string,
  battlePitch: string
): { ok: boolean; message?: string } {
  if (!hasAnySocialProof(socialProofFromInput(proofPlatform, proofInput))) {
    return { ok: false, message: "소셜 증거 링크를 입력해 주세요." };
  }
  const len = battlePitch.trim().length;
  if (len < 20) {
    return { ok: false, message: "응원 이유를 조금 더 적어 주세요." };
  }
  if (len > BATTLE_PITCH_MAX) {
    return { ok: false, message: `응원 이유는 ${BATTLE_PITCH_MAX}자 이하로 입력해 주세요.` };
  }
  return { ok: true };
}
