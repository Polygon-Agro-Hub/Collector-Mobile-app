import React, { useState, useEffect } from "react";
import { View, Alert, Text, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
interface CameraComponentProps {
  onImagePicked: (base64Image: string | null, grade: "A" | "B" | "C") => void;
  grade: "A" | "B" | "C";
  resetImage?: boolean;
  disabled?: boolean;
}

const CameraComponent: React.FC<CameraComponentProps> = ({
  onImagePicked,
  grade,
  resetImage = false,
  disabled = true,
}) => {
  const [image, setImage] = useState<any>(null);

  // Watch for resetImage prop changes to clear the image
  useEffect(() => {
    if (resetImage || disabled) {
      setImage(null);
    }
  }, [resetImage, disabled]);

  // Compress and resize image to reduce payload size
  const processImage = async (uri: string): Promise<string | null> => {
    try {
      // Use ImageManipulator to resize and compress the image
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], 
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
      // Process the image to reduce size
      const base64Image = await processImage(result.assets[0].uri);

      if (base64Image) {
        setImage({
          ...result,
          assets: [{ ...result.assets[0], base64: base64Image }],
        });
        onImagePicked(base64Image, grade);
      }
    } else {
      Alert.alert("No image captured", "Please capture an image.");
    }
  };
  const backgroundColor = image ? "#980775" : disabled ? "gray" : "black";

  return (
    <View>
      <TouchableOpacity
        onPress={handleCaptureImage}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: backgroundColor,
          padding: 10,
          borderRadius: 5,
          marginTop: 15,
          marginLeft: 10,
          marginRight: 10,
        }}
      >
        <Text style={{ color: "white" }}>{grade}</Text>
        <Ionicons
          name={image ? "reload" : "camera"}
          size={20}
          color="white"
          style={{ marginRight: 5, marginLeft: 10 }}
        />
      </TouchableOpacity>
    </View>
  );
};

export default CameraComponent;
