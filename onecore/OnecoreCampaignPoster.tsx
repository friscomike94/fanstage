import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import type { OnecoreCardVariant } from "./copy";
import type { CampaignVisualMeta } from "./campaignVisuals";
import { resolveCampaignVisualSource } from "./campaignVisuals";
import { OC } from "./tokens";

const POSTER_ASPECT = 16 / 9;

type Props = {
  image?: CampaignVisualMeta;
  variant: OnecoreCardVariant;
  badgeLabel: string;
  badgeColor: string;
};

export function OnecoreCampaignPoster({ image, variant, badgeLabel, badgeColor }: Props) {
  const source = resolveCampaignVisualSource(image);
  const cropY = image?.cropFocusY ?? 0.5;
  const isIllustration = image?.source === "illustration";
  const dimmer =
    (variant === "reviewing" ? 0.52 : variant === "ticket" ? 0.38 : 0.32) + (isIllustration ? 0.1 : 0);
  const tint =
    variant === "ticket" ? "rgba(20, 83, 45, 0.22)" : variant === "reviewing" ? "rgba(15, 23, 42, 0.28)" : "transparent";

  return (
    <View style={styles.wrap} accessibilityLabel={image?.alt}>
      {source ? (
        <Image
          source={source}
          accessibilityLabel={image?.alt}
          resizeMode="cover"
          style={[
            styles.image,
            { transform: [{ translateY: -((cropY - 0.5) * 28) }] },
          ]}
        />
      ) : (
        <View style={[styles.image, styles.fallback]} />
      )}
      <View style={[styles.scrim, { opacity: dimmer }]} />
      {tint !== "transparent" ? <View style={[styles.tint, { backgroundColor: tint }]} /> : null}
      <View style={styles.bottomFade} />
      <View style={styles.badge}>
        <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    aspectRatio: POSTER_ASPECT,
    backgroundColor: OC.surface,
    overflow: "hidden",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  image: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "130%",
    width: "100%",
  },
  fallback: {
    backgroundColor: "#1e293b",
    height: "100%",
    top: 0,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "42%",
    backgroundColor: "rgba(2, 6, 23, 0.55)",
  },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  badgeText: {
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.8,
  },
});
