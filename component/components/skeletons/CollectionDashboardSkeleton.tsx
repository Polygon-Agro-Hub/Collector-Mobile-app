import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { useSelector } from "react-redux";
import { RootState } from "@/services/reducxStore";
import { ROLES } from "@/constants/user-roles";

export default function CollectionDashboardSkeleton() {
  const opacityAnim = useRef(new Animated.Value(0.4)).current;
  const jobRole = useSelector((state: RootState) => state.auth.jobRole);

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

  const isManager = jobRole === ROLES.COLLECTION_MANAGER;

  return (
    <View className="flex-1 bg-white px-6 py-3">
      <View className="w-full max-w-[600px] mx-auto flex-1">
        {/* Profile Header Skeleton */}
        <Animated.View
          style={{ opacity: opacityAnim }}
          className="flex-row items-center py-4"
        >
          <View className="w-16 h-16 rounded-full bg-slate-200 mr-3" />
          <View className="flex-1">
            <View className="w-40 h-4 bg-slate-200 rounded-md mb-2" />
            <View className="w-28 h-3.5 bg-slate-200 rounded-md" />
          </View>
        </Animated.View>

        {/* Tab Bar Skeleton (Edge-to-Edge Line) */}
        <Animated.View
          style={{
            opacity: opacityAnim,
            marginHorizontal: -24,
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
            marginBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: "#E2E8F0",
          }}
        >
          <View className="flex-1 flex-row items-center justify-center py-3 gap-2">
            <View className="w-6 h-6 rounded-md bg-slate-200" />
            <View className="w-20 h-4 bg-slate-200 rounded-md" />
          </View>
          <View className="flex-1 flex-row items-center justify-center py-3 gap-2">
            <View className="w-6 h-6 rounded-md bg-slate-200" />
            <View className="w-20 h-4 bg-slate-200 rounded-md" />
          </View>
        </Animated.View>

        {/* Connect Scale Card Skeleton */}
        <Animated.View
          style={{ opacity: opacityAnim, borderRadius: 28 }}
          className="bg-slate-100 border border-slate-200 mt-2.5 p-3 flex-row items-center gap-3"
        >
          <View className="w-11 h-11 rounded-full bg-slate-200" />
          <View className="flex-1">
            <View className="w-32 h-4 bg-slate-200 rounded-md mb-1.5" />
            <View className="w-20 h-3 bg-slate-200 rounded-md" />
          </View>
          <View className="w-6 h-6 rounded-full bg-slate-200" />
        </Animated.View>

        {/* Keep Going / Target Status Card Skeleton */}
        <Animated.View
          style={{ opacity: opacityAnim, borderRadius: 28 }}
          className="bg-slate-100 border border-slate-200 w-full mt-3 p-4 items-center justify-center"
        >
          <View className="w-36 h-4 bg-slate-200 rounded-md mb-2" />
          <View className="w-56 h-3 bg-slate-200 rounded-md" />
        </Animated.View>

        {/* Target Progress Section Skeleton (Role-aware) */}
        {isManager ? (
          <Animated.View
            style={{ opacity: opacityAnim }}
            className="flex-row items-center justify-center gap-4 mt-10 mb-10"
          >
            <View className="w-36 h-6 bg-slate-200 rounded-md" />
            <View className="w-[120px] h-[120px] rounded-full border-8 border-slate-200 items-center justify-center">
              <View className="w-12 h-6 bg-slate-200 rounded-md" />
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            style={{ opacity: opacityAnim }}
            className="items-center justify-center mt-10 mb-10"
          >
            <View className="w-[120px] h-[120px] rounded-full border-8 border-slate-200 items-center justify-center">
              <View className="w-12 h-6 bg-slate-200 rounded-md" />
            </View>
            <View className="w-28 h-5 bg-slate-200 rounded-md mt-2" />
            <View className="w-20 h-5 bg-slate-200 rounded-md mt-1" />
          </Animated.View>
        )}

        {/* Action Grid Cards Skeleton */}
        <Animated.View
          style={{ opacity: opacityAnim }}
          className="flex-row flex-wrap justify-between pb-12 mt-4"
        >
          {(isManager ? [1, 2, 3, 4] : [1, 2]).map((key) => (
            <View
              key={key}
              className="bg-slate-100 border border-slate-200 p-4 rounded-3xl w-[48%] h-40 relative mb-4 justify-between"
            >
              <View className="flex-row justify-end">
                <View className="w-8 h-8 rounded-xl bg-slate-200" />
              </View>
              <View className="w-24 h-4 bg-slate-200 rounded-md" />
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}
