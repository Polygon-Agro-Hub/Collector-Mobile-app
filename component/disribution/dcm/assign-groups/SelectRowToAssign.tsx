import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import CustomHeader from "@/component/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

interface RowItem {
  id: string;
  name: string;
  allocatedCount: number;
}

export default function SelectRowToAssign({ route, navigation }: { route: any; navigation: any }) {
  const { selectedOrdersCount = 20, selectedOrderIds = [], group = { id: 1, timeSlot: "08:00 AM - 12:00 PM" } } = route.params || {};

  const [rows, setRows] = useState<RowItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    fetchRows();
  }, []);

  const fetchRows = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.get(`${environment.API_BASE_URL}api/packing/groups/rows`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const mappedRows = response.data.data.map((r: any) => ({
          id: String(r.id),
          name: r.name,
          allocatedCount: r.allocatedCount
        }));
        setRows(mappedRows);
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

  const handleAssign = () => {
    const selectedRow = rows.find((r) => r.id === selectedRowId);
    if (!selectedRow) return;

    navigation.navigate("ConfirmRowAssign", {
      selectedOrdersCount: selectedOrdersCount,
      selectedOrderIds: selectedOrderIds,
      group: group,
      selectedRow: selectedRow,
    });
  };

  return (
    <View className="flex-1 bg-white">
      {/* Custom Header with absolutely centered title */}
      <CustomHeader
        title="Select a Row to Assign"
        navigation={navigation}
      />

      <View className="flex-1 px-6">
        {/* Description text */}
        <Text className="text-sm text-center px-6 text-[#676771] mt-4 mb-5 leading-relaxed">
          Choose the packing row where the selected orders will be assigned.
        </Text>

        {/* Orders Count Card */}
        <View className="flex-row items-center bg-[#F4F6F9] rounded-2xl p-4 mb-6">
          <View className="w-10 h-10 rounded-full bg-[#E1E4EA] items-center justify-center mr-4">
            <FontAwesome name="archive" size={18} color="#030E25" />
          </View>
          <View>
            <Text className="text-xs text-[#676771] font-medium">Orders Count</Text>
            <Text className="text-xl font-extrabold text-[#030E25] mt-0.5">{selectedOrdersCount}</Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <ActivityIndicator size="large" color="#030E25" />
            <Text className="text-[#676771] text-sm mt-3 font-semibold">Loading rows...</Text>
          </View>
        ) : rows.length === 0 ? (
          /* Empty state view matching the screenshot */
          <View className="flex-1 justify-center items-center pb-20">
            <View className="w-24 h-24 bg-[#FAFAFB] rounded-full items-center justify-center mb-4">
              <Ionicons name="folder-open-outline" size={50} color="#ACB5BE" />
            </View>
            <Text className="text-[#ACB5BE] text-sm italic font-medium">- No rows found. -</Text>
          </View>
        ) : (
          /* Scrollable list of packing rows */
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 130 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-4">
              {rows.map((row) => {
                const isSelected = row.id === selectedRowId;
                return (
                  <TouchableOpacity
                    key={row.id}
                    onPress={() => setSelectedRowId(row.id)}
                    activeOpacity={0.8}
                    className={`flex-row items-center bg-white border rounded-2xl p-5 shadow-sm ${
                      isSelected ? "border-[#980775]" : "border-[#E1E7EE]"
                    }`}
                  >
                    {/* Custom Radio Button Indicator */}
                    <View
                      className={`w-6 h-6 rounded-full border-2 mr-4 items-center justify-center ${
                        isSelected ? "border-[#980775]" : "border-[#000000]"
                      }`}
                    >
                      {isSelected && (
                        <View className="w-3 h-3 rounded-full bg-[#980775]" />
                      )}
                    </View>

                    {/* Row Info */}
                    <View className="flex-1">
                      <Text className="font-extrabold text-[#030E25] text-base">
                        {row.name}
                      </Text>
                      <Text className="text-xs text-[#676771] mt-1 font-medium">
                        {row.allocatedCount} Orders Allocated
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Sticky Bottom Assign Action Button when a row is selected */}
      {selectedRowId && (
        <View 
          style={{ borderTopColor: "#79747E33", borderTopWidth: 1 }}
          className="px-6 pt-4 pb-8 bg-white absolute bottom-0 left-0 right-0"
        >
          <TouchableOpacity
            onPress={handleAssign}
            className="w-full h-[50px] bg-black rounded-full flex-row items-center justify-center shadow gap-2"
            activeOpacity={0.8}
          >
            <FontAwesome name="check" size={16} color="white" />
            <Text className="text-white font-extrabold text-base">Assign</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
