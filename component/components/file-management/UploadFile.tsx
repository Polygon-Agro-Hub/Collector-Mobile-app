import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import { FontAwesome5, Ionicons, Feather, FontAwesome6 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";
import { useTranslation } from "react-i18next";
import PdfViewer from "./PdfViewer";


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
  const { t } = useTranslation();
  const [previewVisible, setPreviewVisible] = useState(false);
  const MAX_FILE_SIZE_BYTES = maxSizeMB * 1024 * 1024;

  const showFileTooLargeAlert = () => {
    Alert.alert(
      t("UploadFile.File Too Large", "File Too Large"),
      t("UploadFile.File is too large", {
        maxSizeMB,
        defaultValue: `File is too large. Please upload an image or file smaller than ${maxSizeMB} MB.`,
      }),
    );
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE_BYTES) {
          showFileTooLargeAlert();
          return;
        }

        const fileSizeMB = asset.fileSize
          ? (asset.fileSize / (1024 * 1024)).toFixed(1) + " MB"
          : "1.2 MB";

        let base64Data = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : undefined;

        if (!base64Data && asset.uri) {
          try {
            const raw = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            base64Data = `data:image/jpeg;base64,${raw}`;
          } catch (e) {
            console.warn("Could not read image as base64:", e);
          }
        }

        onFileChange({
          uri: asset.uri,
          base64: base64Data,
          name:
            asset.fileName ||
            "Transfer_Slip_" + Date.now().toString().slice(-6) + ".png",
          sizeMB: fileSizeMB,
          type: "image",
        });
      }
    } catch (err) {
      console.error("Error picking image:", err);
      Alert.alert(
        t("UploadFile.Upload Error", "Upload Error"),
        t("UploadFile.Failed to select file. Please try again.", "Failed to select file. Please try again.")
      );
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const isPdf =
        asset.mimeType === "application/pdf" || asset.name?.toLowerCase().endsWith(".pdf");

      if (asset.size && asset.size > MAX_FILE_SIZE_BYTES) {
        showFileTooLargeAlert();
        return;
      }

      const sizeMB = asset.size
        ? (asset.size / (1024 * 1024)).toFixed(1) + " MB"
        : "1.2 MB";

      let base64Data: string | undefined;
      try {
        const rawBase64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mime = isPdf ? "application/pdf" : (asset.mimeType || "image/jpeg");
        base64Data = `data:${mime};base64,${rawBase64}`;
      } catch (readErr) {
        console.warn("Could not read document as base64:", readErr);
      }

      onFileChange({
        uri: asset.uri,
        base64: base64Data,
        name:
          asset.name ||
          (isPdf
            ? "Transfer_Slip_" + Date.now().toString().slice(-6) + ".pdf"
            : "Transfer_Slip_" + Date.now().toString().slice(-6) + ".png"),
        sizeMB,
        type: isPdf ? "pdf" : "image",
      });
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert(
        t("UploadFile.Upload Error", "Upload Error"),
        t("UploadFile.Failed to select file. Please try again.", "Failed to select file. Please try again.")
      );
    }
  };

  const handleUploadPress = () => {
    Alert.alert(
      t("UploadFile.Select Upload Source", "Select Upload Source"),
      t("UploadFile.Choose how you want to upload your file", "Choose how you want to upload your file"),
      [
        { text: t("UploadFile.Photo Library", "Photo Library"), onPress: pickImage },
        { text: t("UploadFile.Browse Files / PDF", "Browse Files / PDF"), onPress: pickDocument },
        { text: t("UploadFile.Cancel", "Cancel"), style: "cancel" },
      ],
    );
  };

  const removeFile = () => {
    onFileChange(null);
  };

  const openPdfExternally = async () => {
    if (!file || file.type !== "pdf") return;
    try {
      let targetUri = file.uri;
      if (targetUri.startsWith("http://") || targetUri.startsWith("https://")) {
        const fileFilename = `pdf_share_${Date.now()}.pdf`;
        const destination = `${FileSystem.cacheDirectory}${fileFilename}`;
        const downloadResult = await FileSystem.downloadAsync(
          targetUri,
          destination,
        );
        targetUri = downloadResult.uri;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare && targetUri.startsWith("file://")) {
        await Sharing.shareAsync(targetUri, {
          mimeType: "application/pdf",
          dialogTitle: file.name,
        });
      } else {
        await Linking.openURL(file.uri);
      }
    } catch (error) {
      console.log("Error opening PDF externally:", error);
      Alert.alert(
        t("UploadFile.Couldn't open PDF", "Couldn't open PDF"),
        t(
          "UploadFile.Please make sure you have a PDF viewer app installed.",
          "Please make sure you have a PDF viewer app installed."
        ),
      );
    }
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
            {t("UploadFile.Tap to Upload", "Tap to Upload")}
          </Text>
          <Text className="mt-1 text-xs text-gray-400">
            {t("UploadFile.JPG, PNG, PDF up to MB", {
              maxSizeMB,
              defaultValue: `JPG, PNG, PDF up to ${maxSizeMB}MB`,
            })}
          </Text>
        </TouchableOpacity>
      ) : (
        <View className="mt-6 mb-8 rounded-2xl border border-dashed border-[#1861F4] bg-white p-4">
          {/* File Uploaded badge */}
          <View className="flex-row items-center">
            <Ionicons name="checkmark-circle" size={16} color="#0CB353" />
            <Text className="ml-1.5 text-sm font-medium text-[#0CB353]">
              {t("UploadFile.File Uploaded", "File Uploaded")}
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
                className="mt-3 self-center flex-row items-center justify-center rounded-md border border-[#0850F0] px-4 py-2"
              >
                <FontAwesome6 name="eye" size={16} color="#0850F0" />
                <Text className="ml-2 text-sm font-semibold text-[#0850F0]">
                  {t("UploadFile.Preview Full Image", "Preview Full Image")}
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
                className="mt-3 self-center flex-row items-center justify-center rounded-md border border-[#0850F0] px-10 py-2.5"
              >
                <FontAwesome6 name="eye" size={16} color="#0850F0" />
                <Text className="ml-2 text-sm font-semibold text-[#0850F0]">
                  {t("UploadFile.Preview PDF", "Preview PDF")}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Full Screen Preview Modal */}
      <Modal
        visible={previewVisible}
        transparent={(file?.type || "image") === "image"}
        animationType={(file?.type || "image") === "image" ? "fade" : "slide"}
        onRequestClose={() => setPreviewVisible(false)}
      >
        {(file?.type || "image") === "image" ? (
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
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
            <StatusBar barStyle="light-content" />
            {/* PDF Header */}
            <View
              className="flex-row items-center justify-between bg-black px-4 pb-3"
              style={{
                paddingTop:
                  Platform.OS === "android"
                    ? (StatusBar.currentHeight ?? 0) + 12
                    : 12,
              }}
            >
              <Text
                className="flex-1 pr-3 text-sm font-medium text-white"
                numberOfLines={1}
              >
                {file?.name}
              </Text>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={openPdfExternally}
                  className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/10"
                  hitSlop={8}
                >
                  <Ionicons name="open-outline" size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPreviewVisible(false)}
                  className="h-8 w-8 items-center justify-center rounded-full bg-white/10"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {file && file.type === "pdf" && <PdfViewer uri={file.uri} />}
          </SafeAreaView>
        )}
      </Modal>
    </>
  );
}
