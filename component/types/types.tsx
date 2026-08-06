export type RootStackParamList = {
  BottomNav: undefined;
  Splash: undefined;
  Login: undefined;
  BannedScreen:
    | {
        statusType: string;
        message?: string;
      }
    | undefined;
  ChangePassword: undefined;
  Registeredfarmer: undefined;
  Ufarmercropdetails: undefined;
  CollectionOfficerDashboard: undefined;
  SideMenu: undefined;
  ReadytoPickupOrders: undefined;
  SinChangePassword: undefined;
  SinLogin: undefined;
  Lanuage: undefined;
  PdfViewer: {
  uri: string;
};
  SinDashboard: undefined;
  SinUfarmercropdetails: undefined;
  SinRegisteredfarmer: undefined;
  TamChangePassword: undefined;
  TamLogin: undefined;
  TamDashboard: undefined;
  TamRegisteredfarmer: undefined;
  TamUfarmercropdetails: undefined;
  TransportComponent: undefined;
  SinProfile: undefined;
  OfficerQr: undefined;
  TamProfile: undefined;
  SearchPriceScreen: undefined;
  PrivacyPolicy: undefined;
  CollectionOfficersList: undefined;
  RegisterDriver: undefined;
  DailyTargetList: undefined;
  ComplainHistory: undefined;
  ClaimOfficer: undefined;
  ClaimDistribution: { activeTab?: "Officers" | "Drivers" };
  TransactionList: {
    empId: string;
  };
  DailyTarget: undefined;
  TargetValidPeriod: undefined;
  NoCollectionCenterScreen: undefined;
  EditTargetScreen: undefined;
  PassTargetScreen: undefined;
  RecieveTargetScreen: undefined;
  EditTargetManager: undefined;
  PassTargetBetweenOfficers: undefined;
  RecieveTargetBetweenOfficers: undefined;
  ManagerDashboard: undefined;
  CenterTarget: undefined;
  ManagerTransactions: undefined;
  SearchFarmerScreen: undefined;
  DistridutionaDashboard: undefined;
  PurchaseShortage: undefined;
  PurchaseProduct: { product?: any } | undefined;
  DistributionOfficersList: undefined;
  ReceivedCash: undefined;
  ReceivedCashOfficer: undefined;
  ReceivedCashTransfer: {
  totalCash: number;
  selectedDate: string;
  pickupOrderIds: (string | undefined)[];
};
  CameraAccess: undefined;
  QRScanner: {
    userId: any;
  };
  FormScreen: {
    scannedData: any;
  };
  UnregisteredFarmerDetails: {
    cropCount: 1;
    userId: number;
  };
  UnregisteredCropDetails: {
    userId: number;
    cropCount: number;
    farmerPhone: number;
    farmerLanguage: string;
  };
  SinUnregisteredCropDetails: {
    cropCount: number;
  };
  TamUnregisteredCropDetails: {
    cropCount: number;
    userId: any;
  };
  SearchFarmer: {
    NICnumber: string;
    userId: any;
  };
  FarmerQr: {
    cropCount?: number;
    userId: any;
    NICnumber?: string;
  };
  ComplainPage: {
    farmerName: any;
    farmerPhone: any;
    userId: number;
    farmerLanguage: string;
  };
  Profile: {
    jobRole: string;
  };
  ReportPage: {
    userId: string;
    registeredFarmerId: Number;
  };
  PriceChart: {
    varietyId: string;
    cropName: string;
    varietyName: string;
  };
  PriceChartManager: {
    varietyId: string;
    cropName: string;
    varietyName: string;
  };
  Main: {
    screen: keyof RootStackParamList;
    params?: any;
  };
  AddVehicleDetails: {
    basicDetails: OfficerBasicDetailsFormData;
    jobRole: string;
    empType: string;
    preferredLanguages: string[];
    addressDetails: FormData;
    type: "Permanent" | "Temporary";
  };
  AddDriverAddressDetails: {
    formData: {
      [key: string]: any;
    };
    type: string;
    preferredLanguages: string[];
    jobRole: string;
  };
  OfficerSummary: {
    officerId: string;
    officerName: string;
    phoneNumber1: string;
    phoneNumber2: string;
    collectionOfficerId: number;
    image: string;
  };
  DistributionOfficerSummary: {
    officerId: string;
    officerName: string;
    phoneNumber1: string;
    phoneNumber2: string;
    collectionOfficerId: number;
    image: string;
  };
  ReportGenerator: {
    officerId: string;
    collectionOfficerId: number;
    phoneNumber2: number;
    officerName: string;
    phoneNumber1: number;
  };
  AddOfficer: {
    jobRolle: string;
  };
  DistributionAddOfficer: {
    jobRolle: string;
  };
  FarmerReport: {
    registeredFarmerId: number;
    userId: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    NICnumber: string;
    totalAmount: number;
    bankAddress: string | null;
    accountNumber: string | null;
    accountHolderName: string | null;
    bankName: string | null;
    branchName: string | null;
    selectedDate: string;
    empId: string;
  };
  SetTargetScreen: {
    fromDate: string;
    toDate: string;
    fromTime: string;
    toTime: string;
  };
  OTPE: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    NICnumber: string;
    district: string;
    accNumber: string;
    accHolderName: string;
    bankName: string;
    branchName: string;
    PreferdLanguage: string;
  };
  NewReport: {
    userId: any;
    registeredFarmerId: number;
  };
  TransactionReport: {
    registeredFarmerId: number;
    userId: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    NICnumber: string;
    totalAmount: number;
    bankAddress: string | null;
    accountNumber: string | null;
    accountHolderName: string | null;
    bankName: string | null;
    branchName: string | null;
    selectedDate: string;
    selectedTime: string;
    empId: string;
  };
  DailyTargetListForOfficers: {
    officerId: string;
    collectionOfficerId: number;
    officerName: string;
    phoneNumber1: string;
    phoneNumber2: string;
    image: string;
  };

  RegisterFarmer: {
    NIC: string;
  };
  OTPverification: {
    firstName: string;
    lastName: string;
    NICnumber: string;
    accNumber: string;
    accHolderName: string;
    bankName: string;
    branchName: string;
    phoneNumber: string;
    district: string;
    PreferdLanguage: string;
  };
  CollectionRequestForm: {
    NICnumber: string;
    id: number;
  };
  CollectionRequests: {
    requestId: number;
    crops: string;
  };
  ViewScreen: {
    requestId: number;
    crops: string;
  };
  Cancelreson: {
    requestId: number;
    status: string;
  };
  UpdateFarmerBankDetails: {
    id: number;
    NICnumber: string;
  };
  ReviewCollectionRequests: {
    cropsList: any[];
    address: {
      buildingNo: string;
      streetName: string;
      city: string;
      routeNumber: string;
    };
    scheduleDate: string;
    farmerId: number;
  };
  otpBankDetailsupdate: {
    accNumber: string;
    accHolderName: string;
    bankName: string;
    branchName: string;
    phoneNumber: string;
    PreferdLanguage: string;
    farmerId: number;
    officerRole: string;
  };

  CompletedOrderScreen: {
    item: string;
    centerCode: string;
  };
  ReceivedCashQrCode: {
    selectedTransactions?: Array<{
      id: string;
      orderId: string;
      cash: number;
    }>;
    fromScreen?: string;
  };

  DigitalSignature: {
    orderId: Number;
    fromScreen: string;
  };
  DistributionOfficerReport: {
    officerId: string;
    collectionOfficerId: number;
    officerName: string;
    phoneNumber1: string;
    phoneNumber2: string;
    image: string;
  };
  qrcode: {
    expectedOrderId?: string;
    fromScreen?: string;
  };
  ViewPickupOrders: {
    order: Order;
    orderId: string;
  };
  GoviPensionForm: {
    farmerNIC: string;
    farmerPhone: string;
    userId: any;
  };
  GoviPensionStatus: {
    status: string;
    creatAt: string;
  };
  NotEligibleScreen: undefined;
};

export interface OrderItem {
  invoiceNo: string;
  varietyNameEnglish: string;
  grade: string;
  target: number;
  complete: number;
  todo: number;
  status: string;
  completedTime?: string | null;
}

export interface Order {
  orderId: string;
  userId: number;
  orderApp: string;
  createdAt: string;
  delivaryMethod: string;
  fullTotal: number;
  total: number;
  buildingType: string;
  sheduleDate: string;
  sheduleTime: string;
  processOrderId: number;
  invNo: string;
  transactionId: string;
  paymentMethod: string;
  remainingAmount: number;
  isFullyPaid: number;
  isPaid: boolean;
  amount: number;
  status: string;
  cusId: string;
  title: string;
  firstName: string;
  lastName: string;
  phoneCode: string;
  phoneNumber: string;
  phoneCode2: string;
  phoneNumber2: string;
  email: string;
  buyerType: string;
  companyName: string;
  companyPhoneCode: string;
  companyPhone: string;
  customerCity: string;
  houseNo: string;
  streetName: string;
  distributionDistrict: string;
  centerName: string;
  regCode: string;
  officerFirstName: string;
  officerLastName: string;
  fullName: string;
  outDlvrDate: string;
}

export type OfficerBasicDetailsFormData = {
  userId: string;
  firstNameEnglish: string;
  lastNameEnglish: string;
  firstNameSinhala?: string;
  lastNameSinhala?: string;
  firstNameTamil?: string;
  lastNameTamil?: string;
  nicNumber: string;
  email: string;
  jobRole: string;
  phoneCode1: string;
  phoneNumber1: string;
  phoneCode2?: string;
  phoneNumber2?: string;
  profileImage?: string;
};
