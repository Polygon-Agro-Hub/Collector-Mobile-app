import { View } from "react-native";
import ContentLoader, { Rect, Circle } from "react-content-loader/native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

const DashboardSkeleton = () => (
  <View style={{ flex: 1, backgroundColor: "#fff" }}>
    <ContentLoader
      speed={1}
      width="100%"
      height="100%"
      backgroundColor="#f3f3f3"
      foregroundColor="#ecebeb"
    >
      {/* Profile Section */}
      <Circle cx={wp("15%")} cy={hp("8%")} r={hp("5%")} />
      <Rect
        x={wp("30%")}
        y={hp("6.5%")}
        rx="4"
        ry="4"
        width={wp("50%")}
        height={hp("2%")}
      />
      <Rect
        x={wp("30%")}
        y={hp("10%")}
        rx="4"
        ry="4"
        width={wp("30%")}
        height={hp("1.5%")}
      />

      {/* "Keep Going" Card */}
      <Rect
        x={wp("5%")}
        y={hp("15%")}
        rx="10"
        ry="10"
        width={wp("90%")}
        height={hp("8%")}
      />

      {/* Total Weight Section */}
      <Rect
        x={wp("5%")}
        y={hp("30%")}
        rx="10"
        ry="10"
        width={wp("90%")}
        height={hp("12%")}
      />

      {/* Total Farmers Section */}
      <Rect
        x={wp("5%")}
        y={hp("50%")}
        rx="10"
        ry="10"
        width={wp("90%")}
        height={hp("12%")}
      />

      {/* Buttons Section */}
      <Rect
        x={wp("12%")}
        y={hp("74%")}
        rx="10"
        ry="10"
        width={wp("32%")}
        height={hp("15%")}
      />
      <Rect
        x={wp("58%")}
        y={hp("74%")}
        rx="10"
        ry="10"
        width={wp("32%")}
        height={hp("15%")}
      />
    </ContentLoader>
  </View>
);

export default DashboardSkeleton;
