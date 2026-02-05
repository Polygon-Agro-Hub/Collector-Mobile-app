import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Modal,
  Image,
  Button,
  Keyboard,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import AntDesign from "react-native-vector-icons/AntDesign";
import DropDownPicker from "react-native-dropdown-picker";
import { RootStackParamList } from "../types";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native-gesture-handler";
import axios from "axios";
import { environment } from "@/environment/environment";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

type CollectionRequestFormProps = {
  navigation: StackNavigationProp<RootStackParamList, "CollectionRequestForm">;
  route: RouteProp<RootStackParamList, "CollectionRequestForm">;
};

interface Crop {
  id: number;
  cropNameEnglish: string;
  cropNameSinhala: string;
  cropNameTamil: string;
}

interface CropVariety {
  id: number;
  varietyEnglish: string;
  varietySinhala: string;
  varietyTamil: string;
}

interface Farmer {
  id: number;
  firstName: string;
  phoneNumber: string;
  nicNumber: string;
  profileImage: string | null;
  farmerQr: string | null;
  membership: string;
  activeStatus: string;
  address: {
    buildingNo: string | null;
    streetName: string | null;
    city: string | null;
    district: string | null;
  };
  routeNumber: string | null;
  createdAt: string | null;
}

const CollectionRequestForm: React.FC<CollectionRequestFormProps> = ({
  navigation,
}) => {
  const route = useRoute();
  const { NICnumber } = route.params as { NICnumber: string };
  const { id } = route.params as { id: number };
  const { oldcity,oldstreet,oldlandmark,  oldhouseno } =
  route.params as {
    oldcity?: string;
    oldstreet?: string;
    oldlandmark?: string;
    oldhouseno?: string;
  };
  const { phoneNumber } = route.params as { phoneNumber: string };
  const { language } = route.params as { language: string };
  const [crop, setCrop] = useState<string | null>(null);
  const [variety, setVariety] = useState<string | null>(null);
  console.log("variety", variety)
  const [loadIn, setLoadIn] = useState("");
  // const [scheduleDate, setScheduleDate] = useState("");
  const [geoLocation, setGeoLocation] = useState("");
  // const [buildingNo, setBuildingNo] = useState("");
  //const [streetName, setStreetName] = useState("");
  //const [city, setCity] = useState("");
  const { t } = useTranslation();
  const [openCrop, setOpenCrop] = useState(false);
  const [openVariety, setOpenVariety] = useState(false);
  //const [cropOptions, setCropOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropNames, setCropNames] = useState<Crop[]>([]);
  const [cropOptions, setCropOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [varietyOptions, setVarietyOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [buildingNo, setBuildingNo] = useState( oldhouseno || "");
  const [streetName, setStreetName] = useState(oldstreet || "");
  const [city, setCity] = useState(oldcity || "");
  const [routeNumber, setRouteNumber] = useState(oldlandmark || "");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [showPicker, setShowPicker] = useState(false);
  const [cropsList, setCropsList] = useState<any[]>([]);
  console.log("Crops List:", cropsList);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [showAddmore, setShowAddMore] = useState(false);
  const [previousCrop, setPreviousCrop] = useState<string | null>(null);
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

  console.log("gggg", NICnumber);
  console.log("kkkkkkk", id);
  console.log("phoneNumber", phoneNumber);
  console.log("language", language);



  useFocusEffect(
    React.useCallback(() => {
      setShowPicker(false); // Hide the date picker when the screen is focused
      setScheduleDate(""); // Reset the schedule date to YYYY-MM-DD format
      const fetchCropNames = async () => {
        try {
          const token = await AsyncStorage.getItem("token");
          if (!token) {
            console.error("No authentication token found");
            return;
          }

          const headers = { Authorization: `Bearer ${token}` };
          const response = await axios.get<Crop[]>(
            `${environment.API_BASE_URL}api/unregisteredfarmercrop/get-crop-names/for-collection`,
            { headers }
          );

          // Remove duplicates based on cropNameEnglish
          const uniqueCropNames = response.data.reduce<Crop[]>((acc, crop) => {
            if (
              !acc.some((item) => item.cropNameEnglish === crop.cropNameEnglish)
            ) {
              acc.push(crop);
            }
            return acc;
          }, []);

          console.log("Selected Language", selectedLanguage)
          // Map crops to the correct language based on selectedLanguage
          const mappedCrops = uniqueCropNames.map((crop) => {
            let label = ""; // Default to English
            if (selectedLanguage === "si") {
              label = crop.cropNameSinhala; // Sinhala
            } else if (selectedLanguage === "ta") {
              label = crop.cropNameTamil; // Tamil
            }else if (selectedLanguage === "en"){
              label = crop.cropNameEnglish;
            }

            return {
              label,
              value: crop.id.toString(),
            };
          });

           const sortedCrops = mappedCrops.sort((a, b) => {
          if (a.label < b.label) return -1;
          if (a.label > b.label) return 1;
          return 0;
        });

        setCropOptions(sortedCrops); // Set crop options once after sorting
        console.log("Sorted Crop Names:", sortedCrops);
        } catch (error) {
          console.error("Error fetching crop names:", error);
        }
      };

      fetchCropNames();
    }, [selectedLanguage]) // Re-run fetch if the selectedLanguage changes
  );

  const getTextStyle = (language: string) => {
    if (language === "si") {
      return {
        fontSize: 14, // Smaller text size for Sinhala
        lineHeight: 20, // Space between lines
      };
    }
   
  };
  
  useEffect(() => {
    const fetchVarieties = async () => {
      if (!crop) return;

      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const cropId = Number(crop);

        console.log("Fetching varieties for crop ID:", cropId);
        
        // Fetch the crop varieties for the selected crop
        const response = await axios.get<CropVariety[]>(
          `${environment.API_BASE_URL}api/unregisteredfarmercrop/crops/varieties/collection/${cropId}`,
          { headers }
        );

        console.log("Fetched Varieties:", response.data);

        // Map varieties based on the selected language
        const mappedVarieties = response.data.map((variety) => {
          let label = variety.varietyEnglish; // Default to English

          if (selectedLanguage === "si") {
            label = variety.varietySinhala; // Sinhala
          } else if (selectedLanguage === "ta") {
            label = variety.varietyTamil; // Tamil
          }

          return {
            label,
            value: variety.id.toString(),
          };
        });

         const sortedVarieties = mappedVarieties.sort((a, b) => {
        return a.label.localeCompare(b.label); // Sort alphabetically
      });

      setVarietyOptions(sortedVarieties); // Set variety options once after sorting
      console.log("Sorted Varieties:", sortedVarieties);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(
            "Error fetching crop varieties:",
            error.response?.data || error.message
          );
        } else {
          console.error("Unexpected error fetching crop varieties:", error);
        }
      }
    };

    fetchVarieties();
  }, [crop, selectedLanguage]); // Only re-run when the `crop` state changes


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) {
          console.error("No token found!");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const response = await axios.get(
          `${environment.API_BASE_URL}api/unregisteredfarmercrop/all-farmer`,
          {
            headers,
            params: { nicNumber: NICnumber }, // Passing NICnumber as a query parameter
          }
        );
        console.log(response.data);

        const farmers: Farmer[] = response.data;

        // Assuming farmers data is valid and has the required fields
        if (farmers.length > 0) {
          const farmer = farmers[0];
          setBuildingNo(farmer.address.buildingNo || "");
          setStreetName(farmer.address.streetName || "");
          setCity(farmer.address.city || "");
          setRouteNumber(farmer.routeNumber || "");

          console.log("buildingNo:", farmer.address.buildingNo);
          console.log("streetName:", farmer.address.streetName);
          console.log("city:", farmer.address.city);
          console.log("routeNumber:", farmer.routeNumber);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error:", error.message);
        }
      }
    };

    fetchUsers();
  }, [NICnumber]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false); // Hide picker after selection
    if (selectedDate) {
      setScheduleDate(selectedDate.toISOString().split("T")[0]); // Format date as YYYY-MM-DD
    }
  };

  const handleAddMore = async () => {
    Keyboard.dismiss();
    setShowAddMore(false);
  };
  const handleAddtoList = () => {
    if (!crop || !variety || !loadIn) {
      Alert.alert(t("Error.error"), t("Error.Please fill in all required fields."));
      return;
    }
      if (parseFloat(loadIn) < 0) {
    Alert.alert(t("Error.error"), t("Error.Cannot add negative values for loadIn."));
    return;
  }

    // Get the crop name based on the selected crop ID
    const selectedCropName = cropOptions.find(
      (item) => item.value === crop
    )?.label;
    // Get the variety name based on the selected variety ID
    const selectedVarietyName = varietyOptions.find(
      (item) => item.value === variety
    )?.label;

    // Check if both crop name and variety name exist
    if (!selectedCropName || !selectedVarietyName) {
      Alert.alert(t("Error.error"), t("Error.Invalid crop or variety selected."));
      return;
    }

    // Add new crop request to the crops list with full information
    const newCrop = {
      crop, // Store crop ID
      cropName: selectedCropName, // Store crop name
      variety, // Store variety ID
      varietyName: selectedVarietyName, // Store variety name
      loadIn, // Store loadIn
    };

    setCropsList((prevList) => {
      return [...prevList, newCrop]; // Add the new crop to the list
    });

    setCrop(null); // Reset crop selection
    setVariety(null); // Reset variety selection
    setLoadIn(""); // Reset load input field
    setShowAddMore(true); // Show the 'Add More' button
  };

  const handleSubmit = async () => {
    console.log("Submitting collection request...");
    console.log("Crops List:", cropsList);
    Keyboard.dismiss(); // Dismiss the keyboard if it's open
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found");
        Alert.alert(t("Error.error"), t("Error.Authentication required. Please log in."));
        return;
      }

      if (
        !buildingNo ||
        !streetName ||
        !city ||
        cropsList.length === 0 ||
        !scheduleDate
      ) {
        Alert.alert(
          t("Error.error"),
          t("Error.Please fill all fields, add crops, and select a schedule date.")
        );
        return;
      }

      const farmerId = id; // Ensure `id` is properly set

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      try {
        const addressData = { 
          routeNumber: routeNumber || "", // Send empty string if null/undefined
          buildingNo, 
          streetName, 
          city 
        };
        
        console.log("Updating user address with:", addressData);
        
        const updateUserResponse = await axios.put(
          `${environment.API_BASE_URL}api/unregisteredfarmercrop/user/update/${farmerId}`,
          addressData,
          { headers }
        );

        console.log("Update user response:", updateUserResponse.status, updateUserResponse.data);

        if (updateUserResponse.status !== 200) {
          Alert.alert(t("Error.error"), t("Error.Failed to update user details"));
          return;
        }
      } catch (error: unknown) {
        // Properly type the error
        if (axios.isAxiosError(error)) {
          console.error("Error updating user details:", error.response?.data || error.message);
        } else {
          console.error("Error updating user details:", error);
        }
        Alert.alert(t("Error.error"), t("Error.Failed to update user address"));
        return;
      }
      
      try {
        // 2. Submit multiple collection requests with a single schedule date
        const collectionRequestData = cropsList.map((crop) => ({
          farmerId,
          crop: crop.crop,
          variety: crop.variety,
          loadIn: crop.loadIn,
          scheduleDate: scheduleDate, // Use the single schedule date for all crops
          buildingNo,
          streetName,
          city,
          routeNumber: routeNumber || "" // Always include routeNumber, empty string if null
        }));

        console.log("Submission Data:", JSON.stringify(collectionRequestData, null, 2));

        const collectionRequestResponse = await axios.post(
          `${environment.API_BASE_URL}api/unregisteredfarmercrop/submit-collection-request`,
          { requests: collectionRequestData }, // Send as an array
          { headers }
        );

        console.log("Collection request response:", collectionRequestResponse.status, collectionRequestResponse.data);

        if (collectionRequestResponse.status === 200) {
          // Clear the form after successful submission
          Alert.alert(t("Error.Success"), t("Error.Collection Requests Submitted!"));
          try {
            const apiUrl = "https://api.getshoutout.com/coreservice/messages";
            const smsHeaders = {
              Authorization: `Apikey ${environment.SHOUTOUT_API_KEY}`,
              "Content-Type": "application/json",
            };

            let Message = "";
            if (language === "English") {
              Message = `Thank you for placing a produce collection order with us. The allocated driver will contact you one day prior to the collection date.`;
            } else if (language === "Sinhala") {
              Message = `අප වෙත නිෂ්පාදන එකතු කිරීමේ ඇණවුමක් ලබා දීම ගැන ඔබට ස්තූතියි. ඔබ වෙනුවෙන් වෙන් කරන ලද රියදුරුමහතෙකු එකතු කිරීමේ දිනයට දිනකට පෙර ඔබව සම්බන්ධ කර ගනු ඇත.`;
            } else if (language === "Tamil") {
              Message = `எங்களிடம் விளைபொருள் சேகரிப்பு உத்தரவை வழங்கியதற்கு நன்றி. ஒதுக்கப்பட்ட ஓட்டுநர் சேகரிப்பு திகதிக்கு ஒரு நாள் முன்னதாக உங்களைத் தொடர்புகொள்வார்.`;
            }
            const formattedPhone = phoneNumber;

            const body = {
              source: "AgroWorld",
              destinations: [formattedPhone],
              content: {
                sms: Message,
              },
              transports: ["sms"],
            };

            const response = await axios.post(apiUrl, body, { headers: smsHeaders });

            if (response.data.referenceId) {
              console.log("SMS notification sent successfully!")
            }
          } catch (error: unknown) {
            if (error instanceof Error) {
              console.error("Error sending SMS:", error.message);
            } else {
              console.error("Error sending SMS:", error);
            }
          }
          setCropsList([]); // Clear the crops list
          setRouteNumber("");
          setBuildingNo("");
          setStreetName("");
          setCity("");
          setScheduleDate("");
        } else {
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        }
      } catch (error: unknown) {
        // Type-safe error handling
        if (axios.isAxiosError(error)) {
          console.error("Error submitting collection request:", error.response?.data || error.message);
          let errorMessage = t("Error.somethingWentWrong");
          
          // Check for specific error responses from the server
          if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          }
          
          Alert.alert(t("Error.error"), errorMessage);
        } else if (error instanceof Error) {
          console.error("Error submitting collection request:", error.message);
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        } else {
          console.error("Unknown error submitting collection request:", error);
          Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
        }
      }
    } catch (error: unknown) {
      // Type-safe error handling for the main try-catch block
      if (error instanceof Error) {
        console.error("Main error in handleSubmit:", error.message);
      } else {
        console.error("Main error in handleSubmit:", error);
      }
      Alert.alert(t("Error.error"), t("Error.somethingWentWrong"));
    }
  };
  const truncateText = (text: string, length: number) => {
    return text.length > length ? text.substring(0, length) + "..." : text;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white  "
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center "  style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}>
          <TouchableOpacity onPress={() => navigation.goBack()} className="">
            <AntDesign name="left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-xl font-bold text-black" style={{ fontSize: 18 }}>
           {t("CollectionRequest.Collection Request Form")}
          </Text>
        </View>

        <View className=" p-8 -mt-2">
          {/* Crop Dropdown */}

          {/* Address Input */}
          <Text className="text-gray-700 mb-2">{t("CollectionRequest.Building / House No")}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
            value={buildingNo}
            onChangeText={setBuildingNo}
            placeholder=" "
          />
          {/* Address Input */}
          <Text className="text-gray-700 mb-2">{t("CollectionRequest.Street Name")}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
            value={streetName}
            onChangeText={setStreetName}
            placeholder=" "
          />
          {/* Address Input */}
          <Text className="text-gray-700 mb-2">{t("CollectionRequest.City")}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 mb-4"
            value={city}
            onChangeText={setCity}
            placeholder=" "
          />

          {/* Root Number Input */}
          <Text className="text-gray-700 mb-2">{t("CollectionRequest.Closest Landmark")}</Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-4 py-2 mb-6"
            value={routeNumber}
            onChangeText={setRouteNumber}
            placeholder=" "
          />

          <Text className="text-gray-700 mb-2">{t("CollectionRequest.Schedule Date")}</Text>
          <View className="border border-gray-300 rounded-lg px-4 mb-4 flex-row items-center">
          <TouchableOpacity
              onPress={() => {
                setShowPicker(prev => !prev);
                Keyboard.dismiss();
              }}
              className="flex-row items-center"
            >
            <TextInput
              className="flex-1 text-gray-700 p-2"
              value={scheduleDate}
              placeholder={t("CollectionRequest.Select Schedule Date")}
              editable={false} // Prevent manual input
            />
       
              <Image
                source={require("../../assets/images/Rescheduling.webp")}
                className="h-[24px] w-[24px] ml-2"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>

{showPicker && Platform.OS === "android" && (
          <DateTimePicker
          value={scheduleDate ? new Date(scheduleDate) : new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()} 
            onChange={handleDateChange}
          />
        )}
        {showPicker && Platform.OS === "ios" && (
          <>
            <View className=" justify-center items-center z-50 absolute ml-6 mt-[5%] bg-gray-100  rounded-lg">
              <DateTimePicker
                value={scheduleDate ? new Date(scheduleDate) : new Date()}
                mode="date"
                display="inline"
                minimumDate={new Date()} 
                style={{ width: 320, height: 260 }}
                onChange={handleDateChange}
              />
            </View>
          </>
        )}

          <View className="h-0.5 bg-[#D2D2D2] mb-4 mt-2" />

           <View className="mb-4 -z-10">
                <Text className="text-gray-700 mb-2">{t("CollectionRequest.Added Requests")}</Text>
                {cropsList.map((item, index) => (
                  <View
                    key={index}
                    className="flex-row justify-between  w-full mt-1"
                  >
                    <View className="flex-row mb-1  w-full items-center">
                      <View className="flex-row items-center rounded-lg mb-1 border border-[#2AAD7A] p-2  min-w-[85%] ">
                        <Text className="min-w-[25%]">
                          {truncateText(item.cropName, 10)}
                        </Text>
                        <View className="h-[20px] border-l border-[#2AAD7A] mx-2" />{" "}
                        {/* Vertical Line */}
                        <Text>{truncateText(item.varietyName, 20)}</Text>
                      </View>

                      <TouchableOpacity
                        className="bg-red-100 absolute rounded-md  p-2 justify-center right-0"
                        onPress={() => {
                          const updatedList = cropsList.filter(
                            (_, i) => i !== index
                          );
                          setCropsList(updatedList);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={24}
                          color="#d42c20"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <View className="h-0.5 bg-[#D2D2D2]  mt-4" />
              </View>

          {showAddmore && cropsList.length > 0 ? (
            <View>
             

              <View>
                <TouchableOpacity
                  onPress={handleAddMore}
                  className="bg-[#2AAD7A] mt-6 py-3 rounded-full"
                >
                  <Text className="text-white text-center text-lg font-bold" style={{ fontSize: 16 }}>
                    {t("CollectionRequest.Add more")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSubmit}
                  className="mt-4 py-3 rounded-full border border-black"
                >
                  <Text className="text-black text-center text-lg font-bold" style={{ fontSize: 16 }}>
                    {t("CollectionRequest.Submit")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="mb-8">
              <Text className="text-gray-700 mb-2">{t("CollectionRequest.Crop")}</Text>
              <DropDownPicker
                open={openCrop}
                value={crop}
                items={cropOptions}
                setOpen={(open) => {
                  setOpenCrop(open);
                  setOpenVariety(false);
                  Keyboard.dismiss();
                }}
                setValue={setCrop}
                placeholder={t("CollectionRequest.--Select Crop--")}
                placeholderStyle={{ color: "#CFCFCF", fontStyle: "italic" }}
                dropDownContainerStyle={{
                  borderColor: "#CFCFCF",
                  borderWidth: 1,
                  backgroundColor: "#FFFFFF",
                  maxHeight: 200,
                }}
                style={{
                  borderColor: "#CFCFCF",
                  borderWidth: 1,
                  marginBottom: 4,
                }}
                textStyle={{ fontSize: 14 }}
                zIndex={80000}
                zIndexInverse={1000}
                dropDownDirection="BOTTOM"
                listMode="SCROLLVIEW"
                loading={loading}
              />

              <Text className="text-gray-700 mb-2 mt-2">{t("CollectionRequest.Variety")}</Text>
              <DropDownPicker
                open={openVariety}
                value={variety}
                items={varietyOptions}
                setOpen={(open) => {
                  setOpenCrop(false);
                  setOpenVariety(open);
                  Keyboard.dismiss();
                }}
                setValue={setVariety}
                placeholder={t("CollectionRequest.--Select Variety--")}
                placeholderStyle={{ color: "#CFCFCF", fontStyle: "italic" }}
                dropDownContainerStyle={{
                  borderColor: "#CFCFCF",
                  borderWidth: 1,
                  backgroundColor: "#FFFFFF",
                  maxHeight: 200,
                }}
                dropDownDirection="BOTTOM"
                style={{
                  borderColor: "#CFCFCF",
                  borderWidth: 1,
                  marginBottom: 4,
                }}
                textStyle={{ fontSize: 14 }}
                zIndex={50000}
              />

              <Text className="text-gray-700 mb-2 mt-2">
                {t("CollectionRequest.Load in kg (Approx)")}
              </Text>
              <TextInput
                className="border border-gray-300 text-black rounded-lg px-4 py-3 mb-4  placeholder:italic"
                value={loadIn}
                onChangeText={setLoadIn}
                keyboardType="numeric"
                placeholder="ex : 100"
              />

              <TouchableOpacity
                onPress={handleAddtoList}
                className="bg-[#2AAD7A] mt-6 py-3 rounded-full"
              >
                <Text className="text-white text-center text-lg font-bold" style={{fontSize:16}}>
                  {t("CollectionRequest.Add to the List")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CollectionRequestForm;
