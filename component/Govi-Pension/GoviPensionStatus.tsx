import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Image,
  ScrollView
} from "react-native";
import { useTranslation } from "react-i18next";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import CustomHeader from "../Common/CustomHeader";
import { RootStackParamList } from "../types";

type GoviPensionStatusScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "GoviPensionStatus"
>;

type GoviPensionStatusScreenRouteProp = RouteProp<
  RootStackParamList,
  "GoviPensionStatus"
>;

interface GoviPensionStatusProps {
  navigation: GoviPensionStatusScreenNavigationProp;
  route: GoviPensionStatusScreenRouteProp;
}

type StatusType = "To Review" | "Approved" | "Rejected";


const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const GoviPensionStatus: React.FC<GoviPensionStatusProps> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();

  // Get status from route params
  const { status, creatAt } = route.params || {};
  const currentStatus = (status as StatusType) || "To Review";

  // Format the createdAt date dynamically → e.g. "January 28, 2026"
  const formattedDate = formatDate(creatAt);

  console.log("creatAt", creatAt);
  console.log("formattedDate", formattedDate);

  const getStatusConfig = () => {
    switch (currentStatus) {
      case "To Review":
        return {
          image: require("../../assets/images/govi-pension/stay-tunedR.webp"),
          title: t("GoviPensionStatus.Application Already Submitted!"),
          content: t(
            "GoviPensionStatus.It looks like the farmer has already applied for the pension on {{date}}. The application is currently under review. A decision will be shared soon. The farmer can track the status anytime through the GoViCare app.",
            { date: formattedDate } 
          ),
          buttonText: t("GoviPensionStatus.Go Back"),
          onPress: () => navigation.goBack(),
          buttonStyle: "bg-[#ECECEC]",
          buttonTextColor: "text-[#8E8E8E]",
        };
      case "Approved":
        return {
          image: require("../../assets/images/govi-pension/congratulations.webp"),
          title: t("GoviPensionStatus.Application Approved!"),
          content: t(
            "GoviPensionStatus.Advise the farmer to log in to the GoViCare app and check the current pension status.",
          ),
        };
      case "Rejected":
        return {
          image: require("../../assets/images/govi-pension/try-again.webp"),
          title: t("GoviPensionStatus.Application Rejected!"),
          content: t(
            "GoviPensionStatus.The pension application submitted on {{date}} has been reviewed and was not approved.",
            { date: formattedDate } 
          ),
        };
      default:
        return {
          image: require("../../assets/images/govi-pension/stay-tunedR.webp"),
          title: t("GoviPensionStatus.Stay Tuned!"),
          content: t(
            "GoviPensionStatus.We're taking a closer look at your pension application and will update you soon. This process might take a while.",
          ),
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="white" />

      <CustomHeader
        title={t("GoviPensionForm.GoViPension")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Image */}
        <View className="items-center justify-center mt-4 mb-8">
          <View className="w-64 h-64 overflow-hidden">
            <Image
              source={config.image}
              className="w-full h-full"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Status Title */}
        <View className="items-center mb-6">
          <Text className="text-xl font-bold text-black">{config.title}</Text>
        </View>

        {/* Status Content */}
        <View className="px-8 mb-10">
          <Text className="text-md text-[#4B6B87] text-center leading-7">
            {config.content}
          </Text>
        </View>

        {/* Spacer to push button to bottom */}
        <View className="flex-1" />
      </ScrollView>

      {/* Action Button - Always "Go Back" */}
      <View className="px-5 pb-6 pt-4 bg-white">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className={`bg-[#353535] rounded-full py-4`}
          activeOpacity={0.8}
        >
          <Text className={`text-white text-center font-bold text-lg`}>
            {t("GoviPensionStatus.Go Back")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default GoviPensionStatus;