import React, { useState } from "react";
import { View, ScrollView, BackHandler } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "@/types/types";
import { useTranslation } from "react-i18next";
import { useFocusEffect } from "@react-navigation/native";
import CustomHeader from "@/component/components/navigations/CustomHeader";
import { ScaleConnectionGuideCard } from "@/component/components/scale/ScaleConnectionGuideCard";
import { ScaleSelectModal } from "@/component/components/popup/ScaleSelectModal";

type ScaleConnectionGuideNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ScaleConnectionGuide"
>;

interface ScaleConnectionGuideScreenProps {
  navigation: ScaleConnectionGuideNavigationProp;
}

const ScaleConnectionGuideScreen: React.FC<ScaleConnectionGuideScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [isScaleSelectModalVisible, setIsScaleSelectModalVisible] = useState<boolean>(false);

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.goBack();
        return true;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [navigation])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <CustomHeader
        title={t("ScaleConnectionGuide.HeaderTitle", "Scale Connection Guide")}
        showBackButton={true}
        navigation={navigation}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <ScaleConnectionGuideCard
          onConnectScale={() => setIsScaleSelectModalVisible(true)}
        />
      </ScrollView>

      {/* Scale Connection / Select Modal */}
      <ScaleSelectModal
        visible={isScaleSelectModalVisible}
        onClose={() => setIsScaleSelectModalVisible(false)}
      />
    </View>
  );
};

export default ScaleConnectionGuideScreen;
