import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { environment } from "@/environment/environment";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";

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
        setRetailGroups(retail || []);
        setWholesaleGroups(wholesale || []);
        
        // Determine page state: if all groups have 0 orders, show NoDataScreen
        const totalOrdersLeft =
          (retail || []).reduce((acc: number, item: any) => acc + (item.ordersLeft || 0), 0) +
          (wholesale || []).reduce((acc: number, item: any) => acc + (item.ordersLeft || 0), 0);

        setPageState(totalOrdersLeft > 0 ? "active" : "empty");
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

    const onBackPress = () => {
      navigation.navigate("Main", { screen: "DistridutionaDashboard" });
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress
    );
    return () => backHandler.remove();
  }, [route.params?.assignedGroupId, navigation]);

  const handleAssignGroup = (group: TimeSlotGroup, type: "retail" | "wholesale") => {
    if (group.ordersLeft === 0 || group.status === "no_orders") return;
    if (group.status === "assigned") {
      Alert.alert("Already Assigned", "This time slot group is already fully assigned.");
      return;
    }
    navigation.navigate("SelectOrder", { group, type });
  };

  return (
    <View className="flex-1 bg-white">
      {/* Standard Custom Header */}
      <CustomHeader
        title="Groups"
        navigation={navigation}
        onBackPress={() => navigation.navigate("Main", { screen: "DistridutionaDashboard" })}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#030E25" />
          <Text className="text-sm font-semibold text-[#54617D] mt-3">Loading groups...</Text>
        </View>
      ) : pageState === "empty" ? (
        <NoDataScreen message="- No groups found. Please check again after 12:00 AM tomorrow. -" />
      ) : (
        <ScrollView
          className="flex-1 bg-white"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
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
                    className={`flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 my-1`}
                    style={{
                      backgroundColor: "#ffffff",
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: isDisabled ? 0 : 3 },
                      shadowOpacity: isDisabled ? 0 : 0.1,
                      shadowRadius: isDisabled ? 0 : 6,
                      elevation: isDisabled ? 0 : 3,
                    }}
                  >
                    <View>
                      <Text
                        className={`text-base font-extrabold ${
                          isDisabled ? "text-[#54617D]" : "text-[#030E25]"
                        }`}
                      >
                        {group.timeSlot}
                      </Text>
                      {isDisabled ? (
                        <Text className="text-xs font-bold mt-1 text-[#FF0000]">
                          No orders for today
                        </Text>
                      ) : (
                        <Text className="text-xs font-bold mt-1 text-[#2868FE]">
                          {group.ordersLeft}{" "}
                          {group.ordersLeft === 1 ? "Order" : "Orders"} Left to Assign
                        </Text>
                      )}
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
                    className={`flex-row items-center justify-between bg-white border border-[#E1E7EE] rounded-2xl p-4 my-1`}
                    style={{
                      backgroundColor: "#ffffff",
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: isDisabled ? 0 : 3 },
                      shadowOpacity: isDisabled ? 0 : 0.1,
                      shadowRadius: isDisabled ? 0 : 6,
                      elevation: isDisabled ? 0 : 3,
                    }}
                  >
                    <View>
                      <Text
                        className={`text-base font-extrabold ${
                          isDisabled ? "text-[#54617D]" : "text-[#030E25]"
                        }`}
                      >
                        {group.timeSlot}
                      </Text>
                      {isDisabled ? (
                        <Text className="text-xs font-bold mt-1 text-[#FF0000]">
                          No orders for today
                        </Text>
                      ) : (
                        <Text className="text-xs font-bold mt-1 text-[#2868FE]">
                          {group.ordersLeft}{" "}
                          {group.ordersLeft === 1 ? "Order" : "Orders"} Left to Assign
                        </Text>
                      )}
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
