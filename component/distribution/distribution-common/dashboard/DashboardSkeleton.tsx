import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";

export default function DashboardSkeleton() {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  return (
    <View className="flex-1 bg-white p-4">
      <View className="w-full max-w-[600px] mx-auto flex-1">
        {/* Profile Header Skeleton */}
        <Animated.View
          style={{ opacity: opacityAnim }}
          className="flex-row items-center p-3 mb-2"
        >
          <View className="w-16 h-16 rounded-full bg-slate-200 mr-3" />
          <View className="flex-1">
            <View className="w-40 h-4 bg-slate-200 rounded-md mb-2" />
            <View className="w-28 h-3.5 bg-slate-200 rounded-md" />
          </View>
        </Animated.View>

        {/* Dashboard Grid Cards Skeleton */}
        <Animated.View
          style={{ opacity: opacityAnim }}
          className="flex-row flex-wrap px-2 gap-4 justify-start mt-6"
        >
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <View
              key={key}
              className="bg-slate-100 border border-slate-200 p-4 rounded-3xl w-[47%] h-32 justify-between"
            >
              <View className="flex-row justify-between items-center">
                <View className="w-10 h-10 rounded-2xl bg-slate-200" />
                <View className="w-6 h-6 rounded-full bg-slate-200" />
              </View>
              <View className="w-24 h-4 bg-slate-200 rounded-md" />
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
