import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { SelectList } from "react-native-dropdown-select-list";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { environment } from "@/environment/environment";
import { useTranslation } from "react-i18next";
import NetInfo from "@react-native-community/netinfo";



interface PassTargetProps {
  navigation: any;
  route: {
    params: {
      collectionOfficerId?: number;
      officerId: string;
      selectedItems: number[]; 
      invoiceNumbers: string[]; 
      processOrderId: string[];
    };
  };
}

interface TargetItem {
  id: number;
  invoiceNumber: string;
  status: "Pending" | "Opened" | "Completed";
  processOrderId: number;
  distributedTargetItemId: number;
}

interface Officer {
  id: number;
  empId: string;
  firstNameEnglish: string;
  firstNameSinhala: string;
  firstNameTamil: string;
  lastNameEnglish: string;
  lastNameSinhala: string;
  lastNameTamil: string;
  jobRole: string;
}

const PassTarget: React.FC<PassTargetProps> = ({ navigation, route }) => {
  const { 
    selectedItems: passedSelectedItems = [], 
    invoiceNumbers = [], 
    processOrderId = [],
    officerId // Add this to get the current officer ID
  } = route.params;
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [targetItems, setTargetItems] = useState<TargetItem[]>([]);
  const [officers, setOfficers] = useState<{key: string, value: string}[]>([]);
  const [loadingOfficers, setLoadingOfficers] = useState<boolean>(false);
  const { t, i18n } = useTranslation();

  console.log("Passed selectedItems:", passedSelectedItems);
  console.log("Passed invoiceNumbers:", invoiceNumbers);

 
  const getOfficerName = useCallback((officer: Officer) => {
    const currentLanguage = i18n.language;
    
    let firstName = "";
    let lastName = "";
    
    switch (currentLanguage) {
      case 'si':
      case 'sinhala':
        firstName = officer.firstNameSinhala || officer.firstNameEnglish;
        lastName = officer.lastNameSinhala || officer.lastNameEnglish;
        break;
      case 'ta': 
      case 'tamil':
        firstName = officer.firstNameTamil || officer.firstNameEnglish;
        lastName = officer.lastNameTamil || officer.lastNameEnglish;
        break;
      case 'en': 
      case 'english':
      default:
        firstName = officer.firstNameEnglish;
        lastName = officer.lastNameEnglish;
        break;
    }
    
    return `${firstName} ${lastName} (${officer.empId})`;
  }, [i18n.language]);


  const getStatusColor = (status: string) => {

    const normalizedStatus = status?.toLowerCase();

    if (normalizedStatus === 'completed') {
      return 'bg-[#BBFFC6]';
    }
    if (normalizedStatus === 'opened') {
      return 'bg-[#F8FFA6]';
    }
    if (normalizedStatus === 'pending') {
      return 'bg-[#FF070733]';
    }

    if (normalizedStatus === 'සම්පූර්ණ' || normalizedStatus === 'සම්පූර්ණයි') {
      return 'bg-[#BBFFC6]';
    }
    if (normalizedStatus === 'විවෘත' || normalizedStatus === 'විවෘතයි') {
      return 'bg-[#F8FFA6]';
    }
    if (normalizedStatus === 'අපේක්ෂිත' || normalizedStatus === 'පොරොත්තුවේ') {
      return 'bg-[#FF070733]';
    }
    

    if (normalizedStatus === 'முடிக்கப்பட்டது' || normalizedStatus === 'நிறைவு') {
      return 'bg-[#BBFFC6]';
    }
    if (normalizedStatus === 'திறக்கப்பட்டது' || normalizedStatus === 'திறந்த') {
      return 'bg-[#F8FFA6]';
    }
    if (normalizedStatus === 'நிலுவையில்' || normalizedStatus === 'காத்திருக்கும்') {
      return 'bg-[#FF070733]';
    }
    
    return 'bg-gray-100';
  };

  // Helper function to get status text color
  const getStatusTextColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    
    // English
    if (normalizedStatus === 'completed') {
      return 'text-[#6AD16D]';
    }
    if (normalizedStatus === 'opened') {
      return 'text-[#A8A100]';
    }
    if (normalizedStatus === 'pending') {
      return 'text-[#FF0700]';
    }
    
    // Sinhala translations
    if (normalizedStatus === 'සම්පූර්ණ' || normalizedStatus === 'සම්පූර්ණයි') {
      return 'text-[#6AD16D]';
    }
    if (normalizedStatus === 'විවෘත' || normalizedStatus === 'විවෘතයි') {
      return 'text-[#A8A100]';
    }
    if (normalizedStatus === 'අපේක්ෂිත' || normalizedStatus === 'පොරොත්තුවේ') {
      return 'text-[#D16D6A]';
    }
    
    // Tamil translations
    if (normalizedStatus === 'முடிக்கப்பட்டது' || normalizedStatus === 'நிறைவு') {
      return 'text-[#6AD16D]';
    }
    if (normalizedStatus === 'திறக்கப்பட்டது' || normalizedStatus === 'திறந்த') {
      return 'text-[#A8A100]';
    }
    if (normalizedStatus === 'நிலுவையில்' || normalizedStatus === 'காத்திருக்கும்') {
      return 'text-[#D16D6A]';
    }
    
    return 'text-gray-600';
  };

  // Helper function to get translated status text
  const getStatusText = (status: string) => {
    const normalizedStatus = status?.toLowerCase();
    

    switch (normalizedStatus) {
      case 'completed':
      case 'සම්පූර්ණ':
      case 'සම්පූර්ණයි':
      case 'முடிக்கப்பட்டது':
      case 'நிறைவு':
        return t("Status.Completed");
      case 'opened':
      case 'විවෘත':
      case 'විවෘතයි':
      case 'திறக்கப்பட்டது':
      case 'திறந்த':
        return t("Status.Opened");
      case 'pending':
      case 'අපේක්ෂිත':
      case 'පොරොත්තුවේ':
      case 'நிலுவையில்':
      case 'காத்திருக்கும்':
        return t("Status.Pending");
      default:
        return t("Status.Unknown");
    }
  };

  // Fetch officers from API
  const fetchOfficers = useCallback(async () => {
    setLoadingOfficers(true);
    try {
      const authToken = await AsyncStorage.getItem("token");
      
      const response = await axios.get(
        `${environment.API_BASE_URL}api/distribution-manager/get-all-distributionOfficer`,
        { 
          headers: { 
            Authorization: `Bearer ${authToken}` 
          } 
        }
      );

      if (response.data.success && response.data.data) {
      //  console.log("All officers from API:", response.data.data);
        console.log("Current officerId to filter out:", officerId);
        
      
        const officerDropdownData = response.data.data
          .filter((officer: Officer) => {
       
            console.log(`Comparing officer ID: ${officer.id} (${typeof officer.id}) with current officer: ${officerId} (${typeof officerId})`);
            console.log(`Officer empId: ${officer.empId}`);
            
         
            const isCurrentOfficerById = officer.id?.toString() === officerId?.toString();
            const isCurrentOfficerByEmpId = officer.empId?.toString() === officerId?.toString();
            
            console.log(`isCurrentOfficerById: ${isCurrentOfficerById}, isCurrentOfficerByEmpId: ${isCurrentOfficerByEmpId}`);
          
            return !isCurrentOfficerById && !isCurrentOfficerByEmpId;
          })
          .map((officer: Officer) => ({
            key: officer.id.toString(),
            value: getOfficerName(officer) 
          }));
        
        console.log("Filtered officers for dropdown:", officerDropdownData);
        setOfficers(officerDropdownData);
      } else {
        setError(t("Error.Failed to load officers."));
      }
    } catch (error) {
      console.error("Error fetching officers:", error);
      setError(t("Error.Failed to load officers."));
    } finally {
      setLoadingOfficers(false);
    }
  }, [t, officerId, getOfficerName]);

  // Convert passed selectedItems to display format with correct invoice numbers
  const prepareTargetItems = useCallback(() => {
    if (passedSelectedItems && passedSelectedItems.length > 0) {
      const items: TargetItem[] = passedSelectedItems.map((itemId, index) => ({
        id: index + 1,
        invoiceNumber: invoiceNumbers[index] || `INV${itemId.toString().padStart(6, '0')}`, 
        status: "Pending", 
        processOrderId: itemId,
        distributedTargetItemId: itemId
      }));
      setTargetItems(items);
    }
  }, [passedSelectedItems, invoiceNumbers]);


  useFocusEffect(
    useCallback(() => {
      prepareTargetItems();
      fetchOfficers();
    }, [prepareTargetItems, fetchOfficers])
  );


  useEffect(() => {
    fetchOfficers();

    setSelectedAssignee("");
  }, [i18n.language, fetchOfficers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    prepareTargetItems();
    fetchOfficers();
    setRefreshing(false);
  }, [prepareTargetItems, fetchOfficers]);

  const handleSave = async () => {
    if (!selectedAssignee) {
      setError(t("Error.Please select an assignee."));
      return;
    }

    setLoading(true);
    setError(null); 

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return; 
    }
    
    try {
      const authToken = await AsyncStorage.getItem("token");
      
    
      const saveData = {
        assigneeOfficerId: selectedAssignee, 
        targetItems: passedSelectedItems, 
        invoiceNumbers: invoiceNumbers, 
        processOrderId: processOrderId
      };

     // console.log("Saving data:", saveData); 
     // console.log("API URL:", `${environment.API_BASE_URL}api/distribution-manager/target-pass/${officerId}`);

  
      const response = await axios.post(
        `${environment.API_BASE_URL}api/distribution-manager/target-pass/${officerId}`,
        saveData,
        { 
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );

    //  console.log("API Response:", response.data);

      if (response.data.success) {
       
        navigation.goBack();
      } else {
        setError(response.data.message || t("Error.Failed to save data."));
      }
    } catch (error) {
      console.error("Error saving data:", error);
      
      // Enhanced error handling
      if (axios.isAxiosError(error)) {
        if (error.response) {
    
          console.log("Error response:", error.response.data);
          const errorMessage = error.response.data?.message || 
                              error.response.data?.error || 
                              `Server error: ${error.response.status}`;
          setError(errorMessage);
        } else if (error.request) {
      
          console.log("No response received:", error.request);
          setError(t("Error.Network error. Please check your connection."));
        } else {
       
          console.log("Request setup error:", error.message);
          setError(error.message || t("Error.Failed to save data."));
        }
      } else if (error instanceof Error) {

        console.log("Generic error:", error.message);
        setError(error.message || t("Error.Failed to save data."));
      } else {

        console.log("Unknown error:", error);
        setError(t("Error.Failed to save data."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
   
      <View className="bg-[#282828] px-4 py-6 flex-row justify-center items-center">
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          className="absolute left-4"
        >
          <AntDesign name="left" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">{t("PassTarget.EMP ID")} : {officerId}</Text>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Assignee Selection */}
        <View className="bg-white mx-4 my-2 p-4 rounded-full shadow-sm">
       
         <View className="flex-row items-center mb-3">
          <Text className="text-[#475A6A] font-semibold flex-1">
            {selectedAssignee ? t("PassTarget.Short Stock Assignee") : t("PassTarget.Select Assignee")}
          </Text>
         
        </View>

          {loadingOfficers ? (
            <View className="flex-row items-center justify-center py-4">
              <ActivityIndicator size="small" color="#282828" />
              <Text className="ml-2 text-gray-600">{t("PassTarget.Loading officers")}</Text>
            </View>
          ) : (
            <SelectList
              setSelected={setSelectedAssignee}
              data={officers}
              placeholder={t("PassTargetBetweenOfficers.Select an officer")}
              save="key"
              search={true}
              searchPlaceholder={t("PassTarget.Search officers")}
              boxStyles={{
                borderWidth: 0,
                backgroundColor: "#f3f4f6",
                borderRadius: 25, // Fully rounded
                paddingHorizontal: 16,
                paddingVertical: 14,
                marginVertical: 0,
              }}
              inputStyles={{ 
                color: "#374151",
                fontSize: 16,
              }}
              dropdownStyles={{
                borderWidth: 0,
                backgroundColor: "#f3f4f6",
                borderRadius: 20, // Fully rounded for dropdown
                marginTop: 8,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              dropdownItemStyles={{
                paddingVertical: 12,
                paddingHorizontal: 16,
              }}
              dropdownTextStyles={{
                color: "#374151",
                fontSize: 16,
              }}
            />
          )}
        </View>

        {/* Selected Targets */}
        <View className="bg-white my-2 rounded-lg mb-20">
          <View className="items-center justify-center">
            <Text style={{ fontStyle: 'italic', color: '#2d3748', marginBottom: 12 }}>
              --{t("PassTarget.Selected Targets")}--
            </Text>
          </View>
          
          {/* Table */}
          <View className="border border-gray-300 rounded-md">
            
            {/* Table Rows */}
            {targetItems.map((item: TargetItem) => (
              <View 
                key={item.distributedTargetItemId} 
                className="flex-row border-b border-gray-300 px-[-19]"
              >
                <View className="w-16 items-center justify-center border-r border-gray-300 py-3">
                  <Text className="text-[#606060] font-medium">{String(item.id).padStart(2, '0')}</Text>
                </View>
                <View className="flex-1 items-center justify-center border-r border-gray-300 py-3">
                  <Text className="text-[#000000] font-medium">{item.invoiceNumber}</Text>
                </View>
                <View className="w-36 items-center justify-center py-3">
                  <View 
                    className={`px-5 py-1 rounded-full ${getStatusColor(item.status)}`}
                  >
                    <Text 
                      className={`text-xs font-medium ${getStatusTextColor(item.status)}`}
                    >
                      {getStatusText(item.status)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity 
        onPress={handleSave}
        disabled={loading || !selectedAssignee || loadingOfficers}
        className={`absolute bottom-10 left-4 right-4 py-3 rounded-full items-center shadow-md mr-6 ml-6 ${
          loading || !selectedAssignee || loadingOfficers ? 'bg-white' : 'bg-[#980775]'
        }`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-bold">
             {t("PassTarget.Save")}
          </Text>
        )}
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <View className="absolute top-20 left-4 right-4 bg-red-100 border border-red-400 px-4 py-3 rounded">
          <Text className="text-red-700 text-center">{error}</Text>
          <TouchableOpacity 
            onPress={() => setError(null)}
            className="mt-2 self-center"
          >
            <Text className="text-red-600 font-medium">{t("PassTarget.Dismiss")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default PassTarget;