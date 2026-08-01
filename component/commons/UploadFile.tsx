import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from "react-native";
import { FontAwesome5, Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export interface UploadFileItem {
  uri: string;
  name: string;
  sizeMB?: string;
  size?: string;
  type?: "image" | "pdf";
  base64?: string;
}

interface UploadFileProps {
  file: UploadFileItem | null;
  onFileChange: (file: UploadFileItem | null) => void;
  maxSizeMB?: number;
}

export default function UploadFile({
  file,
  onFileChange,
  maxSizeMB = 5,
}: UploadFileProps) {
  const [previewVisible, setPreviewVisible] = useState(false);

  const handleUploadPress = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access media library is required to upload invoice photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileSizeMB = asset.fileSize
          ? (asset.fileSize / (1024 * 1024)).toFixed(1) + " MB"
          : "1.2 MB";

        onFileChange({
          uri: asset.uri,
          base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
          name:
            asset.fileName ||
            "Transfer_Slip_" + Date.now().toString().slice(-6) + ".png",
          sizeMB: fileSizeMB,
          type: "image",
        });
      }
    } catch (err) {
      console.error("Error picking file:", err);
      Alert.alert("Upload Error", "Failed to select file. Please try again.");
    }
  };

  const removeFile = () => {
    onFileChange(null);
  };

  return (
    <>
      {/* Upload Area */}
      {!file ? (
        <TouchableOpacity
          onPress={handleUploadPress}
          activeOpacity={0.7}
          className="mt-6 items-center justify-center rounded-2xl border border-dashed border-[#1861F4] bg-white py-10"
        >
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EAF1FF]">
            <FontAwesome5 name="cloud-upload-alt" size={26} color="#3B82F6" />
          </View>
          <Text className="mt-3 text-base font-semibold text-gray-900">
            Tap to Upload
          </Text>
          <Text className="mt-1 text-xs text-gray-400">
            JPG, PNG, PDF up to {maxSizeMB}MB
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="mt-6 rounded-2xl border border-dashed border-[#1861F4] bg-white p-4">
          {/* File Uploaded badge */}
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#980775" />
            <Text className="ml-1.5 text-sm font-medium text-[#980775]">
              File Uploaded
            </Text>
          </View>

          {(file.type || "image") === "image" ? (
            <>
              {/* Image thumbnail */}
              <View className="mt-3 items-center rounded-xl border border-gray-100 bg-white p-2">
                <Image
                  source={{ uri: file.uri }}
                  className="h-40 w-full rounded-lg"
                  resizeMode="contain"
                />
              </View>

              {/* File row */}
              <View className="mt-3 flex-row items-center rounded-xl bg-[#F9F9F9] border border-[#DEDEDE] px-3 py-2.5">
                <View className="h-9 w-9 items-center justify-center rounded-lg bg-pink-50">
                  <Ionicons name="image" size={18} color="#EC4899" />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className="text-sm font-medium text-gray-900"
                    numberOfLines={1}
                  >
                    {file.name}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {file.sizeMB || file.size || "1.2 MB"}
                  </Text>
                </View>
                <TouchableOpacity onPress={removeFile} hitSlop={8}>
                  <Ionicons name="close" size={20} color="#111827" />
                </TouchableOpacity>
              </View>

              {/* Preview button */}
              <TouchableOpacity
                onPress={() => setPreviewVisible(true)}
                activeOpacity={0.7}
                className="mt-3 self-center flex-row items-center justify-center rounded-md border border-black px-10 py-2.5"
              >
                <Ionicons name="eye" size={16} color="#000000" />
                <Text className="ml-2 text-sm font-semibold text-black">
                  Preview Full Image
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* PDF card */}
              <View className="mt-3 items-center rounded-xl border border-gray-100 bg-white px-4 py-6">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-red-500">
                  <Ionicons name="document-text" size={22} color="#fff" />
                </View>
                <Text
                  className="mt-3 text-sm font-medium text-gray-900"
                  numberOfLines={1}
                >
                  {file.name}
                </Text>
                <Text className="mt-0.5 text-xs text-gray-400">
                  {file.sizeMB || file.size || "1.2 MB"}
                </Text>
                <TouchableOpacity
                  onPress={removeFile}
                  hitSlop={8}
                  className="absolute right-2 top-2"
                >
                  <Ionicons name="close" size={18} color="#111827" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setPreviewVisible(true)}
                activeOpacity={0.7}
                className="mt-3 self-center flex-row items-center justify-center rounded-md border border-black px-10 py-2.5"
              >
                <Ionicons name="eye" size={16} color="#000000" />
                <Text className="ml-2 text-sm font-semibold text-black">
                  Preview PDF
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Full Screen Image Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View className="flex-1 bg-black/90 justify-center items-center px-4">
          <TouchableOpacity
            onPress={() => setPreviewVisible(false)}
            className="absolute top-12 right-6 p-2 rounded-full bg-white/20 z-10"
          >
            <Feather name="x" size={24} color="white" />
          </TouchableOpacity>

          {file && file.type === "image" && (
            <Image
              source={{ uri: file.uri }}
              className="w-full h-[70%]"
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </>
  );
}
