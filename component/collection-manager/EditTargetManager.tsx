import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { ScrollView } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n/i18n";

type EditTargetManagerNavigationProps = StackNavigationProp<
  RootStackParamList,
  "EditTargetManager"
>;

interface EditTargetManagerProps {
  navigation: EditTargetManagerNavigationProps;
  route: {
    params: {
      varietyId: number;
      varietyNameEnglish: string;
      varietyNameSinhala: string; // ✅ Added this
      varietyNameTamil: string; // ✅ Added this
      grade: string;
      target: number;
      todo: string;
      dailyTarget: number;
    };
  };
}

const EditTargetManager: React.FC<EditTargetManagerProps> = ({
  navigation,
  route,
}) => {
  const [myTarget, setMyTarget] = useState("100kg");
  const [isEditing, setIsEditing] = useState(false);
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
    dailyTarget,
    varietyId,
    varietyNameSinhala,
    varietyNameTamil,
  } = route.params;

//  console.log("officers edit details", route.params);
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
    <ScrollView className="bg-white">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center bg-[#313131] p-6 rounded-b-lg">
         
          <TouchableOpacity
            onPress={() => {
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "Main",
                    params: {
                      screen: "DailyTarget",
                      params: {
                        varietyId,
                        varietyNameEnglish,
                        grade,
                        target,
                        todo,
                        dailyTarget,
                        varietyNameSinhala,
                        varietyNameTamil,
                      },
                    },
                  },
                ],
              });
            }}
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
              className="border border-[#F4F4F4] bg-[#F4F4F4] rounded-full px-3 py-2 mt-2 text-gray-800"
              value={dailyTarget ? dailyTarget.toString() : "0"}
              editable={false}
            />
          </View>

          {/* My Target */}
          <View>
            <Text className="text-[#475A6A] font-medium">
              {t("EditTargetManager.My Target")}
            </Text>
            <View className="flex-row items-center mt-2 border border-[#F4F4F4] bg-[#F4F4F4] rounded-full px-3 py-2">
             
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
                    navigation.navigate("Main", {
                      screen: "PassTargetScreen",
                      params: {
                        varietyId,
                        varietyNameEnglish,
                        grade,
                        target,
                        todo,
                        dailyTarget,
                        varietyNameSinhala,
                        varietyNameTamil,
                      },
                    })
                  }
                 
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
                    navigation.navigate("Main", {
                      screen: "RecieveTargetScreen",
                      params: {
                        varietyId,
                        varietyNameEnglish,
                        grade,
                        target,
                        todo,
                        dailyTarget,
                        varietyNameSinhala,
                        varietyNameTamil,
                      },
                    })
                  }

                
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
              className="border border-[#F4F4F4] bg-[#F4F4F4] rounded-full px-3 py-2 mt-2 text-gray-800"
              value={todo ? todo.toString() : "0"}
              editable={false}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default EditTargetManager;
