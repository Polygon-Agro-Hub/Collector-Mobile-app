import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n/i18n";

type EditTargetScreenNavigationProps = StackNavigationProp<
  RootStackParamList,
  "EditTargetScreen"
>;

interface EditTargetScreenProps {
  navigation: EditTargetScreenNavigationProps;
  route: {
    params: {
      varietyNameEnglish: string;
      varietyNameSinhala: string; // ✅ Added this
      varietyNameTamil: string; // ✅ Added this
      grade: string;
      varietyId: string;
      target: string;
      todo: string;
      qty: string;
      collectionOfficerId: number;
      officerId:string;
    };
  };
}

const EditTargetScreen: React.FC<EditTargetScreenProps> = ({
  navigation,
  route,
}) => {
  const [myTarget, setMyTarget] = useState("100kg");
  const [isEditing, setIsEditing] = useState(false);
  const [toDoAmount] = useState("50kg");
  const { t } = useTranslation();

  const [selectedLanguage, setSelectedLanguage] = useState<string>("en");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const lang = await AsyncStorage.getItem("@user_language");
        if (lang) {
          setSelectedLanguage(lang);
        }
      } catch (error) {
        console.error("Error fetching language preference:", error);
      }
    };
    fetchData();
  }, []);

  const {
    varietyNameEnglish,
    grade,
    target,
    todo,
    qty,
    varietyId,
    collectionOfficerId,
    varietyNameSinhala,
    varietyNameTamil,
    officerId
  } = route.params;
  console.log("managers target edit details", route.params);

  console.log("officers edit details", route.params);
  const getvarietyName = () => {
    switch (selectedLanguage) {
      case "si":
        return route.params.varietyNameSinhala;
      case "ta":
        return route.params.varietyNameTamil;
      default:
        return route.params.varietyNameEnglish;
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center bg-[#313131] p-6 rounded-b-lg">
        <TouchableOpacity onPress={() => navigation.goBack()}
          className="bg-[#FFFFFF1A] rounded-full p-2 justify-center w-10"
          >
         <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>
      
         <Text className="flex-1 text-center text-xl font-semibold text-white mr-[6%]">
          {getvarietyName()}
        </Text>
      </View>

      {/* Content */}
      <View className="mt-6 space-y-6 p-8">
        {/* Total Target */}
        <View>
          <Text className="text-[#475A6A] font-medium">
            {t("EditTargetManager.TotalTarget")}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-md px-3 py-2 mt-2 text-gray-800"
            value={qty.toString()}
            editable={false}
          />
        </View>

        {/* My Target */}
        <View>
          <Text className="text-gray-600 font-medium">
            {t("EditTargetManager.Assigned Target")}
          </Text>
          <View className="flex-row items-center mt-2 border border-gray-300 rounded-md px-3 py-2">
            <Text className="flex-1 text-gray-800">
              {" "}
              {target ? target.toString() : "0"}{" "}
            </Text>
            <TouchableOpacity onPress={() => setIsEditing((prev) => !prev)}>
              <Ionicons
                name={isEditing ? "pencil" : "pencil"}
                size={20}
                color={isEditing ? "#F4F4F4" : "black"}
              />
            </TouchableOpacity>
          </View>

          {/* Buttons in Edit Mode */}
          {isEditing && (
            <View className="flex-row justify-center space-x-4 mt-4 p-5">
              <TouchableOpacity
                className="flex-1 bg-[#FF0700] px-6 py-2 rounded-full items-center"
                onPress={() =>
                  navigation.navigate("PassTargetBetweenOfficers" as any, {
                    varietyNameEnglish,
                    grade,
                    target,
                    todo,
                    qty,
                    varietyId,
                    collectionOfficerId,
                    varietyNameSinhala,
                    varietyNameTamil,
                    officerId
                  })
                } // Save and exit edit mode
              >
                <Text className="text-white font-medium"
                                                                     style={[
  i18n.language === "si"
    ? { fontSize: 13 }
    : i18n.language === "ta"
    ? { fontSize: 12 }
    : { fontSize: 14 }
]}
                >
                  {t("EditTargetManager.Pass")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#980775] px-6 py-2 rounded-full items-center"
                onPress={() =>
                  navigation.navigate("RecieveTargetBetweenOfficers" as any, {
                    varietyNameEnglish,
                    grade,
                    target,
                    todo,
                    qty,
                    varietyId,
                    collectionOfficerId,
                    varietyNameSinhala,
                    varietyNameTamil,
                    officerId
                  })
                } // Save and exit edit mode
              >
                <Text className="text-white font-medium"
                                                                     style={[
  i18n.language === "si"
    ? { fontSize: 13 }
    : i18n.language === "ta"
    ? { fontSize: 12 }
    : { fontSize: 14 }
]}
                >
                  {t("EditTargetManager.Receive")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* To Do Amount */}
        <View>
          <Text className="text-gray-600 font-medium">
            {t("EditTargetManager.Amount")}
          </Text>
          <TextInput
            className="border border-gray-300 rounded-md px-3 py-2 mt-2 text-gray-800"
            value={todo.toString()}
            editable={false}
          />
        </View>
      </View>
    </View>
  );
};

export default EditTargetScreen;
