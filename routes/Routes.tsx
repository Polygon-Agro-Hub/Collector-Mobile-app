import { useEffect, useState, useMemo } from "react";
import { Alert } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSelector } from "react-redux";
import { RootState } from "../services/reducxStore";
import { ROLES } from "@/constants/user-roles";
import { navigationRef } from "../navigationRef";
import store from "@/services/reducxStore";
import { logoutUser } from "../store/authSlice";
import BottomNav from "@/component/components/navigations/BottomNav";

// --- Screens ---
import Login from "@/component/common/auth/Login";
import BannedScreen from "@/component/common/auth/BannedScreen";
import ChangePassword from "@/component/common/auth/ChangePassword";
import Registeredfarmer from "@/component/collection/collection-common/farmer/Registeredfarmer";
import Ufarmercropdetails from "@/component/collection/collection-common/farmer/Ufarmercropdetails";
import CollectionOfficerDashboard from "@/component/collection/collection-officer/dashboard/CollectionOfficerDashboard";
import QRScanner from "@/component/collection/collection-common/farmer/QRScanner";
import UnregisteredFarmerDetails from "@/component/collection/collection-common/farmer/UnregisteredFarmerForm";
import UnregisteredCropDetails from "@/component/collection/collection-common/farmer/UnregisteredCropDetails";
import SearchFarmer from "@/component/collection/collection-common/farmer/SearchFarmer";
import FarmerQr from "@/component/collection/collection-common/farmer/FarmerQr";
import ComplainPage from "@/component/common/complain/ComplainPage";
import Profile from "@/component/common/auth/Profile";
import ReportPage from "@/component/collection/collection-common/goods-received-note/ReportPage";
import SearchPriceScreen from "@/component/collection/collection-common/search-price/SearchPriceScreen";
import PriceChart from "@/component/collection/collection-officer/price-chart/PriceChart";
import PriceChartManager from "@/component/collection/collection-center-manager/price-chart/PriceChartManager";
import CollectionOfficersList from "@/component/collection/collection-center-manager/manage-collection-officers/CollectionOfficersList";
import OfficerSummary from "@/component/collection/collection-center-manager/manage-collection-officers/OfficerSummary";
import ReportGenerator from "@/component/collection/collection-center-manager/officers-reports/ReportGenerator";
import ComplainHistory from "@/component/common/complain/ComplainHistory";
import DailyTargetList from "@/component/collection/collection-common/daily-target/DailyTargetList";
import AddOfficer from "@/component/collection/collection-center-manager/manage-collection-officers/AddOfficer";
import ClaimOfficer from "@/component/collection/collection-center-manager/manage-collection-officers/ClaimOfficer";
import TransactionList from "@/component/collection/collection-center-manager/transaction-list/TransactionList";
import DailyTarget from "@/component/collection/collection-center-manager/daily-target/DailyTarget";
import NoCollectionCenterScreen from "@/component/collection/collection-common/disclaim-status/NoCollectionCenterScreen";
import EditTargetScreen from "@/component/collection/collection-center-manager/officers-targets/EditTargetScreen";
import PassTargetScreen from "@/component/collection/collection-center-manager/daily-target/PassTargetScreen";
import RecieveTargetScreen from "@/component/collection/collection-center-manager/daily-target/RecieveTargetScreen";
import DailyTargetListForOfficers from "@/component/collection/collection-center-manager/officers-targets/DailyTargetListForOfficers";
import EditTargetManager from "@/component/collection/collection-center-manager/daily-target/EditTargetManager";
import RecieveTargetBetweenOfficers from "@/component/collection/collection-center-manager/officers-targets/RecieveTargetBetweenOfficers";
import PassTargetBetweenOfficers from "@/component/collection/collection-center-manager/officers-targets/PassTargetBetweenOfficers";
import OTPE from "@/component/collection/collection-common/farmer/FarmerOTPVerification";
import ManagerDashboard from "@/component/collection/collection-center-manager/dashboard/ManagerDashboard";
import CenterTarget from "@/component/collection/collection-center-manager/center-target/CenterTarget";
import ManagerTransactions from "@/component/collection/collection-center-manager/transaction-list/ManagerTransactions";
import NewReport from "@/component/collection/collection-common/goods-received-note/NewReport";
import TransactionReport from "@/component/collection/collection-center-manager/transaction-list/TransactionReport";
import UpdateFarmerBankDetails from "@/component/collection/collection-common/farmer-bank-details/UpdateFarmerBankDetails";
import otpBankDetailsupdate from "@/component/collection/collection-common/farmer-bank-details/otpBankDetailsupdate";
import DistributionDashboard from "@/component/distribution/distribution-common/dashboard/DistributionDashboard";
import PurchaseShortage from "@/component/distribution/distribution-common/purchase-shortage/PurchaseShortage";
import PurchaseProduct from "@/component/distribution/distribution-common/purchase-shortage/PurchaseProduct";
import DistributionOfficersList from "@/component/distribution/distribution-center-manager/manage-officers/DistributionOfficersList";
import ClaimDistribution from "@/component/distribution/distribution-center-manager/manage-officers/ClaimDistribution";
import ReadytoPickupOrders from "@/component/distribution/distribution-common/pick-up-orders/ReadytoPickupOrders";
import ViewPickupOrders from "@/component/distribution/distribution-common/pick-up-orders/ViewPickupOrders";
import Qrcode from "@/component/distribution/distribution-common/pick-up-orders/qrcode";
import DigitalSignature from "@/component/distribution/distribution-common/pick-up-orders/DigitalSignature";
import ReceivedCash from "@/component/distribution/distribution-center-manager/received-cash/ReceivedCash";
import ReceivedCashTransfer from "@/component/distribution/distribution-center-manager/received-cash/ReceivedCashTransfer";
import ReceivedCashOfficer from "@/component/distribution/distribution-officer/received-cash/ReceivedCashOfficer";
import ReceivedCashQrCode from "@/component/distribution/distribution-officer/received-cash/ReceivedCashQrCode";
import GoviPensionForm from "@/component/collection/collection-common/govi-pension/GoviPensionForm";
import GoviPensionStatus from "@/component/collection/collection-common/govi-pension/GoviPensionStatus";
import NotEligibleScreen from "@/component/collection/collection-common/govi-pension/NotEligibleScreen";
import Splash from "@/component/common/auth/Splash";
import Lanuage from "@/component/common/lanuage/Lanuage";
import OfficerQr from "@/component/common/auth/OfficerQrCode";
import SideMenu from "@/component/components/navigations/SideMenu";
import PrivacyPolicy from "@/component/common/privacy-policy/PrivacyPolicy";
import LoadingPage from "@/component/components/loading/LoadingPage";
import DistributionAddOfficer from "@/component/distribution/distribution-center-manager/manage-officers/DistributionAddOfficer";
import SelectRow from "@/component/distribution/distribution-common/pack/select-row/SelectRow";
import QRHandling from "@/component/distribution/distribution-common/pack/qr-handling/QRHandling";
import ReadyToPrint from "@/component/distribution/distribution-common/pack/qr-handling/ReadyToPrint";
import PrintingConfirmation from "@/component/distribution/distribution-common/pack/qr-handling/PrintingConfirmation";
import WelcomeToPacking from "@/component/distribution/distribution-common/pack/packing/WelcomeToPacking";
import Packing from "@/component/distribution/distribution-common/pack/packing/Packing";
import WelcomeToQC from "@/component/distribution/distribution-common/pack/qc-position/WelcomeToQC";
import Group from "@/component/distribution/distribution-center-manager/assign-groups/Group";
import SelectOrder from "@/component/distribution/distribution-center-manager/assign-groups/SelectOrder";
import SelectRowToAssign from "@/component/distribution/distribution-center-manager/assign-groups/SelectRowToAssign";
import ConfirmRowAssign from "@/component/distribution/distribution-center-manager/assign-groups/ConfirmRowAssign";
import DistributionCenterTarget from "@/component/distribution/distribution-common/center-target/DistributionCenterTarget";
import OrderDetails from "@/component/distribution/distribution-common/center-target/OrderDetails";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export type AllowedRole = typeof ROLES[keyof typeof ROLES] | "PUBLIC";

interface TabRouteConfig {
  name: string;
  component: React.ComponentType<any>;
  allowedRoles: AllowedRole[] | "PUBLIC";
  options?: any;
}

interface StackRouteConfig {
  name: string;
  component: React.ComponentType<any>;
  allowedRoles: AllowedRole[] | "PUBLIC";
  options?: any;
}

/**
 * Fallback route used when a signed-in user tries to reach a screen
 * their role isn't allowed to see and there's nowhere sensible to go back to.
 */
const UNAUTHORIZED_FALLBACK_ROUTE = "Login";

/**
 * Wraps a screen component with a role check. If the current jobRole
 * (from Redux) is not included in allowedRoles, the user sees an
 * "Access Denied" alert and gets bounced back / to the fallback route,
 * instead of the protected screen ever rendering.
 *
 * allowedRoles === "PUBLIC" means the screen is reachable regardless of
 * role (or with no role at all, e.g. pre-login screens).
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: AllowedRole[] | "PUBLIC"
) {
  function GuardedScreen(props: P & { navigation?: any }) {
    const jobRole = useSelector((state: RootState) => state.auth.jobRole);

    const isAllowed =
      allowedRoles === "PUBLIC" ||
      (!!jobRole && (allowedRoles as string[]).includes(jobRole));

    useEffect(() => {
      if (isAllowed) {
        return;
      }

      const navigation = (props as any)?.navigation;

      Alert.alert(
        "Access Denied",
        "You don't have permission to view this screen.",
        [
          {
            text: "OK",
            onPress: () => {
              if (navigation?.canGoBack?.()) {
                navigation.goBack();
                return;
              }
              if (navigationRef.isReady()) {
                navigationRef.reset({
                  index: 0,
                  routes: [{ name: UNAUTHORIZED_FALLBACK_ROUTE }],
                });
              }
            },
          },
        ],
        { cancelable: false }
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAllowed]);

    if (!isAllowed) {
      // Render nothing while the alert/redirect above is in flight.
      return null;
    }

    return <Component {...(props as P)} />;
  }

  GuardedScreen.displayName = `withRoleGuard(${
    Component.displayName || Component.name || "Component"
  })`;

  return GuardedScreen;
}

// --- Bottom tab screens (inside the "Main" stack screen) ---
const TAB_SCREENS: TabRouteConfig[] = [
  {
    name: "ManagerDashboard",
    component: ManagerDashboard as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "SearchPriceScreen",
    component: SearchPriceScreen as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "PriceChart",
    component: PriceChart as any,
    allowedRoles: [ROLES.COLLECTION_OFFICER],
  },
  {
    name: "SearchFarmer",
    component: SearchFarmer as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "DailyTargetList",
    component: DailyTargetList as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "DailyTarget",
    component: DailyTarget as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "PassTargetScreen",
    component: PassTargetScreen as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "ComplainHistory",
    component: ComplainHistory as any,
    allowedRoles: "PUBLIC",
  },
  {
    name: "TransactionList",
    component: TransactionList as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "OfficerSummary",
    component: OfficerSummary as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "ViewPickupOrders",
    component: ViewPickupOrders as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },
  {
    name: "ReportGenerator",
    component: ReportGenerator as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "CollectionOfficerDashboard",
    component: CollectionOfficerDashboard as any,
    allowedRoles: [ROLES.COLLECTION_OFFICER],
  },
  {
    name: "UpdateFarmerBankDetails",
    component: UpdateFarmerBankDetails as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "DistridutionaDashboard",
    component: DistributionDashboard as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },
  {
    name: "PurchaseShortage",
    component: PurchaseShortage as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },
  {
    name: "PriceChartManager",
    component: PriceChartManager as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "UnregisteredCropDetails",
    component: UnregisteredCropDetails as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "otpBankDetailsupdate",
    component: otpBankDetailsupdate as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "CollectionOfficersList",
    component: CollectionOfficersList as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "RecieveTargetScreen",
    component: RecieveTargetScreen as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "EditTargetManager",
    component: EditTargetManager as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "ReadytoPickupOrders",
    component: ReadytoPickupOrders as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },
  {
    name: "ReceivedCashOfficer",
    component: ReceivedCashOfficer as any,
    allowedRoles: [ROLES.DISTRIBUTION_OFFICER],
  },
  {
    name: "UnregisteredFarmerDetails",
    component: UnregisteredFarmerDetails as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "ManagerTransactions",
    component: ManagerTransactions as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "DailyTargetListForOfficers",
    component: DailyTargetListForOfficers as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "DistributionOfficersList",
    component: DistributionOfficersList as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },
  {
    name: "ClaimOfficer",
    component: ClaimOfficer as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "ClaimDistribution",
    component: ClaimDistribution as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },
  {
    name: "OTPE",
    component: OTPE as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "DistributionAddOfficer",
    component: DistributionAddOfficer as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },
  {
    name: "EditTargetScreen",
    component: EditTargetScreen as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "PassTargetBetweenOfficers",
    component: PassTargetBetweenOfficers as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "SideMenu",
    component: SideMenu as any,
    allowedRoles: "PUBLIC",
  },
  {
    name: "OfficerQr",
    component: OfficerQr as any,
    allowedRoles: "PUBLIC",
  },
  {
    name: "AddOfficer",
    component: AddOfficer as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "FarmerQr",
    component: FarmerQr as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "CenterTarget",
    component: CenterTarget as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
  {
    name: "DistributionCenterTarget",
    component: DistributionCenterTarget as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },
  {
    name: "ComplainPage",
    component: ComplainPage as any,
    allowedRoles: "PUBLIC",
  },
  {
    name: "RecieveTargetBetweenOfficers",
    component: RecieveTargetBetweenOfficers as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },
];

export function MainTabNavigator() {
  const jobRole = useSelector((state: RootState) => state.auth.jobRole);

  useEffect(() => {
    const knownRole =
      jobRole === ROLES.DISTRIBUTION_OFFICER ||
      jobRole === ROLES.DISTRIBUTION_MANAGER ||
      jobRole === ROLES.COLLECTION_OFFICER ||
      jobRole === ROLES.COLLECTION_MANAGER;

    if (jobRole && !knownRole) {
      store.dispatch(logoutUser());
    }
  }, [jobRole]);

  const filteredScreens = useMemo(() => {
    return TAB_SCREENS.filter(
      (screen) =>
        screen.allowedRoles === "PUBLIC" ||
        (jobRole && (screen.allowedRoles as string[]).includes(jobRole))
    );
  }, [jobRole]);

  // Preferred landing tab per role. This is only a preference — the
  // actual initialRouteName below always falls back to whatever is
  // really present in filteredScreens, so it can never point at a
  // screen that hasn't been rendered yet.
  const preferredInitialTab = useMemo(() => {
    if (
      jobRole === ROLES.DISTRIBUTION_OFFICER ||
      jobRole === ROLES.DISTRIBUTION_MANAGER
    ) {
      return "DistridutionaDashboard";
    }
    if (jobRole === ROLES.COLLECTION_OFFICER) {
      return "CollectionOfficerDashboard";
    }
    if (jobRole === ROLES.COLLECTION_MANAGER) {
      return "ManagerDashboard";
    }
    return undefined;
  }, [jobRole]);

  // Don't mount Tab.Navigator until we actually know the role (e.g.
  // persisted auth state is still rehydrating). Rendering it earlier
  // means filteredScreens only has the "PUBLIC" tabs, which can be a
  // set that doesn't include the hardcoded initial route — that's what
  // throws "Couldn't find a screen named ... to use as initialRouteName".
  if (!jobRole || filteredScreens.length === 0) {
    return <LoadingPage />;
  }

  const initialRouteName =
    preferredInitialTab &&
    filteredScreens.some((screen) => screen.name === preferredInitialTab)
      ? preferredInitialTab
      : filteredScreens[0].name;

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: false,
        tabBarStyle: { position: "absolute", backgroundColor: "#ffffff" },
      })}
      tabBar={(props) => <BottomNav {...props} />}
    >
      {filteredScreens.map((screen: TabRouteConfig) => (
        <Tab.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={screen.options}
        />
      ))}
    </Tab.Navigator>
  );
}

/**
 * Config for every screen registered on the root Stack.Navigator
 * (i.e. everything outside the bottom-tab "Main" navigator).
 *
 * "PUBLIC" is used for screens that must stay reachable regardless of
 * role — auth/onboarding screens, the tab container itself, and shared
 * utility screens (loading, privacy policy, etc). Everything else is
 * locked to the roles that should legitimately be able to open it.
 *
 * NOTE: allowedRoles for the distribution/collection-flow screens
 * (packing, assign-groups, pickup orders, GoviPension, etc.) were
 * inferred from folder location / naming. Double check these against
 * your real permission model — the guard logic itself doesn't need to
 * change, only this config.
 */
const STACK_SCREENS_CONFIG: StackRouteConfig[] = [
  { name: "Splash", component: Splash, allowedRoles: "PUBLIC" },
  { name: "Login", component: Login, allowedRoles: "PUBLIC" },
  { name: "BannedScreen", component: BannedScreen as any, allowedRoles: "PUBLIC" },
  { name: "Lanuage", component: Lanuage, allowedRoles: "PUBLIC" },

  { name: "Profile", component: Profile, allowedRoles: "PUBLIC" },
  {
    name: "ReportPage",
    component: ReportPage,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "NewReport",
    component: NewReport as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "qrcode",
    component: Qrcode as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },
  { name: "PrivacyPolicy", component: PrivacyPolicy, allowedRoles: "PUBLIC" },

  {
    name: "QRScanner",
    component: QRScanner,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  { name: "ChangePassword", component: ChangePassword as any, allowedRoles: "PUBLIC" },
  {
    name: "Registeredfarmer",
    component: Registeredfarmer,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "Ufarmercropdetails",
    component: Ufarmercropdetails,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },

  {
    name: "ReceivedCashQrCode",
    component: ReceivedCashQrCode as any,
    allowedRoles: [ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "NoCollectionCenterScreen",
    component: NoCollectionCenterScreen,
    allowedRoles: "PUBLIC",
  },

  {
    name: "Main",
    component: MainTabNavigator,
    allowedRoles: "PUBLIC",
  },

  {
    name: "TransactionReport",
    component: TransactionReport as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER],
  },

  {
    name: "SelectRow",
    component: SelectRow as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "QRHandling",
    component: QRHandling as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "ReadyToPrint",
    component: ReadyToPrint as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "PrintingConfirmation",
    component: PrintingConfirmation as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "WelcomeToPacking",
    component: WelcomeToPacking as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "Packing",
    component: Packing as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "WelcomeToQC",
    component: WelcomeToQC as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "Group",
    component: Group as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "SelectOrder",
    component: SelectOrder as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "SelectRowToAssign",
    component: SelectRowToAssign as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "ConfirmRowAssign",
    component: ConfirmRowAssign as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "DistributionCenterTarget",
    component: DistributionCenterTarget as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "OrderDetails",
    component: OrderDetails as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "DigitalSignature",
    component: DigitalSignature as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER, ROLES.DISTRIBUTION_OFFICER],
  },

  {
    name: "ReceivedCash",
    component: ReceivedCash as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "ReceivedCashTransfer",
    component: ReceivedCashTransfer as any,
    allowedRoles: [ROLES.DISTRIBUTION_MANAGER],
  },

  {
    name: "GoviPensionForm",
    component: GoviPensionForm as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "GoviPensionStatus",
    component: GoviPensionStatus as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  {
    name: "NotEligibleScreen",
    component: NotEligibleScreen as any,
    allowedRoles: [ROLES.COLLECTION_MANAGER, ROLES.COLLECTION_OFFICER],
  },
  { name: "LoadingPage", component: LoadingPage as any, allowedRoles: "PUBLIC" },
];

/**
 * The actual list handed to Stack.Navigator — every raw screen component
 * pre-wrapped with the role guard, computed once at module load.
 */
const STACK_SCREENS: StackRouteConfig[] = STACK_SCREENS_CONFIG.map((screen) => ({
  ...screen,
  component: withRoleGuard(screen.component, screen.allowedRoles),
}));

/**
 * Root Stack.Navigator. App.tsx renders this inside its
 * NavigationContainer — it only needs to know about this one component,
 * not any individual screen.
 */
export function RootStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
      }}
    >
      {STACK_SCREENS.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={screen.component}
          options={screen.options}
        />
      ))}
    </Stack.Navigator>
  );
}

export default RootStackNavigator;