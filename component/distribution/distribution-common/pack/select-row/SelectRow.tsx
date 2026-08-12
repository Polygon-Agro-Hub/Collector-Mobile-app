import store from "@/services/reducxStore";
import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  BackHandler,
  RefreshControl,
} from "react-native";
import { Ionicons, Entypo, Feather } from "@expo/vector-icons";
import axios from "axios";
import { environment } from "@/environment/environment";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { io, Socket } from "socket.io-client";
import { setActiveAssignment as setActiveAssignmentAction } from "../../../../../store/authSlice";
import LoadingPage from "@/component/components/loading/LoadingPage";

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
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [activeAssignment, setActiveAssignment] = useState<any | null>(null);

  const fetchPositionsSilently = async (rowId: number) => {
    try {
      const token = store.getState().auth.token;
      if (!token) return;
      const response = await axios.get(`${environment.API_BASE_URL}api/packing/rows/${rowId}/positions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setPositions(response.data.data);
      }
    } catch (err) {
      console.error("Error silently fetching positions:", err);
    }
  };

  const fetchRowsSilently = async () => {
    try {
      const token = store.getState().auth.token;
      if (!token) return;
      const response = await axios.get(`${environment.API_BASE_URL}api/packing/rows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.success) {
        setRows(response.data.data);
      }
    } catch (err) {
      console.error("Error silently fetching rows:", err);
    }
  };

  // Real-time socket updates for rows & positions
  useEffect(() => {
    let socket: Socket | null = null;
    try {
      const baseUrl = environment.API_BASE_URL;
      const socketUrl = baseUrl.includes("/agro-api")
        ? baseUrl.split("/agro-api")[0]
        : baseUrl;

      socket = io(socketUrl, {
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        if (selectedRow) {
          socket?.emit("join_row", selectedRow.id);
        }
      });

      socket.on("rows_updated", () => {
        fetchRowsSilently();
      });

      socket.on("position_updated", () => {
        fetchRowsSilently();
        checkActiveAssignment();
        if (selectedRow) {
          fetchPositionsSilently(selectedRow.id);
        }
      });

      socket.on("positions_updated", () => {
        fetchRowsSilently();
        checkActiveAssignment();
        if (selectedRow) {
          fetchPositionsSilently(selectedRow.id);
        }
      });

      socket.on("position_freed", () => {
        fetchRowsSilently();
        checkActiveAssignment();
        if (selectedRow) {
          fetchPositionsSilently(selectedRow.id);
        }
      });

      socket.on("order_opened", () => {
        fetchRowsSilently();
        if (selectedRow) {
          fetchPositionsSilently(selectedRow.id);
        }
      });

      socket.on("order_completed", () => {
        fetchRowsSilently();
        if (selectedRow) {
          fetchPositionsSilently(selectedRow.id);
        }
      });
    } catch (err) {
      console.error("Socket connection error in SelectRow:", err);
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [selectedRow]);

  const onRefresh = async () => {
    setRefreshing(true);
    await checkActiveAssignment();
    if (step === 1) {
      try {
        const token = store.getState().auth.token;
        if (token) {
          const response = await axios.get(`${environment.API_BASE_URL}api/packing/rows`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data && response.data.success) {
            setRows(response.data.data);
          }
        }
      } catch (e) {
        console.error("Error refreshing rows:", e);
      }
    } else if (step === 2 && selectedRow) {
      try {
        const token = store.getState().auth.token;
        if (token) {
          const response = await axios.get(`${environment.API_BASE_URL}api/packing/rows/${selectedRow.id}/positions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data && response.data.success) {
            setPositions(response.data.data);
          }
        }
      } catch (e) {
        console.error("Error refreshing positions:", e);
      }
    }
    setRefreshing(false);
  };

  const checkActiveAssignment = async () => {
    try {
      const token = store.getState().auth.token;
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

  const handleBack = useCallback(() => {
    if (step === 2) {
      setStep(1);
      setSelectedRow(null);
      return true;
    } else {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    }
  }, [step, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchRows();
      checkActiveAssignment();

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        handleBack
      );

      return () => subscription.remove();
    }, [handleBack])
  );

  const fetchRows = async () => {
    try {
      setLoading(true);
      const token = store.getState().auth.token;
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
    } catch (error: any) {
      console.error("Error fetching rows:", error);
      const errMsg = error.response?.data?.message || "An error occurred while fetching rows.";
      Alert.alert("Error", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRowSelect = async (row: RowData) => {
    setSelectedRow(row);
    try {
      setLoading(true);
      const token = store.getState().auth.token;
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
    } catch (error: any) {
      console.error("Error fetching positions:", error);
      const errMsg = error.response?.data?.message || "An error occurred while fetching positions.";
      Alert.alert("Error", errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePositionSelect = (position: PositionData) => {
    if (position.status === "Occupied") {
      Alert.alert(
        "Position Occupied",
        `Position "${position.name}" is currently occupied by another officer. Please select an available position.`
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
      const token = store.getState().auth.token;
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
        dispatch(setActiveAssignmentAction(assignmentData));

        Alert.alert(
          "Confirmation Success",
          "You have been successfully assigned to this position",
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
    } catch (error: any) {
      console.error("Error assigning position:", error);
      const errMsg = error.response?.data?.message || "An error occurred while confirming assignment.";
      Alert.alert("Error", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header bar matching screenshot */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-2 bg-white">
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

      {loading ? (
        <View className="flex-1 justify-center items-center bg-white">
          <LoadingPage message="Loading..." fullScreen />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
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
                    className="flex-row items-center border border-gray-100 rounded-2xl p-4 my-1"
                    style={{
                      backgroundColor: "#ffffff",
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.12,
                      shadowRadius: 6,
                      elevation: 4,
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
                const isOccupied = position.status === "Occupied";

                // Determine styling based on type and status
                let leftCircleStyle = "bg-slate-50 border-[#E1E7EE]";
                let leftTextStyle = "text-slate-800";
                let cardStyle = "border-[#E1E7EE] border";

                const isQrOrQc = position.type === "QR" || position.type === "QC";
                const circleStyle = isQrOrQc
                  ? (isOccupied ? "bg-[#D9B700] border-[#D9B700]" : "bg-[#FAE432] border-[#FAE432]")
                  : (isOccupied ? "bg-white/40 border-gray-300/40" : leftCircleStyle);

                if (isQrOrQc) {
                  leftTextStyle = "text-black";
                  cardStyle = "border-yellow-300 border";
                }

                if (selectedPosition?.id === position.id) {
                  cardStyle = "bg-slate-100 border-yellow-400 border-2";
                }

                return (
                  <TouchableOpacity
                    key={position.id}
                    onPress={() => handlePositionSelect(position)}
                    disabled={isOccupied}
                    className={`flex-row items-center rounded-2xl p-4 my-1 ${
                      isOccupied
                        ? (isQrOrQc ? "border-[#D9B700] border-2" : "border border-transparent")
                        : cardStyle
                    }`}
                    style={{
                      backgroundColor: isOccupied ? "#4E52734D" : "#ffffff",
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: isOccupied ? 0 : 3 },
                      shadowOpacity: isOccupied ? 0 : 0.12,
                      shadowRadius: isOccupied ? 0 : 6,
                      elevation: isOccupied ? 0 : 4,
                    }}
                    activeOpacity={0.8}
                  >
                    {/* Circle Indicator */}
                    <View
                      className={`w-12 h-12 rounded-full border items-center justify-center mr-4 ${circleStyle}`}
                    >
                      <Text
                        className={`font-bold text-sm ${
                          isQrOrQc ? "text-black" : (isOccupied ? "text-[#54617D]" : leftTextStyle)
                        }`}
                      >
                        {position.leftLabel}
                      </Text>
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text
                        className={`font-bold text-base ${
                          isOccupied ? "text-[#54617D]" : "text-slate-950"
                        }`}
                      >
                        {position.name}
                      </Text>
                      {/* Badge status */}
                      <View className="flex-row mt-1">
                        <View
                          className={`flex-row items-center px-2 py-0.5 rounded-full ${
                            isOccupied ? "bg-[#00000010]" : "bg-slate-50"
                          }`}
                        >
                          <View
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: isOccupied ? "#54617D" : "black",
                              marginRight: 6,
                            }}
                          />
                          <Text
                            className={`text-[10px] font-semibold ${
                              isOccupied ? "text-[#54617D]" : "text-black"
                            }`}
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
                      color={isOccupied ? "#54617D" : "#9ca3af"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    )}

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
                className="w-full py-4 rounded-full items-center justify-center flex-row gap-2"
                style={{
                  backgroundColor: "#000000",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                }}
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
                className="w-full py-4 rounded-full items-center justify-center"
                style={{
                  backgroundColor: "#D9D9D9",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.15,
                  shadowRadius: 6,
                  elevation: 3,
                }}
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
