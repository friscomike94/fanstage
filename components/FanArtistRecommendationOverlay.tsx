import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BATTLE_PITCH_MAX,
  hasAnySocialProof,
  socialProofFromInput,
  SOCIAL_PLATFORM_OPTIONS,
  type SocialPlatform,
} from "../lib/artistSocial";
import {
  fanReasonLengthHint,
  normalizeOptionalFanSocial,
  validateFanArtistRecommendation,
  type FanArtistRecommendation,
} from "../onecore/fanRecommendations";

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
  ink: "#020617",
};

type Props = {
  onBack: () => void;
  onSubmit: (rec: Omit<FanArtistRecommendation, "id" | "createdAt" | "status">) => void;
};

function FieldBox({ children, borderColor }: { children: React.ReactNode; borderColor?: string }) {
  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: borderColor ?? C.border,
      }}
    >
      {children}
    </View>
  );
}

export function FanArtistRecommendationOverlay({ onBack, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [artistName, setArtistName] = useState("");
  const [proofPlatform, setProofPlatform] = useState<SocialPlatform>("instagram");
  const [proofInput, setProofInput] = useState("");
  const [fanReason, setFanReason] = useState("");
  const [fanSocial, setFanSocial] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const reasonAnchorRef = useRef<View>(null);
  const proofAnchorRef = useRef<View>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardInset(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardInset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const bottomPad = Math.max(140, keyboardInset + insets.bottom + 72);
  const reasonLen = fanReason.length;
  const reasonHint = useMemo(() => fanReasonLengthHint(reasonLen), [reasonLen]);
  const proofOk = hasAnySocialProof(socialProofFromInput(proofPlatform, proofInput));

  const scrollToRef = useCallback((ref: React.RefObject<View | null>) => {
    const content = contentRef.current;
    const anchor = ref.current;
    if (!content || !anchor) return;
    anchor.measureLayout(
      content,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 48), animated: true });
      },
      () => {}
    );
    if (Platform.OS === "ios") {
      setTimeout(() => {
        anchor.measureLayout(
          content,
          (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 48), animated: true }),
          () => {}
        );
      }, 280);
    }
  }, []);

  const handleSubmit = () => {
    const validation = validateFanArtistRecommendation({ artistName, proofPlatform, proofInput, fanReason });
    if (!validation.ok) {
      setFormError(validation.message ?? "입력을 확인해 주세요.");
      return;
    }
    setFormError(null);
    onSubmit({
      artistName: artistName.trim(),
      proofPlatform,
      proofInput: proofInput.trim(),
      artistSocial: socialProofFromInput(proofPlatform, proofInput),
      fanReason: fanReason.trim(),
      fanSocial: normalizeOptionalFanSocial(fanSocial),
    });
    setDone(true);
  };

  if (done) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: Math.max(insets.top + 12, 48),
            paddingBottom: bottomPad,
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: "center", borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✓</Text>
            <Text style={{ color: C.text, fontWeight: "900", fontSize: 20, textAlign: "center" }}>추천이 접수됐어요</Text>
            <Text style={{ color: C.muted, textAlign: "center", marginTop: 10, lineHeight: 20, fontSize: 14 }}>
              팬 추천이 모이면 ONECORE 후보로 검토합니다.
            </Text>
            <Text style={{ color: C.dim, textAlign: "center", marginTop: 12, lineHeight: 18, fontSize: 12 }}>
              100코어가 모이면 공연 가능성 검토가 시작돼요. 공연 확정은 아티스트·공연장·일정이 맞아야 가능합니다.
            </Text>
          </View>
          <TouchableOpacity onPress={onBack} style={{ marginTop: 20, paddingVertical: 14, alignItems: "center" }}>
            <Text style={{ color: C.accentSoft, fontWeight: "900", fontSize: 15 }}>Onecore로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 8 : 0}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: Math.max(insets.top + 8, 40),
          paddingBottom: bottomPad,
        }}
      >
        <View ref={contentRef} collapsable={false}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, right: 16, bottom: 12, left: 16 }} style={{ alignSelf: "flex-start", marginBottom: 16 }}>
          <Text style={{ color: C.muted, fontWeight: "800", fontSize: 15 }}>← 뒤로</Text>
        </TouchableOpacity>

        <Text style={{ color: C.gold, fontWeight: "900", fontSize: 11, letterSpacing: 1 }}>팬 추천</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 24, marginTop: 6 }}>아티스트 추천하기</Text>
        <Text style={{ color: C.muted, fontSize: 13, lineHeight: 20, marginTop: 8 }}>
          팬이 공연 아이디어를 제안합니다. fanstage가 검토해 ONECORE 캠페인 후보로 올릴 수 있어요.
        </Text>

        <Text style={{ color: C.muted, fontWeight: "800", fontSize: 13, marginTop: 20, marginBottom: 8 }}>아티스트 이름</Text>
        <FieldBox>
          <TextInput
            placeholder="아티스트 이름"
            placeholderTextColor={C.dim}
            value={artistName}
            onChangeText={setArtistName}
            style={{ color: C.text, fontWeight: "600" }}
          />
        </FieldBox>

        <Text style={{ color: C.muted, fontWeight: "800", fontSize: 13, marginTop: 16, marginBottom: 8 }}>아티스트 확인 링크</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {SOCIAL_PLATFORM_OPTIONS.map((opt) => {
            const on = proofPlatform === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setProofPlatform(opt.id)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: on ? C.accent : C.border,
                  backgroundColor: on ? "#14532d" : C.card,
                }}
              >
                <Text style={{ color: on ? C.accentSoft : C.dim, fontWeight: "800", fontSize: 11 }}>{opt.labelKo}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View ref={proofAnchorRef} collapsable={false}>
          <FieldBox borderColor={proofOk ? C.border : "#7f1d1d"}>
            <TextInput
              placeholder={SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === proofPlatform)?.placeholder}
              placeholderTextColor={C.dim}
              value={proofInput}
              onChangeText={setProofInput}
              onFocus={() => scrollToRef(proofAnchorRef)}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ color: C.text, fontWeight: "600" }}
            />
          </FieldBox>
        </View>

        <View ref={reasonAnchorRef} collapsable={false}>
          <Text style={{ color: C.muted, fontWeight: "800", fontSize: 13, marginTop: 16, marginBottom: 8 }}>
            팬들이 공연을 원하는 이유
          </Text>
          <FieldBox>
            <TextInput
              placeholder="왜 이 아티스트의 공연이 열려야 하나요?"
              placeholderTextColor={C.dim}
              value={fanReason}
              onChangeText={(t) => setFanReason(t.slice(0, BATTLE_PITCH_MAX))}
              onFocus={() => scrollToRef(reasonAnchorRef)}
              multiline
              maxLength={BATTLE_PITCH_MAX}
              style={{ color: C.text, fontWeight: "600", minHeight: 96, textAlignVertical: "top" }}
            />
          </FieldBox>
        </View>
        <Text style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{reasonHint}</Text>

        <Text style={{ color: C.muted, fontWeight: "800", fontSize: 13, marginTop: 16, marginBottom: 8 }}>
          내 소셜미디어 <Text style={{ color: C.dim, fontWeight: "600" }}>(선택)</Text>
        </Text>
        <FieldBox>
          <TextInput
            placeholder="추천한 팬을 확인할 수 있는 Instagram/TikTok 링크"
            placeholderTextColor={C.dim}
            value={fanSocial}
            onChangeText={setFanSocial}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ color: C.text, fontWeight: "600" }}
          />
        </FieldBox>

        <Text style={{ color: C.dim, fontSize: 11, lineHeight: 17, marginTop: 14 }}>
          이 양식은 아티스트 가입이 아닙니다. fanstage가 검토한 뒤 ONECORE 캠페인을 만들 수 있으며, 100코어로 수요가
          증명되면 공연 가능성 검토가 시작됩니다.
        </Text>

        {formError ? (
          <Text style={{ color: "#f87171", fontWeight: "700", marginTop: 12, fontSize: 13 }}>{formError}</Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          style={{
            marginTop: 16,
            backgroundColor: C.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: C.ink, fontWeight: "900", fontSize: 16 }}>추천 보내기</Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
