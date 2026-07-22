import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons, Entypo } from "@expo/vector-icons";

// Define TypeScript interfaces for our sample data
interface RowData {
  id: number;
  name: string;
  positionsCount: number;
}

interface PositionData {
  id: number;
  name: string;
  type: "QR" | "QC" | "NOR";
  status: "Available" | "Occupied";
  leftLabel: string;
}

export default function SelectRow({ navigation }: { navigation: any }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<PositionData | null>(
    null,
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Sample data for Rows (Step 1)
  const rows: RowData[] = [
    { id: 1, name: "Row 1", positionsCount: 4 },
    { id: 2, name: "Row 2", positionsCount: 1 },
    { id: 3, name: "Row 3", positionsCount: 0 },
    { id: 4, name: "Row 4", positionsCount: 10 },
  ];

  // Sample data for Positions (Step 2)
  const positions: PositionData[] = [
    {
      id: 1,
      name: "QR Handling Position",
      type: "QR",
      status: "Occupied",
      leftLabel: "QR",
    },
    {
      id: 2,
      name: "Packing Position 1",
      type: "NOR",
      status: "Available",
      leftLabel: "01",
    },
    {
      id: 3,
      name: "Packing Position 2",
      type: "NOR",
      status: "Available",
      leftLabel: "02",
    },
    {
      id: 4,
      name: "QC Position",
      type: "QC",
      status: "Available",
      leftLabel: "QC",
    },
  ];

  const handleRowSelect = (row: RowData) => {
    setSelectedRow(row);
    setStep(2);
  };

  const handlePositionSelect = (position: PositionData) => {
    setSelectedPosition(position);
    if (position.status === "Occupied") {
      Alert.alert(
        "Position Occupied",
        "This position is already in use. Please select an available position.",
      );
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirm = () => {
    setShowConfirmModal(false);
    Alert.alert(
      "Confirmation Success",
      `You have been successfully assigned to ${selectedPosition?.name} of ${selectedRow?.name}.`,
      [
        {
          text: "OK",
          onPress: () => {
            // Navigate back to the dashboard
            navigation.navigate("Main", { screen: "DistridutionaDashboard" });
          },
        },
      ],
    );
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedRow(null);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header bar matching screenshot */}
      <View className="flex-row items-center justify-between px-5 pt-4 bg-white">
        {/* Back Button matching CustomHeader */}
        <TouchableOpacity
          onPress={handleBack}
          style={{ alignItems: "flex-start" }}
          activeOpacity={0.7}
        >
          <Entypo
            name="chevron-left"
            size={25}
            color="black"
            style={{
              borderRadius: 50,
              padding: 12,
              backgroundColor: "#F6F6F680",
            }}
          />
        </TouchableOpacity>

        {/* Progress bar in center */}
        <View className="flex-row items-center gap-2">
          {/* Segment 1 */}
          <View
            className={`h-1.5 w-20 rounded-full ${
              step === 1 ? "bg-slate-900" : "bg-gray-200"
            }`}
          />
          {/* Segment 2 */}
          <View
            className={`h-1.5 w-20 rounded-full ${
              step === 2 ? "bg-slate-900" : "bg-gray-200"
            }`}
          />
        </View>

        {/* Empty placeholder for alignment */}
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 bg-white px-6">
        {step === 1 ? (
          <>
            {/* Step 1 Title */}
            <Text className="text-xl font-bold text-center text-slate-900 mb-6 mt-2">
              Select the row you work with
            </Text>

            {/* Step 1 list of rows */}
            <View className="gap-4">
              {rows.map((row, index) => {
                const formattedIndex = String(index + 1).padStart(2, "0");
                return (
                  <TouchableOpacity
                    key={row.id}
                    onPress={() => handleRowSelect(row)}
                    className="flex-row items-center bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Circle Indicator */}
                    <View className="w-12 h-12 rounded-full items-center justify-center bg-[#E9ECF1] mr-4">
                      <Text className="font-bold text-black text-lg">
                        {formattedIndex}
                      </Text>
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text className="font-bold text-slate-950 text-base">
                        {row.name}
                      </Text>
                      <Text className="text-xs text-[#54617D] mt-0.5">
                        {row.positionsCount}{" "}
                        {row.positionsCount === 1 ? "Position" : "Positions"}{" "}
                        Available
                      </Text>
                    </View>

                    {/* Chevron Right */}
                    <Ionicons name="chevron-forward" size={20} color="black" />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* Step 2 Title */}
            <Text className="text-lg text-center text-slate-600 mb-6 mt-2">
              Selected :{" "}
              <Text className="font-extrabold text-slate-950">
                {selectedRow?.name}
              </Text>
            </Text>

            {/* Step 2 list of positions */}
            <View className="gap-4">
              {positions.map((position) => {
                // Determine styling based on type and status
                let leftCircleStyle = "bg-slate-50 border-gray-100";
                let leftTextStyle = "text-slate-800";
                let cardStyle = "bg-white border-gray-100";

                if (position.type === "QR") {
                  leftCircleStyle = "bg-yellow-100 border-yellow-200";
                  leftTextStyle = "text-black";
                } else if (position.type === "QC") {
                  leftCircleStyle = "bg-yellow-50 border-yellow-300";
                  leftTextStyle = "text-black";
                  cardStyle = "bg-white border-yellow-300 border";
                }

                if (selectedPosition?.id === position.id) {
                  cardStyle = "bg-slate-100 border-yellow-400 border-2";
                }

                return (
                  <TouchableOpacity
                    key={position.id}
                    onPress={() => handlePositionSelect(position)}
                    className={`flex-row items-center border rounded-2xl p-4 shadow-sm ${cardStyle}`}
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Circle Indicator */}
                    <View
                      className={`w-12 h-12 rounded-full border items-center justify-center mr-4 ${leftCircleStyle}`}
                    >
                      <Text className={`font-bold text-sm ${leftTextStyle}`}>
                        {position.leftLabel}
                      </Text>
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text className="font-bold text-slate-950 text-base">
                        {position.name}
                      </Text>
                      {/* Badge status */}
                      <View className="flex-row mt-1">
                        <View
                          className={`flex-row items-center px-2 py-0.5 rounded-full ${
                            position.status === "Occupied"
                              ? "bg-gray-200"
                              : "bg-slate-50"
                          }`}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: "black",
                              marginRight: 6,
                            }}
                          />
                          <Text
                            className={`text-[10px] font-semibold text-black`}
                          >
                            {position.status}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Chevron Right */}
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal overlay matching screenshot */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.45)" }}
        >
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl items-center">
            {/* Modal Title */}
            <Text className="text-lg font-bold text-slate-950 text-center mb-3">
              Position Confirmation
            </Text>

            {/* Modal Description */}
            <Text className="text-[#54617D] text-sm text-center leading-relaxed px-2 mb-6">
              If you confirm, from now upon you will be assigned to{" "}
              {selectedPosition?.name.toLowerCase()} of {selectedRow?.name}.
            </Text>

            {/* Action buttons (Confirm / Cancel stacked) */}
            <View className="w-full gap-3">
              {/* Confirm */}
              <TouchableOpacity
                onPress={handleConfirm}
                className="w-full bg-black py-4 rounded-full items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-base">Confirm</Text>
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity
                onPress={() => setShowConfirmModal(false)}
                className="w-full bg-[#D9D9D9] py-4 rounded-full items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-gray-700 font-bold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
