import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  BackHandler
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CircularProgress } from "react-native-circular-progress";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../types";
import AntDesign from "react-native-vector-icons/AntDesign";
import {environment }from '@/environment/environment';
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

type OfficerSummaryNavigationProp = StackNavigationProp<
  RootStackParamList,
  "DistributionOfficerSummary"
>;

type OfficerSummaryRouteProp = RouteProp<RootStackParamList, "DistributionOfficerSummary">;

interface OfficerSummaryProps {
  navigation: OfficerSummaryNavigationProp;
  route: OfficerSummaryRouteProp;
}

const DistributionOfficerSummary: React.FC<OfficerSummaryProps> = ({
  route,
  navigation,
}) => {
  const {
    officerId,
    officerName,
    phoneNumber1,
    phoneNumber2,
    collectionOfficerId,
    image,
  } = route.params;
  const [showMenu, setShowMenu] = useState(false);
  const [officerStatus, setOfficerStatus] = useState("offline");
  const [taskPercentage, setTaskPercentage] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false); 
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);  
 const [targetPercentage, setTargetPercentage] = useState<number | null>(null); 

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate("Main", { screen: "DistributionOfficersList" })
        return true; 
      };

      BackHandler.addEventListener("hardwareBackPress", onBackPress);

         const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );


  const ConfirmationModal = ({ visible, onConfirm, onCancel }: any) => {
    return (
      <Modal
        transparent={true}
        visible={visible}
        animationType="fade"
        onRequestClose={onCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/60 bg-opacity-50">
          <View className="bg-white items-center rounded-lg w-80 p-6">
           <View className="flex items-center justify-center mb-4 rounded-lg bg-[#f7f8fa] p-2 w-12 h-12 ">
        <Ionicons name="warning" size={30} color="#6c7e8c" />
      </View>
            <Text className="text-center text-sm font-semibold mb-4">
              {t("DisclaimOfficer.Are you sure you want to disclaim this officer?")}
            </Text>
          
            
            <View className="flex-row  justify-center gap-4">
              <TouchableOpacity
                onPress={onCancel}
                className="p-2 py-2 border-[#95A1AC] border rounded-lg"
              >
                <Text className="text-sm text-[#6B7D8C] font-semibold">{t("ClaimOfficer.Cancel")}</Text>
              </TouchableOpacity>
  
              <TouchableOpacity
                onPress={onConfirm}
                className="p-2  py-2 bg-[#FF0700] rounded-lg"
              >
                <Text className="text-sm text-white font-semibold">{t("DisclaimOfficer.Disclaim")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  const handleDial = (phoneNumber: string) => {
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch((err) =>
      console.error("Failed to open dial pad:", err)
    );
  };


const fetchTaskSummary = async () => {
  try {
    const res = await axios.get(
      `${environment.API_BASE_URL}api/distribution-manager/officer-task-summary/${collectionOfficerId}`
    );

    console.log("\\\\\\\\\\\\\\\\\\\\\\\\", res.data);

    if (res.data.success) {
    
      const percentage = res.data.overallProgressPercentage || 0;
      setTaskPercentage(percentage);
    } else {
      Alert.alert(t("Error.error"), t("Error.No task summary found for this officer."));
    }
  } catch (error) {
    console.error("Error fetching task summary:", error);
    Alert.alert(t("Error.error"), t("Error.Failed to fetch task summary."));
  }
};



  const onRefresh = useCallback(() => {
    setRefreshing(true);
   fetchTaskSummary(); 

    setRefreshing(false);
    setShowMenu(false)
    getOnlineStatus();
  }, [collectionOfficerId]);

  useEffect(() => {
    fetchTaskSummary();
  }, [collectionOfficerId]);

  const handleCancel = () => {
    setModalVisible(false);
    setShowMenu(false)
  };
  const handleDisclaim = async () => {
    setShowMenu(false);

    if (!collectionOfficerId) {
      Alert.alert(t("Error.error"), t("Error.Missing collectionOfficerId"));
      return;
    }

      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
    return; 
  }

    try {
      const res = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/disclaim-officer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ collectionOfficerId, jobRole:"Distribution Officer" }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Disclaim failed:", errorData);
        Alert.alert(
          t("Error.error"), t("Error.Failed to disclaim officer.")
        );
        return;
      }

      const data = await res.json();
     // console.log(data);

      if (data.status === "success") {
        setModalVisible(false); // Close the modal
        Alert.alert(t("Error.Success"), t("DisclaimOfficer.Officer disclaimed successfully."));
        navigation.navigate("Main", { screen: "DistributionOfficersList" });
      } else {
        Alert.alert("QRScanner.Failed", t("DisclaimOfficer.Failed to disclaim officer."));
      }
    } catch (error) {
      console.error("Failed to disclaim:", error);
      Alert.alert("QRScanner.Failed", t("DisclaimOfficer.Failed to disclaim officer."));
    }
  };

  useFocusEffect(
    useCallback(() => {
      setShowMenu(false)
      getOnlineStatus();
    }, [collectionOfficerId])
  );
  const getOnlineStatus = async () => {
    console.log("Getting officer status...");
    try {
      const res = await fetch(
        `${environment.API_BASE_URL}api/collection-manager/get-officer-online/${collectionOfficerId}`
      );
      const data = await res.json();
     // console.log("Officer status:", data);
  
      if (data.success) {
        // Check OnlineStatus value and set status accordingly
        const { OnlineStatus } = data.result;
        
        if (OnlineStatus === 1) {
          setOfficerStatus("online"); 
          setIsOnline(true);
          console.log("Officer is online");
        } else {
          setOfficerStatus("offline");
          setIsOnline(false);
          console.log("Officer is offline");
        }
      } else {
        console.error("Failed to get officer status");
        Alert.alert(t("Error.error"), t("Error.Failed to get officer status."));
      }
    } catch (error) {
      console.error("Failed to get officer status:", error);
      Alert.alert(t("Error.error"), t("Error.Failed to get officer status."));
    }
  };
  

  return (
    <ScrollView
    showsVerticalScrollIndicator= {false}
      className="flex-1 bg-white mb-10 "
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View className="relative">
     
        <View className="bg-white rounded-b-[25px] px-4 pt-12 pb-6 items-center shadow-lg z-10">
        
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Main", { screen: "DistributionOfficersList" })
            }
            className="absolute top-4 left-4 bg-[#F6F6F680] rounded-full p-2"
          >
            <AntDesign name="left" size={22} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            className="absolute top-4 right-4"
            onPress={() => setShowMenu((prev) => !prev)}
          >
            <Ionicons name="ellipsis-vertical" size={24} />
          </TouchableOpacity>

          {showMenu && (
            <View className="absolute z-50 top-14 right-4 bg-white shadow-lg rounded-lg">
              <TouchableOpacity
                className="p-2 py-2 bg-white rounded-lg shadow-lg"
                onPress={() => setModalVisible(true)}
              >
                <Text className="text-gray-700 font-semibold">{t("OfficerSummary.Disclaim")}</Text>
              </TouchableOpacity>
            </View>
          )}

     
          <View className={`w-28 h-28 border-[6px] rounded-full items-center justify-center ${isOnline ? 'border-[#980775]' : 'border-gray-400'}`}>

            <Image
              source={
                image
                  ? { uri: image }
                  : require("../../assets/images/mprofile.webp")
              }
              className="w-24 h-24 rounded-full "
            />
          </View>
      
          <Text className="mt-4 text-lg font-bold text-black">
            {officerName}
          </Text>
          <Text className="text-sm text-gray-500">{t("DistributionOfficersList.EMPID")} {officerId}</Text>
        </View>

  
        <View className="bg-[#980775] rounded-b-[45px] px-8 py-4 -mt-6 flex-row justify-around shadow-md z-0">
   
          {phoneNumber1 ? (
            <TouchableOpacity
              className="items-center mt-5"
              onPress={() => handleDial(phoneNumber1)}
            >
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <Ionicons name="call" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">{t("OfficerSummary.Num1")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={true} className="items-center mt-5">
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <MaterialIcons name="error-outline" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">{t("OfficerSummary.Num1")}</Text>
            </TouchableOpacity>
          )}

    
          {phoneNumber2 ? (
            <TouchableOpacity
              className="items-center mt-5"
              onPress={() => handleDial(phoneNumber2)}
            >
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <Ionicons name="call" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">{t("OfficerSummary.Num2")}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={true} className="items-center mt-5">
              <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
                <MaterialIcons name="error-outline" size={24} color="white" />
              </View>
              <Text className="text-white mt-2 text-xs">{t("OfficerSummary.Num2")}</Text>
            </TouchableOpacity>
          )}

    
          <TouchableOpacity
            className="items-center mt-5"
            onPress={() =>
              navigation.navigate("DistributionOfficerReport" as any, {
                officerId,
                collectionOfficerId,
              })
            }
          >
            <View className="w-12 h-12 bg-[#FFFFFF66] rounded-full items-center justify-center shadow-md">
              <MaterialIcons name="description" size={24} color="white" />
            </View>
            <Text className="text-white mt-2 text-xs">{t("OfficerSummary.Report")}</Text>
          </TouchableOpacity>
        </View>
      </View>


      <View className="mt-6 px-6">

        <View className="items-center mt-4">
 
          <View className="items-center mb-8">
            <CircularProgress
              size={120}
              width={10}
              fill={taskPercentage ?? 0} 
              tintColor="#21202B"
              backgroundColor="#E5E7EB"
            >
              {(fill: number) => (
                <Text className="text-[#21202B] font-bold text-xl">
                  {Math.round(fill)}%
                </Text>
              )}
            </CircularProgress>

            <Text className="text-base text-gray-500 mt-4">{t("OfficerSummary.Target Coverage")}</Text>
          </View>

         

          <View className="mt-6 mb-10 items-center">
            <TouchableOpacity
              className="bg-black rounded-full w-64 py-3 h-12"
              onPress={() =>
                navigation.navigate("DailyTargetListOfficerDistribution", {
                  officerId,
                  collectionOfficerId,
                })
              }
            >
              <Text className="text-white text-center font-medium text-base">
              {t("OfficerSummary.OpenTarget")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <ConfirmationModal
        visible={modalVisible}
        onConfirm={handleDisclaim}
        onCancel={handleCancel}
      />
    </ScrollView>
  );
};

export default DistributionOfficerSummary;
