import React from "react";
import { View, Image, StyleSheet, type ImageSourcePropType } from "react-native";
import type { CampaignIllustrationKey } from "./campaignVisuals";
import { illustrationSource } from "./campaignVisuals";

type Props = {
  illustrationKey: CampaignIllustrationKey;
  cropFocusY?: number;
  height: number;
  children: React.ReactNode;
  /** Extra darkening for text legibility */
  scrimOpacity?: number;
  borderRadius?: number;
};

export function IllustrationBackdrop({
  illustrationKey,
  cropFocusY = 0.5,
  height,
  children,
  scrimOpacity = 0.62,
  borderRadius = 0,
}: Props) {
  const source: ImageSourcePropType = illustrationSource(illustrationKey);

  return (
    <View style={[styles.wrap, { height, borderRadius }]}>
      <Image
        source={source}
        resizeMode="cover"
        style={[styles.image, { transform: [{ translateY: -((cropFocusY - 0.5) * 32) }] }]}
      />
      <View style={[styles.scrim, { opacity: scrimOpacity }]} />
      <View style={styles.bottomFade} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: "#0f172a",
  },
  image: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "135%",
    width: "100%",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "50%",
    backgroundColor: "rgba(2, 6, 23, 0.45)",
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
  },
});
