import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons, Entypo, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { setActiveAssignment } from "../../../../../store/authSlice";

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
  const dispatch = useDispatch();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRow, setSelectedRow] = useState<RowData | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<PositionData | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [rows, setRows] = useState<RowData[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);

  const checkActiveAssignment = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`${environment.API_BASE_URL}api/packing/active-assignment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success && res.data.data) {
        setActiveAssignment(res.data.data);
      } else {
        setActiveAssignment(null);
      }
    } catch (err) {
      console.error("Error checking active assignment:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRows();
      checkActiveAssignment();
    }, [])
  );

  const fetchRows = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.get(`${environment.API_BASE_URL}api/packing/rows`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setRows(response.data.data);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch rows.");
      }
    } catch (error) {
      console.error("Error fetching rows:", error);
      Alert.alert("Error", "An error occurred while fetching rows.");
    } finally {
      setLoading(false);
    }
  };

  const handleRowSelect = async (row: RowData) => {
    setSelectedRow(row);
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.get(`${environment.API_BASE_URL}api/packing/rows/${row.id}/positions`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        setPositions(response.data.data);
        setStep(2);
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch positions.");
      }
    } catch (error) {
      console.error("Error fetching positions:", error);
      Alert.alert("Error", "An error occurred while fetching positions.");
    } finally {
      setLoading(false);
    }
  };

  const handlePositionSelect = (position: PositionData) => {
    if (position.status === "Occupied") {
      Alert.alert(
        "Position Occupied",
        "This position is already in use. Please select an available position.",
      );
      return;
    }
    setSelectedPosition(position);
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedPosition) return;
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.post(
        `${environment.API_BASE_URL}api/packing/positions/assign`,
        { positionId: selectedPosition.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowConfirmModal(false);

      if (response.data && response.data.success) {
        const assignmentData = {
          rowId: selectedRow?.id || 0,
          positionId: selectedPosition.id,
          positionName: selectedPosition.name,
          pType: selectedPosition.type,
        };
        if (typeof setActiveAssignment === "function") {
          const actionObj = setActiveAssignment(assignmentData);
          if (actionObj) {
            dispatch(actionObj);
          }
        }
        await AsyncStorage.setItem("activeAssignment", JSON.stringify(assignmentData));

        Alert.alert(
          "Confirmation Success",
          `You have been successfully assigned to ${selectedPosition.name} of ${selectedRow?.name}.`,
          [
            {
              text: "OK",
              onPress: () => {
                if (selectedPosition.type === "QR") {
                  navigation.navigate("QRHandling");
                } else if (selectedPosition.type === "NOR") {
                  navigation.navigate("WelcomeToPacking", { 
                    positionId: selectedPosition.id,
                    positionName: selectedPosition.name 
                  });
                } else if (selectedPosition.type === "QC") {
                  navigation.navigate("WelcomeToQC", { positionName: selectedPosition.name });
                }
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", response.data.message || "Failed to assign position.");
      }
    } catch (error) {
      console.error("Error assigning position:", error);
      Alert.alert("Error", "An error occurred while confirming assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedRow(null);
    } else {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
    }
  };

  return (
    <View className="flex-1 bg-white">
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

        <View className="w-10" />
      </View>

      {/* Active Assignment Resume Banner */}
      {step === 1 && activeAssignment && (
        <TouchableOpacity
          onPress={() => {
            const type = activeAssignment.type || activeAssignment.positionType;
            if (type === "QR") {
              navigation.navigate("QRHandling");
            } else if (type === "NOR") {
              navigation.navigate("WelcomeToPacking", {
                positionId: activeAssignment.positionId,
                positionName: activeAssignment.name,
              });
            } else if (type === "QC") {
              navigation.navigate("WelcomeToQC", {
                positionName: activeAssignment.name,
              });
            }
          }}
          className="mx-6 mt-3 bg-[#EAF1FF] border border-[#3B82F6] rounded-2xl p-4 flex-row items-center justify-between"
          activeOpacity={0.8}
        >
          <View className="flex-1 mr-2">
            <Text className="text-xs font-bold text-[#1E40AF]">Active Position Today</Text>
            <Text className="text-sm font-extrabold text-[#030E25] mt-0.5">
              {activeAssignment.name} ({activeAssignment.rowName})
            </Text>
          </View>
          <View className="bg-[#3B82F6] px-3 py-1.5 rounded-xl flex-row items-center gap-1">
            <Text className="text-white font-bold text-xs">Resume</Text>
            <Feather name="arrow-right" size={14} color="white" />
          </View>
        </TouchableOpacity>
      )}

      <ScrollView className="flex-1 bg-white px-6">
        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#000" />
            <Text className="text-slate-500 text-sm mt-3 font-semibold">Loading...</Text>
          </View>
        ) : step === 1 ? (
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
                disabled={submitting}
                className="w-full bg-black py-4 rounded-full items-center justify-center flex-row gap-2"
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Confirm</Text>
                )}
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
    </View>
  );
}
