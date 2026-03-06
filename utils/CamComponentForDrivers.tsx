import React, { useState, useEffect } from "react";
import { View, Alert, Text, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface CameraComponentProps {
  onImagePicked: (base64Image: string | null, imageType: string) => void;
  imageType: string;
  resetImage?: boolean;
  disabled?: boolean;
}

const CameraComponent: React.FC<CameraComponentProps> = ({
  onImagePicked,
  imageType,
  resetImage = false,
  disabled = false,
}) => {
  const [image, setImage] = useState<any>(null);
  const { t } = useTranslation();

  // Watch for resetImage prop changes to clear the image
  useEffect(() => {
    if (resetImage) {
      setImage(null);
    }
  }, [resetImage]);

  // Compress and resize image to reduce payload size
  const processImage = async (uri: string): Promise<string | null> => {
    try {
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to max width of 800px
        {
          compress: 0.4,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      return processedImage.base64 || null;
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert("Error", "Failed to process image");
      return null;
    }
  };

  // Handle capturing image from camera
  const handleCaptureImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const base64Image = await processImage(result.assets[0].uri);

      if (base64Image) {
        setImage({
          ...result,
          assets: [{ ...result.assets[0], base64: base64Image }],
        });
        onImagePicked(base64Image, imageType);
      }
    } else {
      Alert.alert("No image captured", "Please capture an image.");
    }
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        onPress={handleCaptureImage}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: image ? "#2AAD7A" : disabled ? "gray" : "black",
          padding: 10,
          borderRadius: 5,
          marginTop: 15,
          marginLeft: 15,
          marginRight: 10,
          width: 130,
        }}
      >
        <Text style={{ color: "white", marginRight: 5, marginLeft: 20 }}>
          {t(`VehicleDetails.${imageType}`)}
        </Text>
        <Ionicons
          name={image ? "reload" : "camera"}
          size={20}
          color="white"
          style={{ marginLeft: 5 }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default CameraComponent;
