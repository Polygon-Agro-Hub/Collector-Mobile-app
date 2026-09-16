import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface LoadedGradeSet {
  gradeKey: "A" | "B" | "C";
  grade: string;
  set: number;
  crates: number;
  weightKg: number;
}

export interface LoadedVarietyItem {
  id: string;
  varietyNumber: number;
  cropId?: string;
  cropLabel: string;
  varietyId?: string;
  varietyLabel: string;
  imageUri?: string;
  totalWeightKg: number;
  totalCrates: number;
  gradeSets: LoadedGradeSet[];
}

export interface SavedSet {
  id: string;
  gradeKey: "A" | "B" | "C";
  setNumber: number;
  crates: string;
  weight: number;
}

export interface SavedVariety {
  id: string;
  varietyNumber: number;
  cropId?: string;
  cropLabel: string;
  varietyId?: string;
  varietyLabel: string;
  sets: SavedSet[];
}

export interface CrateSetState {
  id: string;
  setNumber: number;
  crates: string;
  weight: number | null;
  isExpanded: boolean;
}

export interface GradeDataState {
  gradeKey: "A" | "B" | "C";
  title: string;
  isSelected: boolean;
  sets: CrateSetState[];
}

export interface CurrentVarietyState {
  varietyIndex: number;
  selectedCrop: { label: string; value: string } | null;
  selectedVariety: { label: string; value: string } | null;
  grades: GradeDataState[];
}

export interface TransportState {
  driverId: number | null;
  driverEmpId: string | null;
  driverName: string | null;
  vehicleId: number | null;
  vehicleNo: string | null;
  vType: string | null;
  vCapacity: string | null;
  centreId: string | null;
  disComCenId: string | null;
  centreName: string | null;
  savedVarieties: SavedVariety[];
  currentVariety: CurrentVarietyState | null;
  loadedVarieties: LoadedVarietyItem[];
}

const initialState: TransportState = {
  driverId: null,
  driverEmpId: null,
  driverName: null,
  vehicleId: null,
  vehicleNo: null,
  vType: null,
  vCapacity: null,
  centreId: null,
  disComCenId: null,
  centreName: null,
  savedVarieties: [],
  currentVariety: null,
  loadedVarieties: [],
};

const transportSlice = createSlice({
  name: "transport",
  initialState,
  reducers: {
    setTransportDriver: (
      state,
      action: PayloadAction<{
        driverId?: number | null;
        driverEmpId?: string | null;
        driverName?: string | null;
        vehicleId?: number | null;
        vehicleNo?: string | null;
        vType?: string | null;
        vCapacity?: string | null;
      }>
    ) => {
      state.driverId = action.payload.driverId ?? null;
      state.driverEmpId = action.payload.driverEmpId ?? null;
      state.driverName = action.payload.driverName ?? null;
      state.vehicleId = action.payload.vehicleId ?? null;
      state.vehicleNo = action.payload.vehicleNo ?? null;
      state.vType = action.payload.vType ?? null;
      state.vCapacity = action.payload.vCapacity ?? null;
    },
    setTransportDestination: (
      state,
      action: PayloadAction<{
        centreId?: string | null;
        disComCenId?: string | null;
        centreName?: string | null;
      }>
    ) => {
      state.centreId = action.payload.centreId ?? null;
      state.disComCenId = action.payload.disComCenId ?? null;
      state.centreName = action.payload.centreName ?? null;
    },
    setSavedVarieties: (
      state,
      action: PayloadAction<SavedVariety[]>
    ) => {
      state.savedVarieties = action.payload;
    },
    setCurrentVariety: (
      state,
      action: PayloadAction<CurrentVarietyState | null>
    ) => {
      state.currentVariety = action.payload;
    },
    addLoadedVariety: (state, action: PayloadAction<LoadedVarietyItem>) => {
      state.loadedVarieties.push(action.payload);
    },
    removeLoadedVariety: (state, action: PayloadAction<string>) => {
      state.loadedVarieties = state.loadedVarieties.filter(
        (item) => item.id !== action.payload
      );
    },
    setLoadedVarieties: (
      state,
      action: PayloadAction<LoadedVarietyItem[]>
    ) => {
      state.loadedVarieties = action.payload;
    },
    clearTransportLoad: (state) => {
      state.driverId = null;
      state.driverEmpId = null;
      state.driverName = null;
      state.vehicleId = null;
      state.vehicleNo = null;
      state.vType = null;
      state.vCapacity = null;
      state.centreId = null;
      state.disComCenId = null;
      state.centreName = null;
      state.savedVarieties = [];
      state.currentVariety = null;
      state.loadedVarieties = [];
    },
  },
});

export const {
  setTransportDriver,
  setTransportDestination,
  setSavedVarieties,
  setCurrentVariety,
  addLoadedVariety,
  removeLoadedVariety,
  setLoadedVarieties,
  clearTransportLoad,
} = transportSlice.actions;

export default transportSlice.reducer;
