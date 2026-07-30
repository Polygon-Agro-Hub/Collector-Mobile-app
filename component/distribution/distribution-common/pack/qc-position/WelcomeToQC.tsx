import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { Entypo, Feather, Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";
import LottieView from "lottie-react-native";

type QCStatus = "no_target" | "waiting" | "step1_no_items" | "step2_spices" | "step3_alacarte";

interface QCItem {
  id: number;
  name: string;
  weight: string;
  checked: boolean;
  image: string;
}

export default function WelcomeToQC({ route, navigation }: { route: any; navigation: any }) {
  const { orderNumber = "26050500001 (R)" } = route.params || {};

  // QC Page states: "no_target" | "waiting" | "step1_no_items" | "step2_spices" | "step3_alacarte"
  const [status, setStatus] = useState<QCStatus>("no_target");

  // Step 2 checklist state (Spices Pack)
  const [spicesItems, setSpicesItems] = useState<QCItem[]>([
    {
      id: 1,
      name: "Sri Lankan Yellow Lemon",
      weight: "0.5 kg",
      checked: false,
      image: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=200&auto=format&fit=crop&q=80",
    },
    {
      id: 2,
      name: "Turmeric",
      weight: "0.1 kg",
      checked: false,
      image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
    },
  ]);

  // Step 3 checklist state (À la carte)
  const [alacarteItems, setAlacarteItems] = useState<QCItem[]>([
    {
      id: 3,
      name: "Sweet Potato",
      weight: "0.5 kg",
      checked: false,
      image: "https://images.unsplash.com/photo-1596003906949-67221c37965c?w=200&auto=format&fit=crop&q=80",
    },
  ]);

  const handleToggleSpiceCheck = (id: number) => {
    setSpicesItems(
      spicesItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const handleToggleAlacarteCheck = (id: number) => {
    setAlacarteItems(
      alacarteItems.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const allSpicesChecked = spicesItems.every((item) => item.checked);
  const allAlacarteChecked = alacarteItems.every((item) => item.checked);

  const handleBack = () => {
    if (status === "step3_alacarte") {
      setStatus("step2_spices");
    } else if (status === "step2_spices") {
      setStatus("step1_no_items");
    } else if (status === "step1_no_items") {
      setStatus("waiting");
    } else if (status === "waiting") {
      setStatus("no_target");
    } else {
      navigation.goBack();
    }
  };

  // Switcher to cycle states sequentially for mock/testing
  const handleCycleStatus = () => {
    if (status === "no_target") {
      setStatus("waiting");
    } else if (status === "waiting") {
      setStatus("step1_no_items");
    } else if (status === "step1_no_items") {
      setStatus("step2_spices");
    } else if (status === "step2_spices") {
      setStatus("step3_alacarte");
    } else {
      setStatus("no_target");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Standard Custom Header */}
      <CustomHeader
        title={status !== "no_target" ? orderNumber : ""}
        navigation={navigation}
        onBackPress={handleBack}
        rightComponent={
          <TouchableOpacity
            onPress={handleCycleStatus}
            className="px-3 py-1.5 rounded-full bg-[#E9ECF1]"
            activeOpacity={0.7}
          >
            <Text className="text-[10px] font-extrabold text-[#030E25] uppercase tracking-wide">
              {status === "no_target" ? "Mock Data" : `Mock: ${status.replace("step", "")}`}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* STATE 1: Empty Target State (No Data) - Center Lottie Vertically */}
      {status === "no_target" && (
        <View className="flex-1 px-6 pb-16 justify-between">
          <View className="pt-2">
            {/* Page Title */}
            <View className="items-center mb-4">
              <Text className="text-xl font-extrabold text-[#030E25] text-center">
                Welcome to QC Position
              </Text>
            </View>

            {/* Subtitle */}
            <View className="items-center px-4">
              <Text className="text-sm font-medium text-[#54617D] text-center leading-5">
                Please wait and check again.{"\n"}This row doesn't have a daily target yet.
              </Text>
            </View>
          </View>

          {/* Centered Lottie animation of folder */}
          <View className="flex-grow justify-center items-center">
            <View className="w-56 h-56 justify-center items-center">
              <LottieView
                source={require("../../../../../assets/lottie/no-data.json")}
                autoPlay
                loop
                style={{ width: "100%", height: "100%" }}
              />
            </View>
          </View>
        </View>
      )}

      {/* QC ACTIVE FLOW LAYOUTS */}
      {status !== "no_target" && (
        <>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingTop: 10,
              paddingBottom: 120,
            }}
            className="flex-1 bg-white"
            showsVerticalScrollIndicator={false}
          >
            {/* Scheduled Time Card (Present in all active states) */}
            <View className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 mb-8 shadow-sm">
              <View className="w-10 h-10 rounded-full bg-[#E9ECF1] items-center justify-center mr-4">
                <Feather name="shopping-bag" size={18} color="#030E25" />
              </View>
              <View>
                <Text className="text-gray-400 text-xs font-semibold">Scheduled Time :</Text>
                <Text className="text-[#030E25] font-extrabold text-sm mt-0.5">
                  08:00 AM - 12:00 PM
                </Text>
              </View>
            </View>

            {/* Segmented progress bar (Only shown in step1, step2, step3 checking sequence) */}
            {status !== "waiting" && (
              <View className="flex-row justify-between items-center gap-2 w-full px-1 mb-8">
                {[1, 2, 3, 4].map((stepNum) => {
                  // Determine thick black filled lines correctly
                  let isFilled = false;
                  if (status === "step1_no_items") {
                    isFilled = stepNum <= 1; // 1 segment filled
                  } else if (status === "step2_spices") {
                    isFilled = stepNum <= 3; // 3 segments filled (skips segment 2 per screenshot)
                  } else if (status === "step3_alacarte") {
                    isFilled = stepNum <= 4; // 4 segments filled
                  }
                  return (
                    <View
                      key={stepNum}
                      className={`h-1.5 flex-1 rounded-full ${
                        isFilled ? "bg-[#09152B]" : "bg-gray-200"
                      }`}
                    />
                  );
                })}
              </View>
            )}

            {/* STEP: Waiting State (Separate state - No progress bar, No bottom button) */}
            {status === "waiting" && (
              <TouchableOpacity
                onPress={() => setStatus("step1_no_items")}
                className="items-center justify-center py-6 mt-4"
                activeOpacity={0.9}
              >
                {/* Lottie sand-clock-timer animation */}
                <View className="w-56 h-56 justify-center items-center mb-10">
                  <LottieView
                    source={require("../../../../../assets/lottie/packing/sand-clock-timer.json")}
                    autoPlay
                    loop
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>

                {/* Waiting Titles */}
                <Text className="text-[#030E25] font-extrabold text-lg text-center px-4 mb-2 leading-6">
                  This order is still with the{"\n"}previous position
                </Text>
                <Text className="text-gray-400 text-sm font-medium text-center px-6">
                  Please try reloading the page in a few seconds.
                </Text>
              </TouchableOpacity>
            )}

            {/* STEP 1: No Items to Pack State */}
            {status === "step1_no_items" && (
              <View className="items-center justify-center py-6">
                {/* Lottie down-arrow animation rotated to the right */}
                <View
                  style={{ transform: [{ rotate: "-90deg" }] }}
                  className="w-40 h-40 justify-center items-center mb-10"
                >
                  <LottieView
                    source={require("../../../../../assets/lottie/packing/down-arrow.json")}
                    autoPlay
                    loop
                    style={{ width: "100%", height: "100%" }}
                  />
                </View>

                {/* No Items Titles */}
                <Text className="text-[#030E25] font-extrabold text-lg text-center px-4 mb-3 leading-6">
                  No items to pack for this order{"\n"}at your position
                </Text>
                <Text className="text-[#54617D] text-sm font-semibold text-center px-8 leading-5">
                  There are no items assigned to the position in the current packing sequence.
                </Text>
              </View>
            )}

            {/* STEP 2: Spices Pack List State */}
            {status === "step2_spices" && (
              <View className="px-1">
                {/* Spices Pack Title Box */}
                <View className="mb-4 align-start">
                  <Text className="text-[#980775] font-extrabold text-sm">
                    Spices Pack (02)
                  </Text>
                </View>

                {/* Item List */}
                <View className="gap-4">
                  {spicesItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleToggleSpiceCheck(item.id)}
                      className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 shadow-sm"
                      activeOpacity={0.8}
                    >
                      {/* Product Image */}
                      <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-slate-50 mr-4">
                        <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                      </View>

                      {/* Details */}
                      <View className="flex-1">
                        <Text className="text-[#030E25] font-extrabold text-sm leading-4">
                          {item.name}
                        </Text>
                        <Text className="text-gray-900 font-bold text-sm mt-0.5">
                          {item.weight}
                        </Text>
                      </View>

                      {/* Custom Checkbox */}
                      <View
                        className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                          item.checked ? "bg-[#980775] border-[#980775]" : "border-gray-300 bg-white"
                        }`}
                      >
                        {item.checked && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* STEP 3: À la carte List State */}
            {status === "step3_alacarte" && (
              <View className="px-1">
                {/* À la carte Title Box */}
                <View className="mb-4 align-start">
                  <Text className="text-[#AC7F5E] font-extrabold text-sm">
                    À la carte (01)
                  </Text>
                </View>

                {/* Item List */}
                <View className="gap-4">
                  {alacarteItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleToggleAlacarteCheck(item.id)}
                      className="flex-row items-center bg-white border border-gray-150 rounded-2xl p-4 shadow-sm"
                      activeOpacity={0.8}
                    >
                      {/* Product Image */}
                      <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center bg-slate-50 mr-4">
                        <Image source={{ uri: item.image }} className="w-full h-full" resizeMode="cover" />
                      </View>

                      {/* Details */}
                      <View className="flex-1">
                        <Text className="text-[#030E25] font-extrabold text-sm leading-4">
                          {item.name}
                        </Text>
                        <Text className="text-gray-900 font-bold text-sm mt-0.5">
                          {item.weight}
                        </Text>
                      </View>

                      {/* Custom Checkbox */}
                      <View
                        className={`w-6 h-6 rounded-md items-center justify-center border-2 ${
                          item.checked ? "bg-[#980775] border-[#980775]" : "border-gray-300 bg-white"
                        }`}
                      >
                        {item.checked && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* BOTTOM BUTTON PINNED BAR */}

          {/* Skip Button for Step 1 (No Items) */}
          {status === "step1_no_items" && (
            <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
              <TouchableOpacity
                onPress={() => setStatus("step2_spices")}
                className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-base">Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Complete Button for Step 2 (Spices Pack) */}
          {status === "step2_spices" && allSpicesChecked && (
            <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
              <TouchableOpacity
                onPress={() => setStatus("step3_alacarte")}
                className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-base">Complete</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Complete Button for Step 3 (À la carte) */}
          {status === "step3_alacarte" && allAlacarteChecked && (
            <View className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0">
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Success", "QC sequence completed successfully!", [
                    {
                      text: "OK",
                      onPress: () => {
                        navigation.navigate("Main", { screen: "DistridutionaDashboard" });
                      },
                    },
                  ]);
                }}
                className="w-full h-[50px] bg-black rounded-full items-center justify-center shadow-lg"
                activeOpacity={0.8}
              >
                <Text className="text-white font-extrabold text-base">Complete</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}
