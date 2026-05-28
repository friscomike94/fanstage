import React from "react";
import { Text, View } from "react-native";
import { BackButton } from "./BackButton";

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  eyebrow,
  titleColor,
  titleSize,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  eyebrow?: string;
  titleColor?: string;
  titleSize?: number;
}) {
  const size = titleSize ?? 32;
  return (
    <View style={{ marginTop: 12, marginBottom: 28 }}>
      {onBack ? <BackButton onPress={onBack} color="#86efac" marginBottom={20} /> : null}
      {eyebrow ? <Text style={{ color: "#f472b6", fontWeight: "800", fontSize: 11, marginBottom: 8 }}>{eyebrow}</Text> : null}
      <Text style={{ color: titleColor ?? "#ffffff", fontSize: size, fontWeight: "900", lineHeight: size + 6, letterSpacing: -1 }}>{title}</Text>
      {subtitle ? <Text style={{ color: "#94a3b8", fontSize: 16, lineHeight: 24, marginTop: 12, fontWeight: "600" }}>{subtitle}</Text> : null}
    </View>
  );
}
