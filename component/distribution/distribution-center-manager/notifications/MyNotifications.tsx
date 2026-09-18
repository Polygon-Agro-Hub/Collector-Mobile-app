import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  StatusBar,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import environment from "@/environment/environment";
import store from "@/services/reducxStore";
import { getSocket } from "@/services/socket";
import * as Notifications from "expo-notifications";

import CustomHeader from "@/component/components/navigations/CustomHeader";
import NoDataScreen from "@/component/components/no-data/NoDataScreen";

// Configure in-app notifications presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type MyNotificationsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MyNotifications"
>;

interface MyNotificationsProps {
  navigation: MyNotificationsNavigationProp;
}

export interface ReturnOrderNotification {
  id: number;
  drvOrderId?: number;
  handOverOfficerId?: number;
  otpCode: number | string;
  expireTime?: string;
  createdAt: string;
  processOrderId?: number;
  drvStatus?: string;
  invNo?: string;
  mainOrderId?: number;
}

const READ_NOTIFS_STORAGE_KEY = "@dcm_read_notifications";

export default function MyNotifications({ navigation }: MyNotificationsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<ReturnOrderNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);

  // Modal state
  const [selectedOtp, setSelectedOtp] = useState<string | number | null>(null);
  const [isOtpModalVisible, setIsOtpModalVisible] = useState<boolean>(false);

  const currentUserId = store.getState().auth.id;

  // Load read notification IDs from AsyncStorage
  const loadReadIds = useCallback(async () => {
    try {
      const storageKey = `${READ_NOTIFS_STORAGE_KEY}_${currentUserId || "default"}`;
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setReadIds(new Set(parsed));
        }
      }
    } catch (e) {
      console.error("Error loading read notification IDs:", e);
    }
  }, [currentUserId]);

  // Save read IDs to AsyncStorage
  const persistReadIds = async (updatedSet: Set<number>) => {
    try {
      const storageKey = `${READ_NOTIFS_STORAGE_KEY}_${currentUserId || "default"}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(updatedSet)));
    } catch (e) {
      console.error("Error persisting read notification IDs:", e);
    }
  };

  // Fetch notifications from backend API
  const fetchNotifications = useCallback(async () => {
    try {
      const token = store.getState().auth.token;
      if (!token) return;

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success && Array.isArray(response.data.data)) {
        setNotifications(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReadIds();
    fetchNotifications();
  }, [loadReadIds, fetchNotifications]);

  // Request system notification permissions & Socket setup
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
      } catch (err) {
        console.warn("Could not request notification permissions:", err);
      }
    };
    requestNotificationPermission();

    const socket = getSocket();
    if (socket && currentUserId) {
      socket.emit("join_user", currentUserId);
      socket.emit("join_officer", currentUserId);

      const handleRealtimeNotification = async (data: any) => {
        console.log("⚡ Real-time notification received in DCM:", data);
        fetchNotifications();

        // Trigger system notification
        try {
          const invoiceNumber = data?.invNo || data?.invoiceNo || "N/A";
          const otp = data?.otpCode || data?.otp || "";
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t("MyNotifications.ReturnOrderOTP", "Return Order OTP"),
              body: `Order #${invoiceNumber}: Please use the following OTP code, “${otp}”, to receive the order from the driver at the centre.`,
              data: { otp, invoiceNumber },
            },
            trigger: null,
          });
        } catch (notifErr) {
          console.warn("Error presenting local system notification:", notifErr);
        }
      };

      socket.on("new_notification", handleRealtimeNotification);
      socket.on("new_return_otp", handleRealtimeNotification);
      socket.on("handover_return_otp", handleRealtimeNotification);

      return () => {
        socket.off("new_notification", handleRealtimeNotification);
        socket.off("new_return_otp", handleRealtimeNotification);
        socket.off("handover_return_otp", handleRealtimeNotification);
      };
    }
  }, [currentUserId, fetchNotifications, t]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  // Mark a single notification as read
  const handleNotificationPress = (item: ReturnOrderNotification) => {
    if (!readIds.has(item.id)) {
      const updated = new Set(readIds);
      updated.add(item.id);
      setReadIds(updated);
      persistReadIds(updated);
    }
    setSelectedOtp(item.otpCode);
    setIsOtpModalVisible(true);
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
    const updated = new Set(readIds);
    notifications.forEach((n) => updated.add(n.id));
    setReadIds(updated);
    persistReadIds(updated);
    setShowMenu(false);
  };

  // Helper to format time (e.g., "07:00 PM", "10:00 AM")
  const formatTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? t("Time.PM", "PM") : t("Time.AM", "AM");
      hours = hours % 12;
      hours = hours ? hours : 12; // hour 0 should be 12
      const minutesStr = minutes < 10 ? `0${minutes}` : String(minutes);
      const hoursStr = hours < 10 ? `0${hours}` : String(hours);
      return `${hoursStr}:${minutesStr} ${ampm}`;
    } catch {
      return "";
    }
  };

  // Group notifications into Today, Yesterday, Earlier
  const groupedNotifications = useMemo(() => {
    const today: ReturnOrderNotification[] = [];
    const yesterday: ReturnOrderNotification[] = [];
    const earlier: ReturnOrderNotification[] = [];

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    notifications.forEach((item) => {
      const itemDate = new Date(item.createdAt);
      const itemDay = new Date(
        itemDate.getFullYear(),
        itemDate.getMonth(),
        itemDate.getDate()
      );

      if (itemDay.getTime() === todayDate.getTime()) {
        today.push(item);
      } else if (itemDay.getTime() === yesterdayDate.getTime()) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  }, [notifications]);

  // OTP string without spaces
  const formattedOtpCode = useMemo(() => {
    if (selectedOtp === null || selectedOtp === undefined) return "";
    return String(selectedOtp);
  }, [selectedOtp]);

  const renderNotificationCard = (item: ReturnOrderNotification) => {
    const isUnread = !readIds.has(item.id);
    const invoiceNumber = item.invNo || (item.processOrderId ? String(item.processOrderId) : "N/A");

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.88}
        onPress={() => handleNotificationPress(item)}
        className="bg-white mb-3.5 p-4"
        style={{
          borderRadius: 26,
          borderWidth: 1,
          borderTopWidth: 1,
          borderRightWidth: 1,
          borderBottomWidth: 1,
          borderLeftWidth: isUnread ? 5.5 : 1,
          borderTopColor: "#EBECEF",
          borderRightColor: "#EBECEF",
          borderBottomColor: "#EBECEF",
          borderLeftColor: isUnread ? "#980775" : "#EBECEF",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 5,
          elevation: 2,
        }}
      >
        <View>
          {/* Header Row: Title and Time */}
          <View className="flex-row items-center justify-between mb-1.5">
            <Text className="font-extrabold text-sm text-[#17262C]">
              {t("MyNotifications.ReturnOrderOTP", "Return Order OTP")}
            </Text>
            <Text className="text-xs text-[#79747E] font-medium">
              {formatTime(item.createdAt)}
            </Text>
          </View>

          {/* Template Body */}
          <Text className="text-xs text-[#79747E] leading-5">
            <Text>{t("MyNotifications.Order", "Order")} </Text>
            <Text className="font-bold text-[#17262C]">#{invoiceNumber}: </Text>
            <Text>
              {t(
                "MyNotifications.PleaseUseTheFollowingOTPCode",
                "Please use the following OTP code, “{{otp}}”, to receive the order from the driver at the centre.",
                { otp: item.otpCode }
              )}
            </Text>
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
      <View className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

        {/* CustomHeader Component */}
        <CustomHeader
          title={t("MyNotifications.Title", "My Notifications")}
          navigation={navigation}
          rightComponent={
            <View className="relative">
              <TouchableOpacity
                onPress={() => setShowMenu(!showMenu)}
                activeOpacity={0.7}
                className="w-10 h-10 rounded-full items-center justify-center"
              >
                <Feather name="more-vertical" size={22} color="#17262C" />
              </TouchableOpacity>

              {/* Dropdown Menu for 3-dots */}
              {showMenu && (
                <View
                  className="absolute right-0 top-11 bg-white rounded-2xl py-2 px-4 z-50 border border-[#E5E7EB]"
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleMarkAllAsRead}
                    activeOpacity={0.8}
                    className="py-1.5 items-center justify-center"
                  >
                    <Text className="text-sm font-semibold text-[#17262C]">
                      {t("MyNotifications.MarkAllAsRead", "Mark all as read")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />

        {/* Main Notifications List */}
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#980775" />
          </View>
        ) : notifications.length === 0 ? (
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <NoDataScreen message={t("MyNotifications.NoNotifications", "No notifications yet")} />
          </ScrollView>
        ) : (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Group: Today */}
            {groupedNotifications.today.length > 0 && (
              <View className="mb-4">
                <Text className="font-bold text-sm text-[#17262C] mb-2.5">
                  {t("MyNotifications.Today", "Today")}
                </Text>
                {groupedNotifications.today.map((item) => renderNotificationCard(item))}
              </View>
            )}

            {/* Group: Yesterday */}
            {groupedNotifications.yesterday.length > 0 && (
              <View className="mb-4">
                <Text className="font-bold text-sm text-[#17262C] mb-2.5">
                  {t("MyNotifications.Yesterday", "Yesterday")}
                </Text>
                {groupedNotifications.yesterday.map((item) => renderNotificationCard(item))}
              </View>
            )}

            {/* Group: Earlier */}
            {groupedNotifications.earlier.length > 0 && (
              <View className="mb-4">
                <Text className="font-bold text-sm text-[#17262C] mb-2.5">
                  {t("MyNotifications.Earlier", "Earlier")}
                </Text>
                {groupedNotifications.earlier.map((item) => renderNotificationCard(item))}
              </View>
            )}
          </ScrollView>
        )}

        {/* Modal: Use this OTP Code */}
        <Modal
          visible={isOtpModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsOtpModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setIsOtpModalVisible(false)}>
            <View
              className="flex-1 justify-center items-center px-6"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
            >
              <TouchableWithoutFeedback>
                <View
                  className="bg-white rounded-3xl w-full max-w-[340px] px-6 pt-10 pb-6 items-center relative"
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.25,
                    shadowRadius: 15,
                    elevation: 10,
                  }}
                >
                  {/* Floating Purple Circle Badge on Top */}
                  <View
                    className="w-14 h-14 rounded-full bg-[#980775] items-center justify-center absolute -top-7"
                    style={{
                      shadowColor: "#980775",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 6,
                      elevation: 5,
                    }}
                  >
                    <FontAwesome5 name="box" size={22} color="#FFFFFF" />
                  </View>

                  {/* Title */}
                  <Text className="font-bold text-lg text-[#17262C] mb-5 text-center">
                    {t("MyNotifications.UseThisOTPCode", "Use this OTP Code")}
                  </Text>

                  {/* OTP Digits Container */}
                  <View
                    className="w-full rounded-full py-3.5 items-center justify-center mb-6"
                    style={{
                      backgroundColor: "#FFF5FC",
                      borderColor: "#F6C7EB",
                      borderWidth: 1.5,
                    }}
                  >
                    <Text className="font-bold text-2xl text-[#17262C] text-center">
                      {formattedOtpCode}
                    </Text>
                  </View>

                  {/* Close Button */}
                  <TouchableOpacity
                    onPress={() => setIsOtpModalVisible(false)}
                    activeOpacity={0.8}
                    className="w-full h-12 rounded-full bg-black items-center justify-center"
                    style={{
                      shadowColor: "#000000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 4,
                      elevation: 3,
                    }}
                  >
                    <Text className="text-white font-bold text-base">
                      {t("MyNotifications.Close", "Close")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}
