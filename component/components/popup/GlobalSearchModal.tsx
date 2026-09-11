import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

interface GlobalSearchModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: Array<{ label: string; value: string;[key: string]: any }>;
  selectedItems: string[];
  onSelect: (items: string[]) => void;
  searchPlaceholder?: string;
  doneButtonText?: string;
  noResultsText?: string;
  multiSelect?: boolean;
  renderItem?: (item: any, isSelected: boolean) => React.ReactNode;
  searchKeys?: string[];
  showSearch?: boolean;
  isLoading?: boolean;
}

const DEFAULT_SEARCH_KEYS = ["label"];
const DEFAULT_SELECTED_ITEMS: string[] = [];

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  visible,
  onClose,
  title,
  data,
  selectedItems = DEFAULT_SELECTED_ITEMS,
  onSelect,
  searchPlaceholder,
  doneButtonText,
  noResultsText,
  multiSelect = false,
  renderItem,
  searchKeys = DEFAULT_SEARCH_KEYS,
  showSearch = true,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const effectiveSearchPlaceholder =
    searchPlaceholder || t("GlobalSearchModal.Search", "Search...");
  const effectiveDoneText =
    doneButtonText || t("GlobalSearchModal.Done", "Done");
  const effectiveNoResultsText =
    noResultsText || t("GlobalSearchModal.No items found", "No items found");

  const [searchValue, setSearchValue] = useState("");
  const [filteredData, setFilteredData] = useState(data);
  const [selectedValues, setSelectedValues] = useState<string[]>(selectedItems);

  useEffect(() => {
    setSelectedValues(selectedItems);
    if (visible) {
      setSearchValue("");
    }

  }, [visible]);


  useEffect(() => {
    if (!showSearch || !searchValue.trim()) {
      setFilteredData(data);
      return;
    }

    const searchTerm = searchValue.toLowerCase();
    const filtered = data.filter((item) => {
      return searchKeys.some((key) => {
        const value = item[key];
        if (typeof value === "string") {
          return value.toLowerCase().includes(searchTerm);
        }
        return false;
      });
    });
    setFilteredData(filtered);
  }, [searchValue, data, searchKeys, showSearch]);


  useEffect(() => {
    if (!visible) return;

    const { BackHandler } = require("react-native");
    const handleBackPress = () => {
      onClose();
      return true;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress,
    );

    return () => subscription.remove();
  }, [visible, onClose]);

  const handleItemPress = (value: string) => {
    let newSelectedValues: string[];

    if (multiSelect) {
      if (selectedValues.includes(value)) {
        newSelectedValues = selectedValues.filter((v) => v !== value);
      } else {
        newSelectedValues = [...selectedValues, value];
      }
    } else {
      newSelectedValues = [value];
    }

    setSelectedValues(newSelectedValues);

    if (!multiSelect) {
      onSelect(newSelectedValues);
      onClose();
    }
  };

  const handleDone = () => {
    onSelect(selectedValues);
    onClose();
  };

  const clearSearch = () => {
    setSearchValue("");
  };

  const renderDefaultItem = (
    item: any,
    isSelected: boolean,
    isLast: boolean,
  ) => (
    <TouchableOpacity
      className={`px-4 py-3 flex-row items-center justify-between ${!isLast ? "border-b border-gray-200" : ""
        }`}
      onPress={() => handleItemPress(item.value)}
    >
      <Text className="text-base text-gray-800">{item.label}</Text>
      {isSelected && <MaterialIcons name="check" size={20} color="#21202B" />}
    </TouchableOpacity>
  );

  const renderSearchInput = () => (
    <View className="px-4 py-2 border-b border-gray-200">
      <View
        className="bg-gray-100 rounded-3xl px-3 flex-row items-center"
        style={{ height: 50 }}
      >
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          placeholder={effectiveSearchPlaceholder}
          value={searchValue}
          onChangeText={setSearchValue}
          placeholderTextColor="#7F7F7F"
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            marginLeft: 8,
            fontSize: 16,
            height: 50,
            paddingVertical: 0,
            includeFontPadding: false,
          }}
        />
        {searchValue ? (
          <TouchableOpacity onPress={clearSearch}>
            <MaterialIcons name="close" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="px-4 py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#6839CF" />
          <Text className="text-sm mt-3 text-[#6839CF]">
            {t("GlobalSearchModal.Loading")}
          </Text>
        </View>
      );
    }

    if (filteredData.length === 0) {
      return (
        <View className="px-4 py-8 items-center">
          <Text className="text-gray-500 text-base">{effectiveNoResultsText}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.value}
        renderItem={({ item, index }) => {
          const isSelected = selectedValues.includes(item.value);
          const isLast = index === filteredData.length - 1;

          if (renderItem) {
            return renderItem(item, isSelected) as React.ReactElement | null;
          }

          return renderDefaultItem(item, isSelected, isLast);
        }}
        showsVerticalScrollIndicator={false}
        className="max-h-64"
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="bg-white rounded-2xl w-11/12 max-h-3/4">
          {/* Header */}
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <View>
              <Text className="text-lg font-semibold">{title}</Text>
              {multiSelect && selectedValues.length > 0 && (
                <Text className="text-sm text-gray-500">
                  {t("GlobalSearchModal.SelectedCount", { count: selectedValues.length })}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search Bar - Conditional Rendering */}
          {showSearch && renderSearchInput()}

          {/* List or Loading State */}
          {renderContent()}

          {/* Done Button (only for multi-select) */}
          {multiSelect && (
            <View className="px-4 py-3 border-t border-gray-200">
              <TouchableOpacity
                className="bg-[#21202B] rounded-xl py-3 items-center"
                onPress={handleDone}
              >
                <Text className="text-white font-semibold text-base">
                  {effectiveDoneText}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default GlobalSearchModal;