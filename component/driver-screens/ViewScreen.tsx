import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Alert,
  Modal
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types";
import { environment } from '@/environment/environment';
import { useTranslation } from "react-i18next";
import { AntDesign, FontAwesome } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CropItemsScrollView from './CropItemsScrollView';
import moment from "moment";


type ViewScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ViewScreen"
>;

interface ViewScreenProps {
  navigation: ViewScreenNavigationProp;
  route: {
    params: {
      requestId: number;
    };
  };
}

const ViewScreen: React.FC<ViewScreenProps> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const [requestId, setRequestId] = useState(route.params?.requestId || "12403020001");
    const [crop, setCrop] = useState("Carrot");
    const [variety, setVariety] = useState("New Kuroda");
    const [loadWeight, setLoadWeight] = useState("2");
    const [scheduled, setScheduled] = useState("");
    const [driverName, setDriverName] = useState("Ravin Dilshan, Chalana Herath");
    const [driverId, setDriverId] = useState("DVR00001, DVR00002");
    const [scheduleDate, setScheduleDate] = useState("");
    const [buildingNo, setBuildingNo] = useState("");
    const [streetName, setStreetName] = useState("");
    const [city, setCity] = useState("");
    const [requestStatus , SetRequestStatus] = useState("");
    const [routeNumber, setRouteNumber] = useState("");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isScheduled, setIsScheduled] = useState(true);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<Array<{
      itemId: number;
      cropName: string;
      cropId: number;
      varietyName: string;
      varietyId: number;
      loadWeight: number;
      crop?: string;
      variety?: string;
    }>>([]);
    
    // Change these to use number keys instead of string keys
    const [crops, setCrops] = useState<Record<number, string>>({});
    const [varieties, setVarieties] = useState<Record<number, string>>({});
    const [alertVisible, setAlertVisible] = useState(false);
    const [cancellationReason, setCancellationReason] = useState("");
    const [reuestCode, setRequestCode] = useState("");
const [cancelledBy, setCancelledBy] = useState("");
const [isUpdateEnabled, setIsUpdateEnabled] = useState(false);
  
    // Determine if fields should be editable based on status
    const isEditable = scheduled === "Scheduled" || requestStatus === "Not Assigned" ;
    const [originalScheduleDate, setOriginalScheduleDate] = useState(""); // To track the original date


   // const showUpdateButton = scheduled === "Scheduled" || scheduled === "On way" || scheduled === "Collected" || scheduled === "Cancelled";
   const showUpdateButton = scheduled === "Scheduled" || requestStatus === "Not Assigned";
    const showCancelButton = scheduled === "Scheduled" || scheduled === "On way"|| requestStatus === "Not Assigned";

      const [selectedLanguage, setSelectedLanguage] = useState<string>("en");
      useEffect(() => {
        const fetchLanguage = async () => {
          try {
            const lang = await AsyncStorage.getItem("@user_language"); // Get stored language
            setSelectedLanguage(lang || "en"); // Default to English if not set
          } catch (error) {
            console.error("Error fetching language preference:", error);
          }
        };
        fetchLanguage();
      }, []);
  
    const handleDateChange = (event: any, selectedDate?: Date) => {
      setShowDatePicker(false);
      
      if (selectedDate) {
        // Only update the scheduleDate if a new date (not current date) is selected
        const formattedDate = `${selectedDate.getFullYear()}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${String(selectedDate.getDate()).padStart(2, '0')}`;
        // Check if the selected date is the current date, if so, don't update
        const currentDate = new Date();
        const currentFormattedDate = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
        if (formattedDate === currentFormattedDate) {
          return; // Do not update if current date is selected
        }
        setScheduleDate(formattedDate); // Update scheduleDate only if it's not the current date
        if (formattedDate !== originalScheduleDate) {
          setIsUpdateEnabled(true);
        } else {
          setIsUpdateEnabled(false);
        }
      }
    };
  
    useEffect(() => {
      const fetchData = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) {
            Alert.alert('Error', 'Authentication token not found');
            return;
          }
    
          const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          };
    
          const url = `${environment.API_BASE_URL}api/collectionrequest/view-details/${requestId}`;
    
          const response = await fetch(url, {
            method: 'GET',
            headers: headers,
          });
    
          if (!response.ok) {
            console.error("Response not OK:", response.status, response.statusText);
            const errorText = await response.text();
            console.log("Error response:", errorText);
            setError(`Server returned ${response.status}: ${response.statusText}`);
            return;
          }
    
          const textResponse = await response.text();
          console.log("Raw response:", textResponse);
    
          try {
            const jsonData = JSON.parse(textResponse);
            console.log("Parsed JSON:", jsonData);
    
            if (jsonData.success) {
              const responseData = jsonData.data;
              
              // Set state with the fetched data
              setRequestId(responseData.id.toString());
              
              // Handle multiple items if they exist
              if (responseData.items && responseData.items.length > 0) {
                setItems(responseData.items);
      
                // Create mapping of crop IDs to crop Name based on selected language
                const cropMapping: Record<number, string> = {};
                const varietyMapping: Record<number, string> = {};
      
                responseData.items.forEach((item: any) => {
                  if (selectedLanguage === 'si') {
                    cropMapping[item.cropId] = item.cropNameSinhala || `Crop ${item.cropId}`;
                    varietyMapping[item.varietyId] = item.varietyNameSinhala || `Variety ${item.varietyId}`;
                  } else if (selectedLanguage === 'ta') {
                    cropMapping[item.cropId] = item.cropNameTamil || `Crop ${item.cropId}`;
                    varietyMapping[item.varietyId] = item.varietyNameTamil || `Variety ${item.varietyId}`;
                  } else {
                    cropMapping[item.cropId] = item.cropName || `Crop ${item.cropId}`;
                    varietyMapping[item.varietyId] = item.varietyName || `Variety ${item.varietyId}`;
                  }
                });
      
                setCrops(cropMapping);
                console.log("Crops:", cropMapping);
                setVarieties(varietyMapping);
              }
              console.log("jjjjjjj")
              setScheduleDate( moment(responseData.scheduleDate).format('YYYY-MM-DD'));
              setRouteNumber(responseData.route);
              setScheduled(responseData.assignedStatus);
              SetRequestStatus(responseData.requestStatus)
              setBuildingNo(responseData.houseNo);
              setStreetName(responseData.streetName);
              setCity(responseData.city);
              setRequestCode(responseData.requestID);

              if (responseData.assignedStatus === "Cancelled" ) {
                setCancellationReason(responseData.cancelReason || "");
                setCancelledBy(responseData.cancelledBy || "You");
              }
              
            }
          } catch (parseError: unknown) {
            console.error("JSON parse error:", parseError);
            if (parseError instanceof Error) {
              setError('Error parsing response: ' + parseError.message);
            } else {
              setError('Error parsing response: Unknown error');
            }
          }
        } catch (error: unknown) {
          console.error("Fetch error:", error);
          if (error instanceof Error) {
            setError('Error fetching data: ' + error.message);
          } else {
            setError('Error fetching data: Unknown error');
          }
        } finally {
          setLoading(false);
        }
      };
    
      fetchData();
    }, [requestId]);


    
    
    const getStatusBackgroundColor = (status: string) => {
      switch (status) {
        case 'On way':
          return '#F8FFA6'; 
        case 'Collected':
          return '#C8E0FF'; 
        case 'Cancelled':
          return '#FFB9B7'; 
        case 'Scheduled':
          return '#CFCFCF'; 
        case 'Not Assigned':
            return '#CCEAE5'
        default:
          return '#E0E0E0'; 
      }
    };
  
    const handleItemUpdate = (updatedItem: any) => {
      setItems(currentItems => 
        currentItems.map(item => 
          item.itemId === updatedItem.itemId ? updatedItem : item
        )
      );
    };
  
    
    const handleUpdate = async () => {
      console.log(scheduleDate);
    
      // Only allow update if the schedule date has changed
      if (isUpdateEnabled && scheduleDate !== originalScheduleDate) {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) {
            Alert.alert('Error', 'Authentication token not found');
            return;
          }
    
          const response = await fetch(
            `${environment.API_BASE_URL}api/collectionrequest/update-collectionrequest/${requestId}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,  
              },
              body: JSON.stringify({
                scheduleDate: scheduleDate,
              }),
            }
          );
    
          if (response.status === 200) {
            Alert.alert(t("Error.Success"), t("CollectionRequest.Schedule Date updated successfully"));
            setOriginalScheduleDate(scheduleDate); 
            setIsUpdateEnabled(false);
          } else if (response.status === 400) {
            const errorData = await response.json();
            Alert.alert(t("Error.error"), t("CollectionRequest.Failed to update schedule date"));
          } else {
            // Generic error
            Alert.alert(t("Error.error"), t("CollectionRequest.Failed to update schedule date"));
          }
        } catch (error) {
          console.error("Update error:", error);
      Alert.alert(t('Error.error'), t('Error.somethingWentWrong'));
        }
      } else {
        Alert.alert(t("Error.error"), t("CollectionRequest.Schedule Date has not been changed"));
      }
    };
    
    
      const handleConfirm = () => {
        
        console.log("Confirmed update for request:", requestId);
        navigation.navigate("Cancelreson" as any, {
            requestId: requestId,
            status: scheduled,
       
          });
        setAlertVisible(false);
        
      };
    
      const handleCancel = () => {
        setAlertVisible(true);
      };
      const handleCancelConfim = () => {
        setAlertVisible(false);
      }
  
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() ); 
      
    return (
      <SafeAreaView className="flex-1 bg-white">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView className="flex-1 bg-white" keyboardShouldPersistTaps="handled"> 
            {/* Header with back button and ID */}
            <View className="flex-row px-4 py-4 border-b border-white">
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={24} color="black" />
              </TouchableOpacity>
              <View className="flex-1 items-center justify-center">
                <Text className="text-base font-medium">{t("CollectionRequest.ID")} : {reuestCode}</Text>
              </View>
            </View>
  
            {/* Form Content */}
            <View className="px-4 py-2">
              {items.length > 0 ? (
                <CropItemsScrollView 
                  items={items} 
                  crops={crops} 
                  varieties={varieties}
                  onItemUpdate={handleItemUpdate} 
                />
              ) : (
                // Fallback for when there are no items
                <>
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.Crop")}</Text>
                    <TextInput
                      className="border border-gray-300 rounded px-3 py-2 text-base"
                      value={crop}
                      onChangeText={setCrop}
                      editable={isEditable}
                    />
                  </View>
  
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.Variety")}</Text>
                    <TextInput
                      className="border border-gray-300 rounded px-3 py-2 text-base"
                      value={variety}
                      onChangeText={setVariety}
                      editable={isEditable}
                    />
                  </View>
  
                  <View className="mb-4">
                    <Text className="text-sm text-gray-600 mb-1">Load in kg (Approx)</Text>
                    <TextInput
                      className="border border-gray-300 rounded px-3 py-2 text-base"
                      value={loadWeight}
                      onChangeText={setLoadWeight}
                      keyboardType="numeric"
                      editable={isEditable}
                    />
                  </View>
                </>
              )}
  
             
            
              <View className="flex-row justify-center mb-4 items-center">
  <View
    className="px-4 py-1 rounded"
    style={{
      backgroundColor: getStatusBackgroundColor(
        requestStatus === "Not Assigned" ? requestStatus : scheduled
      ),
    }}
  >
    <Text className="text-gray-700 text-sm">
     { t(`CollectionRequest.${requestStatus === "Not Assigned" ? requestStatus : scheduled}`)}
    </Text>
  </View>
</View>

{(scheduled === "Cancelled" || requestStatus === "Cancelled") && (
  <View className="mb-4   rounded-md p-3">
    <Text className="text-sm text-black mb-1 text-center"> {t("CollectionRequest.Reason to Cancel")}</Text>
    <View className="border border-red-300 rounded-md p-2 ">
      <Text className="text-red-500 text-center">
        {cancellationReason || "The Farmer called and requested to cancel"}
      </Text>
    </View>
    <Text className="text-sm text-gray-500 text-center mt-1">
       {t("CollectionRequest.Canceled by")}: {cancelledBy}
    </Text>
  </View>
)}

              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.Schedule Date")}</Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="border border-gray-300 rounded px-3 py-2 text-base flex-1"
                    value={scheduleDate}
                    onChangeText={setScheduleDate}
                    editable={!isEditable}
                  />
                  {isEditable && (
                    <TouchableOpacity
                      className="ml-2"
                      onPress={() => setShowDatePicker(prev => !prev)}
                    >
                      <FontAwesome name="calendar" size={20} color="gray" />
                    </TouchableOpacity>
                  )}
               
       
                 </View>
              

{showDatePicker  && Platform.OS === "android" && (
          <DateTimePicker
            value={new Date()}
             mode="date"
            display="default"
            onChange={handleDateChange}
            minimumDate={tomorrow} 
          />
        )}
        {showDatePicker && Platform.OS === "ios" && (
          <>
            <View className=" justify-center items-center z-50 absolute ml-2 -mt-[90%] bg-gray-100  rounded-lg">
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="inline"
                style={{ width: 320, height: 260 }}
                onChange={handleDateChange}
                minimumDate={tomorrow} 
              />
            </View>
          </>
        )}

               
      
              </View>
  
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.Building / House No")}</Text>
                <TextInput
                  className="border border-gray-300 rounded px-3 py-2 text-base"
                  value={buildingNo}
                  onChangeText={setBuildingNo}
                  editable={false}
                />
              </View>
  
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.Street Name")}</Text>
                <TextInput
                  className="border border-gray-300 rounded px-3 py-2 text-base"
                  value={streetName}
                  onChangeText={setStreetName}
                  // editable={isEditable}
                  editable={false}
                />
              </View>
  
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.City")}</Text>
                <TextInput
                  className="border border-gray-300 rounded px-3 py-2 text-base"
                  value={city}
                  onChangeText={setCity}
                  editable={false}
                  />
              </View>
  
              <View className="mb-4">
                <Text className="text-sm text-gray-600 mb-1">{t("CollectionRequest.Closest Landmark")}</Text>
                <TextInput
                  className="border border-gray-300 rounded px-3 py-2 text-base"
                  value={routeNumber}
                  onChangeText={setRouteNumber}
                  editable={false}
                />
              </View>
  
         {/*Action Button*/}
              <View className="mt-4 mb-8">
                {showUpdateButton && (
                  <TouchableOpacity
                  className={`rounded-full py-3 items-center mb-3 ${isUpdateEnabled ? 'bg-[#2AAD7A]' : 'bg-gray-400'}`}
                  onPress={handleUpdate}
                    disabled={!isUpdateEnabled}
                  >
                    <Text className="text-white text-base">{t("CollectionRequest.Update")}</Text>
                  </TouchableOpacity>
                )}
  
                {showCancelButton && (
                  <TouchableOpacity
                    className="bg-[#E14242] rounded-full py-3 items-center"
                    onPress={handleCancel}
                  >
                    <Text className="text-white text-base">{t("CollectionRequest.Cancel Request")}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Modal
  transparent={true}
  visible={alertVisible}  
  animationType="fade"
  onRequestClose={handleCancel}  
>
  <View className="flex-1 justify-center items-center bg-black/50">
    <View className="bg-white rounded-lg w-4/5 p-5">
      <Text className="text-center text-lg font-medium mb-2" style={{fontSize:16}}>{t("CollectionRequest.Are you sure?")}</Text>
      <Text className="text-center text-gray-600 mb-6">{t("CollectionRequest.Are you sure Massage")}
</Text>
      
      <TouchableOpacity 
        className="bg-black rounded-full py-3 mb-3" 
        onPress={handleConfirm}  
      >
        <Text className="text-white text-center font-medium">{t("CollectionRequest.Confirm")}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        className="bg-gray-200 rounded-full py-3" 
        onPress={handleCancelConfim}  
      >
        <Text className="text-gray-700 text-center">{t("CollectionRequest.Cancel")}</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  };
  
  export default ViewScreen;