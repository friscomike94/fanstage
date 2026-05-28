import React from "react";
import { Text, TouchableOpacity } from "react-native";

export function BackButton({ onPress, color = "#86efac", marginBottom = 20 }: { onPress: () => void; color?: string; marginBottom?: number }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, right: 16, bottom: 10, left: 16 }}
      style={{ alignSelf: "flex-start", justifyContent: "center", minHeight: 44, marginBottom }}
    >
      <Text style={{ color, fontWeight: "800", fontSize: 16 }}>← Back</Text>
    </TouchableOpacity>
  );
}
