import React from "react";
import { Text, View } from "react-native";

export function StatusBadge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color, fontWeight: "800", fontSize: 11 }}>{label}</Text>
    </View>
  );
}
