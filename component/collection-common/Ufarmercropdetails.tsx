import { View, Text, TouchableOpacity, Image } from "react-native";
import React, { useState, useEffect } from "react";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/types";
import { ScrollView, TextInput } from "react-native-gesture-handler";
import * as ImagePicker from "react-native-image-picker";
import { useTranslation } from "react-i18next";
import { MaterialIcons } from "@expo/vector-icons";
import CustomHeader from "../navigations/CustomHeader";
import GlobalSearchModal from "../commons/GlobalSearchModal";

type UfarmercropdetailsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Ufarmercropdetails"
>;

interface UfarmercropdetailsProps {
  navigation: UfarmercropdetailsNavigationProp;
}

const Ufarmercropdetails: React.FC<UfarmercropdetailsProps> = ({
  navigation,
}) => {
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [total, setTotal] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedNav, setSelectedNav] = useState<string | null>(null);

  const [cropValue, setCropValue] = useState<string | null>(null);
  const [cropItems] = useState([
    { label: "Carrots", value: "carrots" },
    { label: "Potatoes", value: "potatoes" },
    { label: "Tomatoes", value: "tomatoes" },
  ]);
  const [cropModalVisible, setCropModalVisible] = useState(false);

  const [qualityValue, setQualityValue] = useState<string | null>(null);
  const [qualityItems] = useState([
    { label: "High", value: "high" },
    { label: "Medium", value: "medium" },
    { label: "Low", value: "low" },
  ]);
  const [qualityModalVisible, setQualityModalVisible] = useState(false);

  const { t } = useTranslation();
  const borderRadiusValue = 10;

  useEffect(() => {
    calculateTotal();
  }, [quantity, unitPrice]);

  const calculateTotal = () => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const totalValue = (qty * price).toFixed(2);
    setTotal(totalValue);
  };

  const handleChooseImage = () => {
    ImagePicker.launchImageLibrary(
      {
        mediaType: "photo",
        maxWidth: 300,
        maxHeight: 300,
        quality: 1,
      },
      (response) => {
        if (response.didCancel) {
          console.log("User cancelled image picker");
        } else if (response.errorCode) {
          console.log("ImagePicker Error: ", response.errorMessage);
        } else if (response.assets && response.assets.length > 0) {
          const selectedImageUri = response.assets[0].uri;
          if (selectedImageUri) {
            setImageUri(selectedImageUri);
          } else {
            console.log("Selected image URI is undefined");
          }
        }
      },
    );
  };

  const selectedCropLabel =
    cropItems.find((o) => o.value === cropValue)?.label || null;
  const selectedQualityLabel =
    qualityItems.find((o) => o.value === qualityValue)?.label || null;

  return (
    <View className="flex-1 bg-white">
      <CustomHeader
        title={t("Ufarmercropdetails.FillCropDetails")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <View className="ml-[10%] mr-[10%] flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          {/* Crop Name */}
          <Text className="text-base pb-[2%] font-medium">
            {t("Ufarmercropdetails.CropName")}
          </Text>
          <TouchableOpacity
            onPress={() => setCropModalVisible(true)}
            style={{
              borderColor: "gray",
              borderWidth: 1,
              borderRadius: borderRadiusValue,
              marginBottom: 16,
              backgroundColor: "white",
              height: 50,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: selectedCropLabel ? "#000" : "#2E2E2E",
                fontSize: 14,
              }}
            >
              {selectedCropLabel || "Select a crop"}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={22}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* Quality */}
          <Text className="text-base pb-[2%] font-medium">
            {t("Ufarmercropdetails.Quality")}
          </Text>
          <TouchableOpacity
            onPress={() => setQualityModalVisible(true)}
            style={{
              borderColor: "gray",
              borderWidth: 1,
              borderRadius: borderRadiusValue,
              marginBottom: 16,
              backgroundColor: "white",
              height: 50,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
            }}
          >
            <Text
              style={{
                color: selectedQualityLabel ? "#000" : "#2E2E2E",
                fontSize: 14,
              }}
            >
              {selectedQualityLabel || "Select quality"}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={22}
              color="#9CA3AF"
            />
          </TouchableOpacity>

          {/* Quantity */}
          <Text className="text-base pb-[2%] font-medium">
            {t("Ufarmercropdetails.Quantity")}
          </Text>
          <View
            style={{
              borderColor: "gray",
              borderWidth: 1,
              borderRadius: borderRadiusValue,
              marginBottom: 16,
              backgroundColor: "white",
            }}
          >
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setQuantity}
              value={quantity}
              keyboardType="numeric"
              style={{ borderRadius: borderRadiusValue }}
            />
          </View>

          {/* Unit Price */}
          <Text className="text-base pb-[2%] font-medium">
            {t("Ufarmercropdetails.UnitPrice")}
          </Text>
          <View
            style={{
              borderColor: "gray",
              borderWidth: 1,
              borderRadius: borderRadiusValue,
              marginBottom: 16,
              backgroundColor: "white",
            }}
          >
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              onChangeText={setUnitPrice}
              value={unitPrice}
              keyboardType="numeric"
              style={{ borderRadius: borderRadiusValue }}
            />
          </View>

          {/* Upload Image */}
          <Text className="text-base pb-[2%] font-medium">
            {t("Ufarmercropdetails.UploadImage")}
          </Text>
          <TouchableOpacity
            className="flex-row items-center border w-full h-[40px] mb-5 bg-black px-3 justify-center"
            style={{ borderRadius: borderRadiusValue }}
            onPress={handleChooseImage}
          >
            <Text className="text-base pl-2 text-white">
              {t("Ufarmercropdetails.ChooseImage")}
            </Text>
          </TouchableOpacity>

          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: 100,
                height: 100,
                borderRadius: borderRadiusValue,
                marginBottom: 16,
              }}
              resizeMode="contain"
            />
          )}

          {/* Total */}
          <Text className="text-base pb-[2%] font-medium">
            {t("Ufarmercropdetails.Total")}
          </Text>
          <View
            style={{
              borderColor: "gray",
              borderWidth: 1,
              borderRadius: borderRadiusValue,
              marginBottom: 16,
              backgroundColor: "white",
            }}
          >
            <TextInput
              className="flex-1 h-[40px] text-base pl-2"
              value={total}
              editable={false}
              style={{ borderRadius: borderRadiusValue }}
            />
          </View>

          <TouchableOpacity
            className="bg-[#2AAD7A] w-full h-[50px] rounded-3xl shadow-2xl items-center justify-center"
            onPress={() => navigation.navigate("Registeredfarmer")}
          >
            <Text className="text-center text-xl font-light text-white">
              {t("Ufarmercropdetails.Next")}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Navbar */}
        <View className="flex-row justify-around items-center py-4 border-t border-gray-300 h-16">
          <TouchableOpacity
            onPress={() => setSelectedNav("first")}
            style={{
              transform: [{ scale: selectedNav === "first" ? 1.5 : 1 }],
            }}
          >
            <Image
              source={require("../../assets/images/collection-common/first-image.webp")}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedNav("second")}
            style={{
              transform: [{ scale: selectedNav === "second" ? 1.5 : 1 }],
            }}
          >
            <Image
              source={require("../../assets/images/collection-common/second-image.webp")}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedNav("third")}
            style={{
              transform: [{ scale: selectedNav === "third" ? 1.5 : 1 }],
            }}
          >
            <Image
              source={require("../../assets/images/collection-common/third-image.webp")}
              style={{ width: 35, height: 35 }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Crop Modal */}
      <GlobalSearchModal
        visible={cropModalVisible}
        onClose={() => setCropModalVisible(false)}
        title={t("Ufarmercropdetails.CropName")}
        data={cropItems}
        selectedItems={cropValue ? [cropValue] : []}
        onSelect={(items) => setCropValue(items[0] ?? null)}
        searchPlaceholder="Search crop..."
        multiSelect={false}
      />

      {/* Quality Modal */}
      <GlobalSearchModal
        visible={qualityModalVisible}
        onClose={() => setQualityModalVisible(false)}
        title={t("Ufarmercropdetails.Quality")}
        data={qualityItems}
        selectedItems={qualityValue ? [qualityValue] : []}
        onSelect={(items) => setQualityValue(items[0] ?? null)}
        searchPlaceholder="Search quality..."
        multiSelect={false}
        showSearch={false}
      />
    </View>
  );
};

export default Ufarmercropdetails;
