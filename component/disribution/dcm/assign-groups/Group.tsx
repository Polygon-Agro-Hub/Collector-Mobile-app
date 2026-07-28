import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import LottieView from "lottie-react-native";
import CustomHeader from "@/component/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";

type GroupPageState = "empty" | "active";

interface TimeSlotGroup {
  id: number;
  timeSlotCode: string;
  timeSlot: string;
  ordersLeft: number;
  status: "active" | "no_orders" | "assigned";
}

export default function Group({ route, navigation }: { route: any; navigation: any }) {
  const [pageState, setPageState] = useState<GroupPageState>("active");
  const [retailGroups, setRetailGroups] = useState<TimeSlotGroup[]>([]);
  const [wholesaleGroups, setWholesaleGroups] = useState<TimeSlotGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "Authentication token not found. Please log in again.");
        return;
      }

      const response = await axios.get(`${environment.API_BASE_URL}api/packing/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const { retail, wholesale } = response.data.data;
        setRetailGroups(retail);
        setWholesaleGroups(wholesale);
        
        // Determine page state based on order availability
        const totalLeft = retail.reduce((acc: number, item: any) => acc + item.ordersLeft, 0) +
                          wholesale.reduce((acc: number, item: any) => acc + item.ordersLeft, 0);
        
        setPageState(totalLeft > 0 ? "active" : "empty");
      } else {
        Alert.alert("Error", response.data.message || "Failed to fetch groups.");
      }
    } catch (error) {
      console.error("Error fetching timeslots groups:", error);
      Alert.alert("Error", "An error occurred while fetching timeslots groups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [route.params?.assignedGroupId]);

  const handleAssignGroup = (group: TimeSlotGroup, type: "retail" | "wholesale") => {
    if (group.status === "no_orders") return;
    if (group.status === "assigned") {
      Alert.alert("Already Assigned", "This time slot group is already fully assigned.");
      return;
    }
    navigation.navigate("SelectOrder", { group, type });
  };

  const togglePageState = () => {
    setPageState(pageState === "empty" ? "active" : "empty");
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title="Groups"
        navigation={navigation}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#030E25" />
          <Text className="text-sm font-semibold text-[#54617D] mt-3">Loading groups...</Text>
        </View>
      ) : pageState === "empty" ? (
        <View className="flex-1 px-6 justify-center items-center">
          <View className="w-56 h-56 justify-center items-center mb-8">
            <LottieView
              source={require("../../../../assets/lottie/no-data.json")}
              autoPlay
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <Text className="text-xs font-semibold text-[#676771] text-center italic px-6 leading-5">
            - No groups found. Please check again after{"\n"}12:00 AM tomorrow. -
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 bg-white px-6">
          {/* Retail Groups Section */}
          <View className="mb-6">
            <Text className="text-base font-extrabold text-[#030E25] mb-4">Retail Groups</Text>

            <View className="gap-4">
              {retailGroups.map((group) => {
                const isDisabled = group.ordersLeft === 0;
                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => handleAssignGroup(group, "retail")}
                    activeOpacity={isDisabled ? 1 : 0.8}
                    className={`flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 ${
                      isDisabled ? "" : "shadow-sm"
                    }`}
                  >
                    <View>
                      <Text
                        className={`text-base font-extrabold ${
                          isDisabled ? "text-[#54617D]" : "text-[#030E25]"
                        }`}
                      >
                        {group.timeSlot}
                      </Text>
                      <Text
                        className={`text-xs font-bold mt-1 ${
                          isDisabled ? "text-[#54617D]" : "text-[#2868FE]"
                        }`}
                      >
                        {group.ordersLeft} Orders Left to Assign
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleAssignGroup(group, "retail")}
                      disabled={isDisabled}
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        isDisabled ? "bg-[#E9ECF1]" : "bg-black"
                      }`}
                      activeOpacity={isDisabled ? 1 : 0.8}
                    >
                      <Feather
                        name="plus"
                        size={18}
                        color={isDisabled ? "#54617D" : "white"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Full-bleed separator border */}
          <View style={{ height: 1, backgroundColor: "#ACB5BE", marginHorizontal: -24 }} className="mt-4 mb-6" />

          {/* Wholesale Groups Section */}
          <View className="mt-2">
            <Text className="text-base font-extrabold text-[#030E25] mb-4">Wholesale Groups</Text>

            <View className="gap-4">
              {wholesaleGroups.map((group) => {
                const isDisabled = group.ordersLeft === 0;
                return (
                  <TouchableOpacity
                    key={group.id}
                    onPress={() => handleAssignGroup(group, "wholesale")}
                    activeOpacity={isDisabled ? 1 : 0.8}
                    className={`flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 ${
                      isDisabled ? "" : "shadow-sm"
                    }`}
                  >
                    <View>
                      <Text
                        className={`text-base font-extrabold ${
                          isDisabled ? "text-[#54617D]" : "text-[#030E25]"
                        }`}
                      >
                        {group.timeSlot}
                      </Text>
                      <Text
                        className={`text-xs font-bold mt-1 ${
                          isDisabled ? "text-[#54617D]" : "text-[#2868FE]"
                        }`}
                      >
                        {group.ordersLeft} Orders Left to Assign
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleAssignGroup(group, "wholesale")}
                      disabled={isDisabled}
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        isDisabled ? "bg-[#E9ECF1]" : "bg-black"
                      }`}
                      activeOpacity={isDisabled ? 1 : 0.8}
                    >
                      <Feather
                        name="plus"
                        size={18}
                        color={isDisabled ? "#54617D" : "white"}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
