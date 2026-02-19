import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';

type FormScreenRouteProp = RouteProp<RootStackParamList, 'FormScreen'>;

interface FormScreenProps {
  navigation: FormScreenRouteProp;
}

const FormScreen: React.FC<FormScreenProps> = ({ navigation }) => {
    const scannedData = navigation.params?.scannedData || {}; // Default to empty object if undefined

   
  const [formData, setFormData] = useState<any>(scannedData);

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = () => {
   // console.log('Form submitted:', formData);
    // Handle form submission logic here
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
      <View>
        {Object.keys(formData).map((key) => (
          <View key={key} style={{ marginBottom: 16 }}>
            <Text>{key}</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: 'gray',
                padding: 8,
                borderRadius: 4,
              }}
              value={formData[key]}
              onChangeText={(text) => handleInputChange(key, text)}
            />
          </View>
        ))}
        <Button title="Submit" onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
};

export default FormScreen;

  