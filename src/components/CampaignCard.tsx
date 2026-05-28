import React from "react";
import { View } from "react-native";

export function CampaignCard({ children, borderColor }: { children: React.ReactNode; borderColor?: string }) {
  return (
    <View
      style={{
        backgroundColor: "#172033",
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: borderColor ?? "#263247",
      }}
    >
      {children}
    </View>
  );
}
