import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Image, Alert , RefreshControl, Platform} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {environment }from '@/environment/environment';
import moment from "moment";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from 'react-i18next';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import LottieView from 'lottie-react-native';
type NotAssignedRequest = {
  id: number;
  name: string;
  route: string;
  farmerId: number;
  nic:string;
  cropId: number;
  items: any[];
  scheduleDate: string;
};

type AssignedRequest = {
  id: number;
  name: string;
  nic:string;
  route: string;
  farmerId: number;
  cropId: number;
  assignedStatus: 'Collected' | 'On way' | 'Cancelled' | 'Scheduled';
  items: any[];
  scheduleDate: string;
};

type RootStackParamList = {
  CollectionRequests: undefined;
  // Add other screens as needed
};

type CollectionRequestsNavigationProp = StackNavigationProp<
  RootStackParamList,
  "CollectionRequests"
>;

interface CollectionRequestsProps {
  navigation: CollectionRequestsNavigationProp;
}

const CollectionRequests: React.FC<CollectionRequestsProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'Not Assigned' | 'Assigned'>('Not Assigned');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [notAssignedRequests, setNotAssignedRequests] = useState<NotAssignedRequest[]>([]);
  const [assignedRequests, setAssignedRequests] = useState<AssignedRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<(NotAssignedRequest | AssignedRequest)[]>([]);
  const [searchText, setSearchText] = useState('');
  const [showPicker, setShowPicker] = useState(false);  // State to control date picker visibility
  const [scheduleDate, setScheduleDate] = useState<string | null>(null); 
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState(false);
  
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
  // Helper function to get name
  const getName = (name: string) => {
    return name;
  };


  const getRoute = (route: string) => {
    return `Route: ${route}`;
  };
  const getNic = (nic: string) => {
    return nic;
  };
  const getScheduleDate = (nic: string) => {
    return nic;
  };

  const handleDateChange = (event: any, selectedDate: Date | undefined) => {
    if (selectedDate) {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      setScheduleDate(formattedDate);  // Save the selected date
      setShowPicker(false);  // Close the date picker
    }
  };



useFocusEffect(
  useCallback(() => {
    setShowPicker(false); // Close the date picker when the screen is focused
    setScheduleDate(new Date().toISOString().split('T')[0]); // Set the default date to today
    const fetchData = async () => {
      setLoading(true);
      await fetchCollectionRequests();
      setLoading(false); // Set loading to false once data is fetched
    };

    fetchData();
  }, [activeTab, selectedFilter])
);
  const fetchCollectionRequests = async () => {
 
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) {
        Alert.alert(t('Error.error'), t("Error.User token not found. Please log in again."));
      return;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Build query params based on activeTab and selectedFilter
    const queryParams = new URLSearchParams();
    queryParams.append('status', activeTab);
    if (selectedFilter && selectedFilter !== 'All') {
      queryParams.append('requestStatus', selectedFilter); // Apply the selected filter
    }

    const fullUrl = `${environment.API_BASE_URL}api/collectionrequest/all-collectionrequest?${queryParams.toString()}`;
    console.log('Request URL:', fullUrl);

    const response = await axios.get(fullUrl, { headers });
    const data = response.data;
    console.log('Received Data:', data);

    if (activeTab === 'Not Assigned') {
      setNotAssignedRequests(data);
      setFilteredRequests(data);
    } else {
      setAssignedRequests(data);

      setFilteredRequests(
        selectedFilter && selectedFilter !== 'All' 
          ? data.filter((req: AssignedRequest) => req.assignedStatus === selectedFilter) 
          : data
      );
    }
  } catch (error) {
    console.error('Fetch Collection Requests Error:', error);
  } 
};

  // Handle view details
  const handleViewDetails = (item: NotAssignedRequest | AssignedRequest) => {
    // Log the item ID to the console
    console.log('View details for item:', item.id);
  
    // Navigate to the "ViewScreen" with the item data
    navigation.navigate("ViewScreen" as any, {
      requestId: item.id,
      crops: item.cropId
    });
  };

  // Handle assign collection
  const handleAssign = (item: NotAssignedRequest) => {
    console.log('Assign collection for item:', item.id);
    // Implement assign logic
  };

    const onRefresh = async () => {
    setRefreshing(true); // Set refreshing to true when pulling to refresh
    await fetchCollectionRequests(); // Call the same fetch function for a refresh
    setRefreshing(false); // Set refreshing to false once the data is fetched
  };
// Add this function to your component
const handleSearch = (text: string) => {
  setSearchText(text);
  
  
  const requestsToFilter = activeTab === 'Not Assigned' ? notAssignedRequests : assignedRequests;
  
  if (text.trim() === '') {
    
  
    return;
  }
  
 
  const searchLower = text.toLowerCase();
  
  // Filter requests based on NIC or route containing the search text
  const filtered = requestsToFilter.filter(item => {
    const nicMatch = item.nic.toLowerCase().includes(searchLower);
    const routeMatch = item.route.toLowerCase().includes(searchLower);
    return nicMatch || routeMatch;
  });
  
  setFilteredRequests(filtered);
};
const filterDataByDate = (selectedDate: string | null) => {
  if (!selectedDate) {
    // If no date is selected, show all requests for the current tab
    setFilteredRequests(activeTab === 'Not Assigned' ? notAssignedRequests : assignedRequests);
  } else {
    // Filter the requests based on the selected date
    const filtered = (activeTab === 'Not Assigned' ? notAssignedRequests : assignedRequests).filter(
      (request) => moment(request.scheduleDate).format('YYYY-MM-DD') === selectedDate
    );
    setFilteredRequests(filtered);
  }
};



// When the selected date changes, filter data accordingly
useEffect(() => {
  filterDataByDate(scheduleDate);
}, [scheduleDate, activeTab]);


  const renderRequestItem = (item: NotAssignedRequest | AssignedRequest, index: number) => {
    const name = getName(item.name);
    const route = getRoute(item.route);
    const nic = getNic(item.nic)
    const itemNumber = String(index + 1).padStart(2, '0');
    const scheduleDate = getScheduleDate(item.scheduleDate)

    return (
      <View key={item.id} className="mb-4 bg-white shadow rounded-lg ">
 <View className="h-px bg-gray-200 w-full "></View>
       <View className="flex-row justify-between items-center p-4">
  <Text className="font-bold text-gray-700 w-8">{itemNumber}</Text>
  <View className="flex-1 ml-2">
    <TouchableOpacity onPress={() => handleViewDetails(item)}>
      <Text className="font-bold">{name}</Text>
      <Text className="text-gray-500 text-sm mt-1">{t("CollectionRequest.NIC")} : {nic}</Text>
      <Text className="text-gray-500 text-sm">{t("CollectionRequest.Date")} : {moment(scheduleDate).format('YYYY-MM-DD')}</Text>
    </TouchableOpacity>
    {/* Proper horizontal line */}
    
  </View>


        

          <View className="flex-row items-center">
            {activeTab === 'Not Assigned' ? (
              <>
               <TouchableOpacity onPress={() => handleViewDetails(item)}>
            
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View 
                  className={`px-3 py-1 rounded-lg mr-2
                    ${(item as AssignedRequest).assignedStatus === 'Collected' ? 'bg-blue-100' :
                      (item as AssignedRequest).assignedStatus === 'On way' ? 'bg-yellow-100' :
                      (item as AssignedRequest).assignedStatus === 'Scheduled' ? 'bg-gray-200' :
                      (item as AssignedRequest).assignedStatus === 'Cancelled' ? 'bg-red-100' : ''}`}
                >
                  <Text 
                    className={`font-medium
                      ${(item as AssignedRequest).assignedStatus === 'Collected' ? 'text-blue-600' :
                        (item as AssignedRequest).assignedStatus === 'On way' ? 'text-yellow-600' :
                        (item as AssignedRequest).assignedStatus === 'Scheduled' ? 'text-gray-600' :
                        (item as AssignedRequest).assignedStatus === 'Cancelled' ? 'text-red-600' : ''}`}
                  >
                    {(item as AssignedRequest).assignedStatus}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleViewDetails(item)}>
                
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
  
     <View className=" bg-white">
        <View className="flex-row items-center mb-4" style={{ paddingHorizontal: wp(6), paddingVertical: hp(2) }}>
          <TouchableOpacity onPress={() => navigation.navigate("Main" as any)}>
            <AntDesign name="left" size={24} color="#000" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-xl font-bold text-black" style={{ fontSize: 18 }}>
            {t("CollectionRequest.Collection Requests")}
          </Text>
          <TouchableOpacity onPress={() => setShowPicker(prev => !prev)}>
              <AntDesign name="calendar" size={24} color="#CFCFCF" />
          </TouchableOpacity>
    
        </View>

{showPicker && Platform.OS === "android" && (
          <DateTimePicker
          value={scheduleDate ? new Date(scheduleDate) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        {showPicker && Platform.OS === "ios" && (
          <>
            <View className=" justify-center items-center z-50 absolute ml-6 mt-[50%] bg-gray-100  rounded-lg">
              <DateTimePicker
                value={scheduleDate ? new Date(scheduleDate) : new Date()}
                mode="date"
                display="inline"
                style={{ width: 320, height: 260 }}
                onChange={handleDateChange}
              />
            </View>
          </>
        )}
      </View>
  

      <View className="bg-white px-4  border-gray-200 ">
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 mt-2">
          <TextInput 
            placeholder={t("CollectionRequest.Search NIC here...")}
            className="flex-1 ml-1 p-3 text-gray-600" 
            value={searchText}
        //    onChangeText={setSearchText}
            onChangeText={handleSearch}
          />
          <Image
            source={require("../../assets/images/Searchicon.webp")}
            className="h-[20px] w-[20px]"
            resizeMode="contain"
          />
        </View>

        {activeTab === 'Not Assigned' && (
          <View className='p-2 mt-4 flex-row'>
            <Text className='text-base'>{t("CollectionRequest.All")} ({filteredRequests.length})</Text>
            <Text className='text-base text-[#2AAD7A] '> {scheduleDate}</Text>
          </View>
        )}

        {/* Assigned Tab Filter */}
        {activeTab === 'Assigned' && (
          <View className="flex-row mt-3 items-center">
            <TouchableOpacity 
              onPress={() => setShowDropdown(!showDropdown)} 
              className="flex-row items-center"
            >
              <Image
                source={require("../../assets/images/Filter.webp")}
                className="h-[24px] w-[24px]"
                resizeMode="contain"
              />
              <Text className="ml-2 text-gray-700 font-medium">{selectedFilter || "All"} ({filteredRequests.length})</Text>
            </TouchableOpacity>

            {showDropdown && (
              <View className="absolute top-10 left-0 z-50 w-40 bg-white border rounded-lg shadow-lg mt-1">
                {['All', 'Collected', 'On way', 'Cancelled', 'Scheduled'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => {
                      setSelectedFilter(status === 'All' ? null : status);
                      setShowDropdown(false);
                    }}
                    className="p-2 border-b"
                  >
                    <Text>{status}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>


      {/* Request List */}
      <ScrollView className="px-4 pt-4 pb-20 bg-white" 
      refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
              {loading && (
             <View className="flex-1  mt-[25%] justify-center items-center ">
                <LottieView
                  source={require('../../assets/lottie/collector.json')} // Ensure you have a valid JSON file
                  autoPlay
                  loop
                  style={{ width: 300, height: 300 }}
                />
              </View>
      )}
     {!loading && filteredRequests.length > 0 ? (
          filteredRequests.map((item, index) => renderRequestItem(item, index))
        ) : (
          !loading &&      
          <View className="flex-1 items-center justify-center">
                      <LottieView
                        source={require("../../assets/lottie/NoComplaints.json")}
                        style={{ width: wp(50), height: hp(50) }}
                        autoPlay
                        loop
                      />
                      <Text className="text-center text-gray-600 mt-4">
                        {t("CollectionRequest.No collection requests found")}
                      </Text>
                    </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
};

export default CollectionRequests;