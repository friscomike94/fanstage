import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import type { ArtistSocialProof } from "../lib/artistSocial";
import { listSocialLinks } from "../lib/artistSocial";

const PROOF_COLORS = {
  text: "#e2e8f0",
  muted: "#94a3b8",
  dim: "#64748b",
  border: "#334155",
  primaryBg: "#1e293b",
  primaryBorder: "#475569",
  chipBg: "#172033",
  chipBorder: "#334155",
  accent: "#22c55e",
};

type Props = {
  social?: ArtistSocialProof;
  compact?: boolean;
  sectionLabel?: string;
};

export async function openArtistSocialUrl(url: string): Promise<void> {
  try {
    const can = await Linking.canOpenURL(url);
    if (can) await Linking.openURL(url);
  } catch {
    /* ignore invalid URLs */
  }
}

export function BattleArtistSocialProof({
  social,
  compact = false,
  sectionLabel = "아티스트 확인하기",
}: Props) {
  const links = listSocialLinks(social);
  if (links.length === 0) return null;

  const primary = links.find((l) => l.isPrimary) ?? links[0];
  const rest = links.filter((l) => l.url !== primary.url);

  return (
    <View style={{ marginTop: compact ? 8 : 12 }}>
      <Text style={{ color: PROOF_COLORS.dim, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, marginBottom: 6 }}>
        {sectionLabel}
      </Text>
      <TouchableOpacity
        onPress={() => openArtistSocialUrl(primary.url)}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: PROOF_COLORS.primaryBg,
          borderRadius: 12,
          paddingVertical: compact ? 10 : 12,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: PROOF_COLORS.primaryBorder,
          marginBottom: rest.length > 0 ? 8 : 0,
        }}
      >
        <Text style={{ color: PROOF_COLORS.text, fontWeight: "800", fontSize: compact ? 13 : 14 }}>
          이 아티스트 보기 · {primary.label}
        </Text>
        <Text style={{ color: PROOF_COLORS.accent, fontWeight: "900", fontSize: 12 }}>열기</Text>
      </TouchableOpacity>
      {rest.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {rest.map((link) => (
            <TouchableOpacity
              key={link.platform}
              onPress={() => openArtistSocialUrl(link.url)}
              activeOpacity={0.85}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: PROOF_COLORS.chipBg,
                borderWidth: 1,
                borderColor: PROOF_COLORS.chipBorder,
              }}
            >
              <Text style={{ color: PROOF_COLORS.muted, fontWeight: "700", fontSize: 11 }}>{link.shortLabel}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
