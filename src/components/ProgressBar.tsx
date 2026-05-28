import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

export function ProgressBar({
  total,
  minGoal,
  capacity,
  fillColor,
  animateOnMount = false,
}: {
  total: number;
  minGoal: number;
  capacity: number;
  fillColor: string;
  animateOnMount?: boolean;
}) {
  const fillRatio = Math.min(1, total / capacity);
  const fillPct = fillRatio * 100;
  const minMarkerPct = Math.min(98, (minGoal / capacity) * 100);
  const fillWidth = useRef(new Animated.Value(0)).current;
  const markerOpacity = useRef(new Animated.Value(0.7)).current;
  const didAnimateFill = useRef(false);
  const pulseRef = useRef<Animated.CompositeAnimation | null>(null);

  const startMarkerPulse = useCallback(() => {
    if (!animateOnMount) {
      markerOpacity.setValue(1);
      return;
    }
    pulseRef.current?.stop();
    markerOpacity.setValue(0.7);
    pulseRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(markerOpacity, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(markerOpacity, { toValue: 0.7, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulseRef.current.start();
  }, [animateOnMount, markerOpacity]);

  const onTrackLayout = useCallback(
    (width: number) => {
      if (width < 1) return;
      const target = width * fillRatio;

      if (!animateOnMount) {
        fillWidth.setValue(target);
        return;
      }

      if (didAnimateFill.current) return;
      didAnimateFill.current = true;
      fillWidth.setValue(0);
      startMarkerPulse();
      Animated.timing(fillWidth, {
        toValue: target,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    },
    [animateOnMount, fillRatio, fillWidth, startMarkerPulse]
  );

  useEffect(() => {
    return () => pulseRef.current?.stop();
  }, []);

  return (
    <View style={{ marginTop: 12 }}>
      <View
        style={{ height: 8, position: "relative", width: "100%" }}
        onLayout={(e) => onTrackLayout(e.nativeEvent.layout.width)}
        collapsable={false}
      >
        <View style={{ height: 8, backgroundColor: "#1e293b", borderRadius: 999, overflow: "hidden" }}>
          {animateOnMount ? (
            <Animated.View
              style={{
                width: fillWidth,
                height: "100%",
                backgroundColor: fillColor,
                borderRadius: 999,
                opacity: 0.9,
              }}
            />
          ) : (
            <View
              style={{
                width: `${fillPct}%`,
                height: "100%",
                backgroundColor: fillColor,
                borderRadius: 999,
                opacity: 0.9,
              }}
            />
          )}
        </View>
        <Animated.View
          style={{
            position: "absolute",
            left: `${minMarkerPct}%`,
            top: -4,
            width: 2,
            height: 16,
            backgroundColor: "#fbbf24",
            borderRadius: 1,
            marginLeft: -1,
            opacity: animateOnMount ? markerOpacity : 1,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "600" }}>최소 {minGoal}</Text>
        <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "600" }}>정원 {capacity}</Text>
      </View>
    </View>
  );
}
