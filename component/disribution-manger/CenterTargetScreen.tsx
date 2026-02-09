import { StackNavigationProp } from "@react-navigation/stack";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { RootStackParamList } from "../types";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { environment } from "@/environment/environment";
import LottieView from "lottie-react-native";
import { AntDesign } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { RouteProp } from "@react-navigation/native";
import { Animated } from "react-native";
import {
  fetchOrderDetailsByIds,
  processOrdersForDelivery,
} from "@/component/disribution-manger/pdf";
import i18n from "@/i18n/i18n";

type CenterTargetScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "CenterTargetScreen"
>;
type CenterTargetScreenRouteProp = RouteProp<
  RootStackParamList,
  "CenterTargetScreen"
>;

interface CenterTargetScreenProps {
  navigation: CenterTargetScreenNavigationProps;
  route: CenterTargetScreenRouteProp;
}

interface TargetData {
  id: string;
  invoiceNo: string;
  varietyNameEnglish: string;
  varietyNameSinhala: string;
  varietyNameTamil: string;
  grade: string;
  target: number;
  complete: number;
  todo: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  completedTime?: string | null;
  selectedStatus: "Pending" | "Opened" | "Completed";
  additionalItemStatus: "Pending" | "Opened" | "Completed" | null;
  packageItemStatus: "Pending" | "Opened" | "Completed" | null;
  totalAdditionalItems: number;
  packedAdditionalItems: number;
  pendingAdditionalItems: number;
  totalPackageItems: number | null;
  packedPackageItems: number | null;
  packageIsLock: number;
  pendingPackageItems: number | null;
  isPackage: number;
  orderId: string;
  sheduleDate: string;
  sheduleTime: string;
  outDlvrDate: string;
  isComplete: number;
}

interface ApiTargetData {
  distributedTargetId: string;
  companycenterId: string;
  userId: string;
  target: number;
  complete: number;
  targetCreatedAt: string;
  distributedTargetItemId: string;
  orderId: string;
  isComplete: boolean;
  completeTime: string | null;
  itemCreatedAt: string;
  processOrderId: string;
  invNo: string;
  transactionId: string;
  paymentMethod: string;
  isPaid: boolean;
  amount: number;
  status: string;
  orderCreatedAt: string;
  reportStatus: string;
  selectedStatus: "Pending" | "Opened" | "Completed";
  additionalItemStatus: "Pending" | "Opened" | "Completed" | null;
  packageItemStatus: "Pending" | "Opened" | "Completed" | null;
  totalAdditionalItems: number;
  packedAdditionalItems: number;
  pendingAdditionalItems: number;
  totalPackageItems: number | null;
  packedPackageItems: number | null;
  pendingPackageItems: number | null;
  isPackage: number;
  packageIsLock: number;
  sheduleDate: string;
  sheduleTime: string;
  outDlvrDate: string;
}

interface DateOption {
  date: Date;
  label: string;
  timeSlots: string[];
}
interface DetailedOrderResponse {
  orderId: string;
  customerEmail?: string;
  email?: string;
  customerName?: string;
  name?: string;
  customerPhone?: string;
  phone?: string;
  customerAddress?: string;
  address?: string;
  totalAmount?: number;
  items?: OrderItem[];
}

interface OrderItem {
  name: string;
  grade: string;
  quantity: string;
  unitPrice: number;
  total: number;
}

interface EnhancedTargetData extends TargetData {
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  totalAmount?: number;
  items?: OrderItem[];
}

const CenterTargetScreen: React.FC<CenterTargetScreenProps> = ({
  navigation,
  route,
}) => {
  const { centerId } = route.params;
  const [todoData, setTodoData] = useState<TargetData[]>([]);
  const [completedData, setCompletedData] = useState<TargetData[]>([]);
  const [centerCode, setcenterCode] = useState<string | null>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedToggle, setSelectedToggle] = useState("ToDo");
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [outData, setOutData] = useState<TargetData[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<
    string | null
  >(null);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(
    null,
  );
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [hasActiveFilter, setHasActiveFilter] = useState(false);
  const [completedDateFilter, setCompletedDateFilter] = useState<string | null>(
    null,
  );
  const [showCompletedCalendarModal, setShowCompletedCalendarModal] =
    useState(false);
  const [hasCompletedFilter, setHasCompletedFilter] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const MAX_SELECTED_ORDERS = 5;
  const [selectionLimitReached, setSelectionLimitReached] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  //console.log("------centerId--------", centerId);

  const fetchSelectedLanguage = async () => {
    try {
      const lang = await AsyncStorage.getItem("@user_language");
      setSelectedLanguage(lang || "en");
    } catch (error) {
      console.error("Error fetching language preference:", error);
    }
  };

  const getDateOptions = (): DateOption[] => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(today.getDate() + 2);

    const timeSlots = ["8AM - 2PM", "2PM - 8PM"];

    return [
      {
        date: today,
        label: t("CenterTargetScreen.Today"),
        timeSlots,
      },
      {
        date: tomorrow,
        label: t("CenterTargetScreen.Tomorrow"),
        timeSlots,
      },
      {
        date: dayAfterTomorrow,
        label: formatDateForDisplay(dayAfterTomorrow),
        timeSlots,
      },
    ];
  };

  const getStatusText = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    switch (normalizedStatus) {
      case "completed":
      case "සම්පූර්ණ":
      case "සම්පූර්ණයි":
      case "සම්පූර්ණ කළ":
      case "முடிந்தது":
      case "முடிக்கப்பட்டது":
      case "நிறைவு":
        return t("Status.Completed");
      case "opened":
      case "විවෘත":
      case "විවෘතයි":
      case "විවෘත කරන ලද":
      case "திறக்கப்பட்டது":
      case "திறக்கப்பட்டது":
      case "திறந்த":
        return t("Status.Opened");
      case "pending":

      case "අපරිපූර්ණ":
      case "நிலுவையில்":
        return t("Status.Pending");
      default:
        return t("Status.Unknown");
    }
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    // Return only background and border classes
    if (normalizedStatus === "completed") {
      return "bg-[#B7FFB9] border border-[#B7FFB9]";
    }
    if (normalizedStatus === "opened") {
      return "bg-[#FBFF0066] border border-[#FBFF0066]";
    }
    if (normalizedStatus === "pending") {
      return "bg-[#FF070733] border border-[#FF070733]";
    }

    if (
      normalizedStatus === "සම්පූර්ණ" ||
      normalizedStatus === "සම්පූර්ණයි" ||
      normalizedStatus === "සම්පූර්ණ කළ"
    ) {
      return "bg-[#B7FFB9] border border-[#B7FFB9]";
    }
    if (
      normalizedStatus === "විවෘත" ||
      normalizedStatus === "විවෘතයි" ||
      normalizedStatus === "විවෘත කරන ලද"
    ) {
      return "bg-[#FBFF0066] border border-[#FBFF0066]";
    }
    if (normalizedStatus === "අපරිපූර්ණ") {
      return "bg-[#FF070733] border border-[#FF070733]";
    }

    if (
      normalizedStatus === "முடிக்கப்பட்டது" ||
      normalizedStatus === "நிறைவு" ||
      normalizedStatus === "முடிக்கப்பட்ட"
    ) {
      return "bg-[#B7FFB9] border border-[#B7FFB9]";
    }
    if (
      normalizedStatus === "திறக்கப்பட்டது" ||
      normalizedStatus === "திறந்த" ||
      normalizedStatus === "திறந்தது"
    ) {
      return "bg-[#FBFF0066] border border-[#FBFF0066]";
    }
    if (normalizedStatus === "நிலுவையில்") {
      return "bg-[#FF070733] border border-[#FF070733]";
    }

    return "bg-gray-100 border border-gray-300";
  };

  const getStatusTextColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();

    if (
      normalizedStatus === "completed" ||
      normalizedStatus === "සම්පූර්ණ" ||
      normalizedStatus === "සම්පූර්ණයි" ||
      normalizedStatus === "සම්පූර්ණ කළ" ||
      normalizedStatus === "முடிக்கப்பட்டது" ||
      normalizedStatus === "நிறைவு" ||
      normalizedStatus === "முடிக்கப்பட்ட"
    ) {
      return "text-[#6AD16D]";
    }
    if (
      normalizedStatus === "opened" ||
      normalizedStatus === "විවෘත" ||
      normalizedStatus === "විවෘතයි" ||
      normalizedStatus === "විවෘත කරන ලද" ||
      normalizedStatus === "திறக்கப்பட்டது" ||
      normalizedStatus === "திறந்த" ||
      normalizedStatus === "திறந்தது"
    ) {
      return "text-[#A8A100]";
    }
    if (
      normalizedStatus === "pending" ||
      normalizedStatus === "අපරිපූර්ණ" ||
      normalizedStatus === "நிலுவையில்"
    ) {
      return "text-[#FF0700]";
    }

    return "text-gray-700";
  };

  const getGradePriority = (grade: string): number => {
    switch (grade) {
      case "A":
        return 1;
      case "B":
        return 2;
      case "C":
        return 3;
      default:
        return 4;
    }
  };

  const getVarietyNameForSort = (item: TargetData) => {
    switch (selectedLanguage) {
      case "si":
        return item.varietyNameSinhala || "";
      case "ta":
        return item.varietyNameTamil || "";
      default:
        return item.varietyNameEnglish || "";
    }
  };

  const sortByVarietyAndGrade = (data: TargetData[]) => {
    return [...data].sort((a, b) => {
      const nameA = getVarietyNameForSort(a);
      const nameB = getVarietyNameForSort(b);
      const nameComparison = nameA.localeCompare(nameB);

      if (nameComparison === 0) {
        return getGradePriority(a.grade) - getGradePriority(b.grade);
      }

      return nameComparison;
    });
  };

  const mapApiDataToTargetData = (apiData: ApiTargetData[]): TargetData[] => {
    return apiData.map((item, index) => ({
      id:
        item.distributedTargetItemId || `${item.distributedTargetId}_${index}`,
      invoiceNo: item.invNo,
      varietyNameEnglish: `Order ${item.invNo}`,
      varietyNameSinhala: `ඇණවුම ${item.invNo}`,
      varietyNameTamil: `ஆர்டர் ${item.invNo}`,
      grade: "A",
      target: item.target,
      complete: item.complete,
      todo: item.target - item.complete,
      status: item.status,
      createdAt: item.targetCreatedAt,
      updatedAt: item.itemCreatedAt,
      completedTime: item.completeTime,
      selectedStatus: item.selectedStatus,
      additionalItemStatus: item.additionalItemStatus,
      packageItemStatus: item.packageItemStatus,
      totalAdditionalItems: item.totalAdditionalItems || 0,
      packedAdditionalItems: item.packedAdditionalItems || 0,
      pendingAdditionalItems: item.pendingAdditionalItems || 0,
      totalPackageItems: item.totalPackageItems,
      packageIsLock: item.packageIsLock,
      packedPackageItems: item.packedPackageItems,
      pendingPackageItems: item.pendingPackageItems,
      isPackage: item.isPackage,
      orderId: item.orderId,
      sheduleDate: item.sheduleDate,
      sheduleTime: item.sheduleTime,
      outDlvrDate: item.outDlvrDate,
      isComplete: Number(item.isComplete),
    }));
  };

  const fetchTargets = useCallback(async () => {
    setLoading(true);
    try {
      const authToken = await AsyncStorage.getItem("token");

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // console.log("Making request to:", `${environment.API_BASE_URL}api/distribution-manager/get-dcenter-target`);

      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/get-dcenter-target`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        const apiData = response.data.data;
        const mappedData = mapApiDataToTargetData(apiData);

        console.log("Mapped data sample:", mappedData.slice(0, 2));

        const todoItems = mappedData.filter((item: TargetData) => {
          const isPendingOrOpened = ["Pending", "Opened"].includes(
            item.selectedStatus,
          );
          console.log(
            `ToDo filter - Item ${item.invoiceNo}: selectedStatus="${item.selectedStatus}", isPendingOrOpened=${isPendingOrOpened}`,
          );
          return isPendingOrOpened;
        });

        const completedItems = mappedData.filter((item: TargetData) => {
          const isCompleted =
            item.isComplete === 1 && item.status === "Processing";
          console.log(
            `Completed filter - Item ${item.invoiceNo}: isComplete=${item.isComplete}, status="${item.status}", isCompleted=${isCompleted}`,
          );
          return isCompleted;
        });

        const outItems = mappedData.filter((item: TargetData) => {
          const isOutStatus =
            item.status === "Out For Delivery" ||
            item.status === "Ready to Pickup";
          console.log(
            `Out filter - Item ${item.invoiceNo}: status="${item.status}", isOutStatus=${isOutStatus}`,
          );
          return isOutStatus;
        });

        console.log("Todo Items count:", todoItems.length);
        console.log("Completed Items count:", completedItems.length);
        console.log("Out Items count:", outItems.length);

        setTodoData(sortByVarietyAndGrade(todoItems));
        setCompletedData(sortByVarietyAndGrade(completedItems));
        setOutData(sortByVarietyAndGrade(outItems));

        setError(null);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);

      let errorMessage = t("Error.Failed to fetch data.");

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage = "Bad request - please check your authentication";
      } else if (err.response?.status === 401) {
        errorMessage = "Unauthorized - please login again";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      setTodoData([]);
      setCompletedData([]);
      setOutData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLanguage, t]);

  const formatCompletionTime = (dateString: string | null): string | null => {
    if (!dateString) return null;

    try {
      const date = new Date(dateString);

      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${year}/${month}/${day} ${displayHours.toString().padStart(2, "0")}:${minutes}${ampm}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return null;
    }
  };

  const clearAllFilters = () => {
    setSelectedDateFilter(null);
    setSelectedStatusFilter(null);
    setHasActiveFilter(false);
  };

  const clearCompletedFilters = () => {
    setCompletedDateFilter(null);
    setHasCompletedFilter(false);
  };

  useEffect(() => {
    const isFilterActive =
      selectedDateFilter !== null || selectedStatusFilter !== null;
    setHasActiveFilter(isFilterActive);
  }, [selectedDateFilter, selectedStatusFilter]);

  const getScheduleDisplayForCompleted = (
    scheduleDate: string,
    scheduleTime: string,
  ) => {
    if (!scheduleDate || !scheduleTime) return "N/A";

    const isToday = isScheduleDateToday(scheduleDate);
    const timeSlot = formatScheduleTime(scheduleTime);

    if (isToday) {
      return `Today\n${timeSlot}`;
    } else {
      return `${formatScheduleDate(scheduleDate)}\n${timeSlot}`;
    }
  };

  useEffect(() => {
    const isCompletedFilterActive = completedDateFilter !== null;
    setHasCompletedFilter(isCompletedFilterActive);
  }, [completedDateFilter]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchSelectedLanguage();
      const centerCode = await AsyncStorage.getItem("centerCode");
      setcenterCode(centerCode);
      await fetchTargets();
    };
    fetchData();
  }, [fetchTargets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTargets();
  };

  const isScheduleDateToday = (dateString: string): boolean => {
    if (!dateString) return false;

    try {
      const scheduleDate = new Date(dateString);
      const today = new Date();

      return (
        scheduleDate.getFullYear() === today.getFullYear() &&
        scheduleDate.getMonth() === today.getMonth() &&
        scheduleDate.getDate() === today.getDate()
      );
    } catch (error) {
      console.error("Error checking if date is today:", error);
      return false;
    }
  };

  const getScheduleDateColor = (dateString: string): string => {
    if (!dateString) return "#606060";

    try {
      const scheduleDate = new Date(dateString);
      scheduleDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (scheduleDate.getTime() === today.getTime()) {
        return "#FF0000";
      } else if (scheduleDate < today) {
        return "#AC0003";
      } else {
        return "#606060";
      }
    } catch (error) {
      console.error("Error getting schedule date color:", error);
      return "#606060";
    }
  };

  const getOutingStatus = (
    outTime: string | null,
    scheduleTime: string | null,
  ): string => {
    if (!outTime || !scheduleTime) return "N/A";

    try {
      const outDate = new Date(outTime);

      const timeRangeMatch = scheduleTime.match(
        /within\s*(\d+)(AM|PM)\s*-\s*(\d+)(AM|PM)/i,
      );

      if (!timeRangeMatch) {
        const altMatch = scheduleTime.match(/(\d+)(AM|PM)\s*-\s*(\d+)(AM|PM)/i);
        if (!altMatch) return "N/A";

        var [, startHourStr, startPeriod, endHourStr, endPeriod] = altMatch;
      } else {
        var [, startHourStr, startPeriod, endHourStr, endPeriod] =
          timeRangeMatch;
      }

      const convertTo24Hour = (hourStr: string, period: string): number => {
        let hour = parseInt(hourStr);

        if (period.toUpperCase() === "PM" && hour !== 12) {
          hour += 12;
        } else if (period.toUpperCase() === "AM" && hour === 12) {
          hour = 0;
        }

        return hour;
      };

      const startHour = convertTo24Hour(startHourStr, startPeriod);
      const endHour = convertTo24Hour(endHourStr, endPeriod);

      const outHour = outDate.getHours();
      const outMinutes = outDate.getMinutes();
      const outTotalMinutes = outHour * 60 + outMinutes;

      const startTotalMinutes = startHour * 60;
      const endTotalMinutes = endHour * 60;

      if (
        outTotalMinutes >= startTotalMinutes &&
        outTotalMinutes <= endTotalMinutes
      ) {
        return t("CenterTargetScreen.On Time");
      } else if (outTotalMinutes < startTotalMinutes) {
        return t("CenterTargetScreen.On Time");
      } else {
        return t("CenterTargetScreen.Late");
      }
    } catch (error) {
      console.error("Error determining outing status:", error);
      return "N/A";
    }
  };

  const getCompletionStatus = (
    completedTime: string | null | undefined,
    scheduleTime: string | null | undefined,
  ): "on-time" | "late" | "unknown" => {
    if (!completedTime || !scheduleTime) return "unknown";

    try {
      const completedDate = new Date(completedTime);
      const offsetMilliseconds = 6.5 * 60 * 60 * 1000;
      const adjustedCompletedDate = new Date(
        completedDate.getTime() + offsetMilliseconds,
      );

      const today = new Date();
      const isToday =
        adjustedCompletedDate.getDate() === today.getDate() &&
        adjustedCompletedDate.getMonth() === today.getMonth() &&
        adjustedCompletedDate.getFullYear() === today.getFullYear();

      if (!isToday) return "unknown";

      const completedHour = adjustedCompletedDate.getHours();
      const completedMinute = adjustedCompletedDate.getMinutes();
      const completedTotalMinutes = completedHour * 60 + completedMinute;

      const timeRangeMatch = scheduleTime.match(
        /within\s*(\d+)(AM|PM)\s*-\s*(\d+)(AM|PM)/i,
      );

      if (!timeRangeMatch) {
        const altMatch = scheduleTime.match(/(\d+)(AM|PM)\s*-\s*(\d+)(AM|PM)/i);
        if (!altMatch) return "unknown";

        var [, startHourStr, startPeriod, endHourStr, endPeriod] = altMatch;
      } else {
        var [, startHourStr, startPeriod, endHourStr, endPeriod] =
          timeRangeMatch;
      }

      const convertTo24Hour = (hourStr: string, period: string): number => {
        let hour = parseInt(hourStr);

        if (period.toUpperCase() === "PM" && hour !== 12) {
          hour += 12;
        } else if (period.toUpperCase() === "AM" && hour === 12) {
          hour = 0;
        }

        return hour;
      };

      const startHour = convertTo24Hour(startHourStr, startPeriod);
      const endHour = convertTo24Hour(endHourStr, endPeriod);

      const startTotalMinutes = startHour * 60;
      const endTotalMinutes = endHour * 60;

      if (
        completedTotalMinutes >= startTotalMinutes &&
        completedTotalMinutes <= endTotalMinutes
      ) {
        return "on-time";
      } else if (completedTotalMinutes < startTotalMinutes) {
        return "on-time";
      } else {
        return "late";
      }
    } catch (error) {
      console.error("Error determining completion status:", error);
      return "unknown";
    }
  };

  const formatScheduleTime = (timeString: string): string => {
    if (!timeString) return "";

    return timeString.replace(/^within\s*/i, "").trim();
  };

  const formatScheduleDate = (dateString: string): string => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      return `${month}/${day}`;
    } catch (error) {
      console.error("Error formatting schedule date:", error);
      return "";
    }
  };

  const formatDateForDisplay = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${month}/${day}`;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const filterByCompletionDate = (
    item: TargetData,
    dateFilter: string,
  ): boolean => {
    if (!item.completedTime) return false;

    try {
      const itemDate = new Date(item.completedTime);
      const today = new Date();

      if (dateFilter === "Today") {
        return isSameDay(itemDate, today);
      } else if (dateFilter === "Tomorrow") {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return isSameDay(itemDate, tomorrow);
      } else if (dateFilter.includes("/")) {
        const filterDate = formatDateForDisplay(itemDate);
        return filterDate === dateFilter;
      }

      return false;
    } catch (error) {
      console.error("Error filtering by completion date:", error);
      return false;
    }
  };

  const filteredTodoData = useMemo(() => {
    let filtered = [...todoData];

    if (selectedDateFilter) {
      filtered = filtered.filter((item) => {
        try {
          const itemDate = new Date(item.sheduleDate);
          const today = new Date();

          let matchDate = false;

          if (selectedDateFilter === "Today") {
            matchDate = isSameDay(itemDate, today);
          } else if (selectedDateFilter === "Tomorrow") {
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            matchDate = isSameDay(itemDate, tomorrow);
          } else if (selectedDateFilter.includes("/")) {
            const filterDate = formatDateForDisplay(itemDate);
            matchDate = filterDate === selectedDateFilter;
          }

          return matchDate;
        } catch (error) {
          console.error("Error filtering by date:", error);
        }
        return false;
      });
    }

    return filtered;
  }, [todoData, selectedDateFilter]);

  const filteredCompletedData = useMemo(() => {
    let filtered = [...completedData];

    if (completedDateFilter) {
      filtered = filtered.filter((item) =>
        filterByCompletionDate(item, completedDateFilter),
      );
    }

    return filtered;
  }, [completedData, completedDateFilter]);

  const displayedData =
    selectedToggle === "ToDo"
      ? filteredTodoData
      : selectedToggle === "Completed"
        ? filteredCompletedData
        : outData;

  const handleCheckboxToggle = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        setSelectionLimitReached(false);
        return prev.filter((id) => id !== itemId);
      } else {
        if (prev.length >= MAX_SELECTED_ORDERS) {
          setSelectionLimitReached(true);
          Alert.alert(
            t("CenterTargetScreen.Limit Reached"),
            t(
              "CenterTargetScreen.You can only select up to 5 orders at a time for delivery",
            ),
            [{ text: t("CenterTargetScreen.OK") }],
          );
          return prev;
        }
        setSelectionLimitReached(false);
        return [...prev, itemId];
      }
    });
  };

  const renderCheckbox = (item: TargetData) => {
    const isSelected = selectedItems.includes(item.id);

    return (
      <TouchableOpacity
        className="w-5 h-5 border-2 border-gray-400 rounded flex items-center justify-center"
        onPress={() => handleCheckboxToggle(item.id)}
      >
        {isSelected && <View className="w-3 h-3 bg-[#980775] rounded"></View>}
      </TouchableOpacity>
    );
  };
  const handleSelectAll = () => {
    if (selectAll) {
      // Unselect all
      setSelectedItems([]);
      setSelectAll(false);
    } else {
      // Select all
      const allIds = displayedData.map((item) => item.id);
      setSelectedItems(allIds);
      setSelectAll(true);
    }
  };

  const renderCheckboxForSelectAll = () => {
    return (
      <TouchableOpacity
        className="w-5 h-5 border-2 border-white rounded flex items-center justify-center"
        onPress={handleSelectAll}
      >
        {selectAll && <View className="w-3 h-3 bg-white rounded" />}
      </TouchableOpacity>
    );
  };

  const handleCorrectIconPress = () => {
    if (selectedItems.length > 0) {
      setShowConfirmModal(true);
    }
  };

  const handleCloseIconPress = () => {
    setSelectedItems([]);
  };

  // Function to handle right header icon press
  const handleRightIconPress = () => {
    if (selectedToggle === "ToDo") {
      if (hasActiveFilter) {
        clearAllFilters();
      } else {
        setShowCalendarModal(true);
      }
    } else if (selectedToggle === "Completed") {
      if (hasCompletedFilter) {
        clearCompletedFilters();
      } else {
        setShowCompletedCalendarModal(true);
      }
    } else if (selectedToggle === "Out") {
      console.log("Out section actions");
    }
  };

  // Function to handle correct/close icons for completed section
  const handleCompletedActionPress = (action: "correct" | "close") => {
    if (action === "correct") {
      handleCorrectIconPress();
    } else {
      handleCloseIconPress();
    }
  };

  const confirmAction = async () => {
    try {
      setLoading(true);
      const authToken = await AsyncStorage.getItem("token");

      if (!authToken) {
        throw new Error("Authentication token not found. Please login again.");
      }

      // Get selected order items with full data - Add null check
      const selectedOrdersData = selectedItems
        .map((itemId) => {
          const item = [...todoData, ...completedData, ...outData].find(
            (i) => i.id === itemId,
          );
          return item;
        })
        .filter((item): item is TargetData => item !== undefined);

      if (selectedOrdersData.length === 0) {
        throw new Error("No valid order items found for selection");
      }

      // Prepare order IDs for status update
      const orderIds = selectedOrdersData
        .map((item) => item.orderId)
        .filter((id): id is string => id !== undefined && id !== null);

      if (orderIds.length === 0) {
        throw new Error("No valid order IDs found for selected items");
      }

      console.log("Updating orders to Out For Delivery:", orderIds);

      const statusUpdateResponse = await axios.put(
        `${environment.API_BASE_URL}api/distribution/update-outForDelivery`,
        { orderIds },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!statusUpdateResponse.data?.success) {
        throw new Error(
          statusUpdateResponse.data?.message || "Failed to update order status",
        );
      }

      // console.log("Status updated successfully:", statusUpdateResponse.data);

      console.log("Fetching complete order details for:", orderIds);

      const orderDetailsResult = await fetchOrderDetailsByIds(
        orderIds,
        authToken,
      );

      if (orderDetailsResult.failed.length > 0) {
        console.warn("Some orders failed to fetch:", orderDetailsResult.failed);
      }

      if (orderDetailsResult.successful.length === 0) {
        throw new Error("Failed to fetch any order details for PDF generation");
      }

      const emailResult = await processOrdersForDelivery(
        orderDetailsResult.successful,
        authToken,
      );

      console.log("Email processing result:", emailResult);

      let successMessage = `Successfully processed ${orderIds.length} orders.`;

      if (emailResult.success && emailResult.emailsSent > 0) {
        successMessage += ` ${emailResult.emailsSent} invoices sent via email.`;
      }

      if (emailResult.errors && emailResult.errors.length > 0) {
        console.warn("Some orders had issues:", emailResult.errors);
        successMessage += ` ${emailResult.errors.length} orders had issues with PDF generation.`;
      }

      setSuccessCount(orderIds.length);
      setShowConfirmModal(false);
      setShowSuccessModal(true);

      setSelectedItems([]);

      setTimeout(() => {
        setShowSuccessModal(false);
      }, 4000);

      await fetchTargets();
    } catch (error: unknown) {
      console.error("Error in confirmAction:", error);

      let errorMessage = "Failed to update orders. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const axiosError = error as any;
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        } else if (axiosError.response?.status === 401) {
          errorMessage = "Authentication failed. Please login again.";
        } else if (axiosError.response?.status === 403) {
          errorMessage = "You don't have permission to perform this action.";
        }
      }

      Alert.alert(t("Error.somethingWentWrong"), errorMessage, [
        { text: t("CenterTargetScreen.OK") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const SuccessModal = () => {
    const progress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (showSuccessModal) {
        Animated.timing(progress, {
          toValue: 100,
          duration: 3000,
          useNativeDriver: false,
        }).start();
      } else {
        progress.setValue(0);
      }
    }, [showSuccessModal]);

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl p-8 w-11/12 max-w-sm items-center">
            <Text className="text-2xl font-bold mb-6 text-center text-gray-800">
              {t("CenterTargetScreen.Success")}
            </Text>

            <Image
              source={require("../../assets/images/New/otpsuccess.png")}
              style={{ width: 100, height: 100 }}
            />

            <Text className="text-center text-gray-600 mb-6">
              {successCount === 1
                ? t("CenterTargetScreen.order one", { count: successCount })
                : t("CenterTargetScreen.orders out for delivery", {
                    count: successCount,
                  })}
            </Text>

            {/* Progress Bar */}
            <View className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-2xl overflow-hidden">
              <Animated.View
                style={{
                  height: "100%",
                  backgroundColor: "#980775",
                  width: progress.interpolate({
                    inputRange: [0, 100],
                    outputRange: ["0%", "100%"],
                  }),
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // const formatOutTime = (dateString: string | null): string => {
  //   if (!dateString) return "N/A";

  //   try {
  //     const date = new Date(dateString);

  //     date.setHours(date.getHours() + 5);
  //     date.setMinutes(date.getMinutes() + 30);

  //     const hours = date.getHours();
  //     const minutes = date.getMinutes();
  //     const ampm = hours >= 12 ? "PM" : "AM";
  //     const displayHours = hours % 12 || 12;

  //     return `${displayHours.toString().padStart(2, "0")}.${minutes.toString().padStart(2, "0")}${ampm}`;
  //   } catch (error) {
  //     console.error("Error formatting out time:", error);
  //     return "N/A";
  //   }
  // };
  // REPLACE THIS FUNCTION IN YOUR CODE (around line 1018)
  // Find the formatOutTime function and replace it with this corrected version:

  const formatOutTime = (dateString: string | null): string => {
    if (!dateString) return "N/A";

    try {
      const date = new Date(dateString);

      // No offset adjustment - server already sends IST time
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${displayHours.toString().padStart(2, "0")}.${minutes.toString().padStart(2, "0")}${ampm}`;
    } catch (error) {
      console.error("Error formatting out time:", error);
      return "N/A";
    }
  };
  return (
    <View className="flex-1 bg-[#282828]">
      {/* Header */}
      <View className="bg-[#282828] px-4 py-6 flex-row justify-center items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="absolute left-4 bg-white/10 rounded-full  justify-center items-center"
          style={{ width: 40, height: 40 }} // Set fixed dimensions for perfect circle
        >
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>

        {selectedToggle === "ToDo" && (
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 14 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 20 },
            ]}
            className="text-white text-lg "
          >
            {t("CenterTargetScreen.Centre Target")} :{" "}
            {selectedDateFilter
              ? selectedDateFilter
              : t("CenterTargetScreen.All")}
          </Text>
        )}

        {selectedToggle === "Completed" && (
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 14 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 20 },
            ]}
            className="text-white text-lg "
          >
            {t("CenterTargetScreen.Centre Target")} :{" "}
            {completedDateFilter
              ? completedDateFilter
              : t("CenterTargetScreen.All")}
          </Text>
        )}

        {selectedToggle === "Out" && (
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 14 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 20 },
            ]}
            className="text-white text-lg "
          >
            {t("CenterTargetScreen.Centre Target")}
          </Text>
        )}

        <View className="absolute right-4 flex-row items-center space-x-2">
          {/* Filter Icon for ToDo */}
          {selectedToggle === "ToDo" && (
            <TouchableOpacity className="p-2" onPress={handleRightIconPress}>
              <Image
                source={
                  hasActiveFilter
                    ? require("../../assets/images/New/filterclear.png")
                    : require("../../assets/images/New/filter.png")
                }
                className="w-4 h-4"
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Filter Icon for Completed - only show when no items selected */}
          {selectedToggle === "Completed" && selectedItems.length === 0 && (
            <TouchableOpacity className="p-2" onPress={handleRightIconPress}>
              <Image
                source={
                  hasCompletedFilter
                    ? require("../../assets/images/New/filterclear.png")
                    : require("../../assets/images/New/filter.png")
                }
                className="w-4 h-4"
                resizeMode="contain"
              />
            </TouchableOpacity>
          )}

          {/* Close and Correct Icons for Completed section - only show when items selected */}
          {selectedToggle === "Completed" && selectedItems.length > 0 && (
            <>
              <TouchableOpacity
                className="p-2"
                onPress={() => handleCompletedActionPress("close")}
              >
                <AntDesign name="close" size={20} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                className="p-2"
                onPress={() => handleCompletedActionPress("correct")}
              >
                <AntDesign name="check" size={20} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Toggle Buttons */}
      <View className="flex-row justify-center items-center py-4 bg-[#282828]">
        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "ToDo" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center justify-center ${
              selectedToggle === "ToDo" ? "bg-[#980775]" : "bg-white"
            }`}
            onPress={() => setSelectedToggle("ToDo")}
            style={{
              shadowColor:
                selectedToggle === "ToDo" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "ToDo" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "ToDo" ? 4 : 0,
            }}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "ToDo" ? "text-white" : "text-black"
              } ${selectedToggle === "ToDo" ? "mr-2" : ""}`}
              style={[
                { opacity: selectedToggle === "ToDo" ? 1 : 0.7 },
                i18n.language === "si"
                  ? { fontSize: 13 }
                  : i18n.language === "ta"
                    ? { fontSize: 12 }
                    : { fontSize: 15 },
              ]}
            >
              {t("DailyTarget.Todo")}
            </Animated.Text>

            {selectedToggle === "ToDo" && (
              <Animated.View
                className="bg-white rounded-full px-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-[#000000] font-bold text-xs">
                  {todoData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "Completed" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center ${
              selectedToggle === "Completed" ? "bg-[#980775]" : "bg-white"
            }`}
            onPress={() => setSelectedToggle("Completed")}
            style={{
              shadowColor:
                selectedToggle === "Completed" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "Completed" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "Completed" ? 4 : 0,
            }}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "Completed" ? "text-white" : "text-black"
              }`}
              style={[
                { opacity: selectedToggle === "ToDo" ? 1 : 0.7 },
                i18n.language === "si"
                  ? { fontSize: 13 }
                  : i18n.language === "ta"
                    ? { fontSize: 12 }
                    : { fontSize: 15 },
              ]}
            >
              {t("DailyTarget.Completed")}
            </Animated.Text>

            {selectedToggle === "Completed" && (
              <Animated.View
                className="bg-white rounded-full px-2 ml-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-[#000000] font-bold text-xs">
                  {completedData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ scale: selectedToggle === "Out" ? 1.05 : 1 }],
          }}
        >
          <TouchableOpacity
            className={`px-4 py-2 rounded-full mx-2 flex-row items-center ${
              selectedToggle === "Out" ? "bg-[#980775]" : "bg-white"
            }`}
            onPress={() => setSelectedToggle("Out")}
            style={{
              shadowColor: selectedToggle === "Out" ? "#980775" : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: selectedToggle === "Out" ? 0.3 : 0,
              shadowRadius: 4,
              elevation: selectedToggle === "Out" ? 4 : 0,
            }}
          >
            <Animated.Text
              className={`font-bold ${
                selectedToggle === "Out" ? "text-white" : "text-black"
              }`}
              style={[
                { opacity: selectedToggle === "ToDo" ? 1 : 0.7 },
                i18n.language === "si"
                  ? { fontSize: 13 }
                  : i18n.language === "ta"
                    ? { fontSize: 12 }
                    : { fontSize: 15 },
              ]}
            >
              {t("CenterTargetScreen.Out")}
            </Animated.Text>

            {selectedToggle === "Out" && (
              <Animated.View
                className="bg-white rounded-full px-2 ml-2 overflow-hidden"
                style={{
                  opacity: 1,
                  transform: [{ scaleX: 1 }, { scaleY: 1 }],
                }}
              >
                <Text className="text-[#000000] font-bold text-xs">
                  {outData.length}
                </Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ToDo Calendar Filter Modal */}
      {showCalendarModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCalendarModal}
          onRequestClose={() => setShowCalendarModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-lg p-6 w-11/12 max-w-md">
              <Text className="text-lg font-bold mb-6 text-center text-gray-800">
                {t("CenterTargetScreen.Select Date")}
              </Text>

              {/* Clear Date Filter Option */}
              <TouchableOpacity
                className={`w-full mb-4 px-4 py-4 rounded-lg border-2 ${
                  selectedDateFilter === null
                    ? "bg-[#980775] border-[#980775]"
                    : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => {
                  setSelectedDateFilter(null);
                  setShowCalendarModal(false);
                }}
              >
                <Text
                  className={`text-center font-medium text-lg ${
                    selectedDateFilter === null ? "text-white" : "text-gray-700"
                  }`}
                >
                  {t("CenterTargetScreen.All Datese")}
                </Text>
              </TouchableOpacity>

              {/* 3 Day Options */}
              {getDateOptions().map((dateOption, index) => {
                const isSelected =
                  selectedDateFilter === dateOption.label ||
                  selectedDateFilter === formatDateForDisplay(dateOption.date);

                return (
                  <TouchableOpacity
                    key={index}
                    className={`w-full mb-3 px-4 py-4 rounded-lg border-2 ${
                      isSelected
                        ? "bg-[#980775] border-[#980775]"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => {
                      setSelectedDateFilter(dateOption.label);
                      setShowCalendarModal(false);
                    }}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text
                        className={`font-semibold text-lg ${
                          isSelected ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {dateOption.label}
                      </Text>
                      <Text
                        className={`font-medium ${
                          isSelected ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {formatDateForDisplay(dateOption.date)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Close Button */}
              <TouchableOpacity
                className="bg-gray-300 px-6 py-3 rounded-lg mt-4"
                onPress={() => setShowCalendarModal(false)}
              >
                <Text className="text-center font-medium text-gray-700">
                  {" "}
                  {t("CenterTargetScreen.Close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Completed Calendar Filter Modal */}
      {showCompletedCalendarModal && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCompletedCalendarModal}
          onRequestClose={() => setShowCompletedCalendarModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-lg p-6 w-11/12 max-w-md">
              <Text className="text-lg font-bold mb-6 text-center text-gray-800">
                {t("CenterTargetScreen.Select Completion Date")}
              </Text>

              {/* Clear Date Filter Option */}
              <TouchableOpacity
                className={`w-full mb-4 px-4 py-4 rounded-lg border-2 ${
                  completedDateFilter === null
                    ? "bg-[#980775] border-[#980775]"
                    : "bg-gray-50 border-gray-200"
                }`}
                onPress={() => {
                  setCompletedDateFilter(null);
                  setShowCompletedCalendarModal(false);
                }}
              >
                <Text
                  className={`text-center font-medium text-lg ${
                    completedDateFilter === null
                      ? "text-white"
                      : "text-gray-700"
                  }`}
                >
                  {t("CenterTargetScreen.All Completion Dates")}
                </Text>
              </TouchableOpacity>

              {/* 3 Day Options */}
              {getDateOptions().map((dateOption, index) => {
                const isSelected =
                  completedDateFilter === dateOption.label ||
                  completedDateFilter === formatDateForDisplay(dateOption.date);

                return (
                  <TouchableOpacity
                    key={index}
                    className={`w-full mb-3 px-4 py-4 rounded-lg border-2 ${
                      isSelected
                        ? "bg-[#980775] border-[#980775]"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => {
                      setCompletedDateFilter(dateOption.label);
                      setShowCompletedCalendarModal(false);
                    }}
                  >
                    <View className="flex-row justify-between items-center">
                      <Text
                        className={`font-semibold text-lg ${
                          isSelected ? "text-white" : "text-gray-800"
                        }`}
                      >
                        {dateOption.label}
                      </Text>
                      <Text
                        className={`font-medium ${
                          isSelected ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {formatDateForDisplay(dateOption.date)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Close Button */}
              <TouchableOpacity
                className="bg-gray-300 px-6 py-3 rounded-lg mt-4"
                onPress={() => setShowCompletedCalendarModal(false)}
              >
                <Text className="text-center font-medium text-gray-700">
                  {" "}
                  {t("CenterTargetScreen.Close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showConfirmModal}
          onRequestClose={() => {
            if (!loading) {
              setShowConfirmModal(false);
            }
          }}
        >
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-lg p-6 w-11/12 max-w-sm">
              <View className="items-center mb-2">
                <View className="w-10 h-10 rounded-lg bg-[#F6F7F9] justify-center items-center ">
                  <Image
                    source={require("../../assets/images/New/Errorcentertarget.png")}
                    style={{ width: 20, height: 20 }}
                  />
                </View>
              </View>

              <Text className="text-center text-gray-600 mb-6">
                {selectedItems.length === 1
                  ? t(
                      "CenterTargetScreen.Are you sure you want to send these selected",
                    )
                  : t("CenterTargetScreen.Are you sure you want", {
                      count: selectedItems.length,
                    })}
              </Text>

              <View className="flex-row justify-between">
                <TouchableOpacity
                  className={`px-4 py-3 rounded-lg flex-1 mr-2 ${
                    loading ? "bg-gray-200" : "bg-gray-300"
                  }`}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={loading}
                >
                  <Text
                    className={`text-center font-medium ${
                      loading ? "text-gray-400" : "text-gray-700"
                    }`}
                  >
                    {t("CenterTargetScreen.Cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`px-4 py-3 rounded-lg flex-1 ml-2 ${
                    loading ? "bg-gray-400" : "bg-[#980775]"
                  }`}
                  onPress={confirmAction}
                  disabled={loading}
                  style={loading ? { opacity: 0.6 } : { opacity: 1 }}
                >
                  <View className="flex-row justify-center items-center">
                    {loading && (
                      <ActivityIndicator
                        size="small"
                        color="white"
                        className="mr-2"
                      />
                    )}
                    <Text className="text-center font-medium text-white">
                      {loading
                        ? t("CenterTargetScreen.Processing")
                        : t("CenterTargetScreen.Out")}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {selectedToggle === "Out" ? (
        <View className="flex-row bg-[#980775] py-3">
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-1 text-center text-white font-bold"
          >
            {t("TargetOrderScreen.No")}
          </Text>
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {t("TargetOrderScreen.Invoice No")}
          </Text>
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {t("CenterTargetScreen.Out Time")}
          </Text>
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {t("CenterTargetScreen.Outing Status")}
          </Text>
        </View>
      ) : (
        <View className="flex-row bg-[#980775] py-3">
          {/* <Text 
                  style={[
  i18n.language === "si"
    ? { fontSize: 12 }
    : i18n.language === "ta"
    ? { fontSize: 12 }
    : { fontSize: 15 }
]}
      className="flex-1 text-center text-white font-bold">{selectedToggle === 'ToDo' ? t("TargetOrderScreen.No") : ''}</Text> */}

          {selectedToggle === "ToDo" ? (
            <Text
              style={[
                i18n.language === "si"
                  ? { fontSize: 12 }
                  : i18n.language === "ta"
                    ? { fontSize: 12 }
                    : { fontSize: 15 },
              ]}
              className="flex-1 text-center text-white font-bold"
            >
              {" "}
              {t("TargetOrderScreen.No")}
            </Text>
          ) : (
            <>
              <View className="flex-1 items-center justify-center -ml-1">
                {renderCheckboxForSelectAll()}
              </View>
            </>
          )}
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {t("TargetOrderScreen.Invoice No")}
          </Text>
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {selectedToggle === "Completed"
              ? t("CenterTargetScreen.Time")
              : t("TargetOrderScreen.Date")}
          </Text>
          <Text
            style={[
              i18n.language === "si"
                ? { fontSize: 12 }
                : i18n.language === "ta"
                  ? { fontSize: 12 }
                  : { fontSize: 15 },
            ]}
            className="flex-[2] text-center text-white font-bold"
          >
            {selectedToggle === "ToDo"
              ? t("TargetOrderScreen.Status")
              : t("CenterTargetScreen.Scheduled")}
          </Text>
        </View>
      )}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Error Message */}
        {error && (
          <View className="bg-red-100 border border-red-400 px-4 py-3 mx-4 mt-4 rounded">
            <Text className="text-red-700 text-center">{error}</Text>
            <TouchableOpacity
              onPress={() => fetchTargets()}
              className="mt-2 bg-red-500 px-4 py-2 rounded"
            >
              <Text className="text-white text-center">
                {t("TargetOrderScreen.Retry")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View className="flex-1 justify-center items-center py-20">
            <LottieView
              source={require("../../assets/lottie/newLottie.json")}
              autoPlay
              loop
              style={{ width: 200, height: 200 }}
            />
          </View>
        ) : displayedData.length > 0 ? (
          displayedData.map((item, index) => (
            <TouchableOpacity
              key={item.id || index}
              className={`flex-row py-4 border-b border-gray-200 ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              }`}
            >
              {/* Row Number or Checkbox */}
              <View className="flex-1 items-center justify-center relative">
                {selectedToggle === "Completed" ? (
                  renderCheckbox(item)
                ) : (
                  <Text className="text-center font-medium">
                    {(index + 1).toString().padStart(2, "0")}
                  </Text>
                )}
              </View>

              {/* Invoice Number */}
              <View className="flex-[2] items-center justify-center px-2">
                <Text className="text-center font-medium text-gray-800">
                  {/* {item.invoiceNo || `INV${item.id || (index + 1).toString().padStart(6, '0')}`} */}
                  {item.invoiceNo}
                </Text>
              </View>

              {/* Content changes based on selected toggle */}
              {selectedToggle === "Out" ? (
                <>
                  {/* Out Time */}
                  <View className="flex-[2] items-center justify-center px-2">
                    <Text className="text-center font-medium text-gray-800">
                      {formatOutTime(item.outDlvrDate)}
                    </Text>
                  </View>

                  {/* Outing Status */}
                  <View className="flex-[2] items-center justify-center px-2">
                    <View
                      className={`px-3 py-2 rounded-full ${
                        getOutingStatus(item.outDlvrDate, item.sheduleTime) ===
                        "On Time"
                          ? "bg-" // Add background color if needed
                          : getOutingStatus(
                                item.outDlvrDate,
                                item.sheduleTime,
                              ) === "On Time"
                            ? "bg-" // Add background color if needed
                            : "bg-" // Add background color if needed
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium text-center ${
                          getOutingStatus(
                            item.outDlvrDate,
                            item.sheduleTime,
                          ) === "On Time"
                            ? "text-[#980775]"
                            : getOutingStatus(
                                  item.outDlvrDate,
                                  item.sheduleTime,
                                ) === "On Time"
                              ? "text-[#980775]"
                              : "text-[#FF0700]"
                        }`}
                      >
                        {getOutingStatus(item.outDlvrDate, item.sheduleTime)}
                      </Text>
                    </View>
                  </View>
                </>
              ) : selectedToggle === "Completed" ? (
                <>
                  {/* Completed Time */}////////////
                  <View className="flex-[2] items-center justify-center px-2">
                    <Text className="text-center text-gray-600 text-sm">
                      {item.completedTime
                        ? formatCompletionTime(item.completedTime)
                        : "N/A"}
                    </Text>
                  </View>
                  {/* Schedule Display with Status */}
                  <View className="flex-[2] items-center justify-center px-2">
                    {(() => {
                      const status = getCompletionStatus(
                        item.completedTime,
                        item.sheduleTime,
                      );
                      const scheduleDisplay = getScheduleDisplayForCompleted(
                        item.sheduleDate,
                        item.sheduleTime,
                      );

                      return (
                        <View className="items-center">
                          <Text
                            className={`text-center font-medium text-xs ${
                              // Only show red/purple for TODAY's scheduled date, everything else black
                              isScheduleDateToday(item.sheduleDate)
                                ? status === "on-time"
                                  ? "text-[#980775]"
                                  : status === "late"
                                    ? "text-[#FF0700]"
                                    : "text-[#980775]"
                                : "text-black"
                            }`}
                          >
                            {scheduleDisplay}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                </>
              ) : (
                <>
                  <View className="flex-[2] items-center justify-center px-2">
                    <Text
                      className="text-center font-medium text-xs"
                      style={{ color: getScheduleDateColor(item.sheduleDate) }}
                    >
                      {formatScheduleDate(item.sheduleDate)}{" "}
                      {formatScheduleTime(item.sheduleTime) || "N/A"}
                    </Text>
                  </View>

                  {/* Status */}
                  <View className="flex-[2] items-center justify-center px-2">
                    <View
                      className={`px-3 py-2 rounded-full ${getStatusColor(item.selectedStatus)}`}
                    >
                      <Text
                        style={[
                          i18n.language === "si"
                            ? { fontSize: 12 }
                            : i18n.language === "ta"
                              ? { fontSize: 9 }
                              : { fontSize: 12 },
                        ]}
                        className={`font-medium text-center ${getStatusTextColor(item.selectedStatus)}`}
                      >
                        {getStatusText(item.selectedStatus)}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View className="flex-1 justify-center items-center py-20">
            <LottieView
              source={require("../../assets/lottie/NoComplaints.json")}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
            <Text className="text-gray-500 mt-4 text-center">
              {selectedToggle === "ToDo"
                ? t("DailyTarget.NoTodoItems") || t("DailyTarget.NoTodoItems")
                : selectedToggle === "Completed"
                  ? t("DailyTarget.noCompletedTargets") ||
                    t("DailyTarget.noCompletedTargets")
                  : t("CenterTargetScreen.No out for delivery orders")}
            </Text>
          </View>
        )}
      </ScrollView>
      {showSuccessModal && <SuccessModal />}
    </View>
  );
};

export default CenterTargetScreen;
