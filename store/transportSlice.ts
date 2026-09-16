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

export interface TransportState {
  driverId: number | null;
  driverEmpId: string | null;
  driverName: string | null;
  vehicleId: number | null;
  vehicleNo: string | null;
  centreId: string | null;
  centreName: string | null;
  loadedVarieties: LoadedVarietyItem[];
}

const initialState: TransportState = {
  driverId: null,
  driverEmpId: null,
  driverName: null,
  vehicleId: null,
  vehicleNo: null,
  centreId: null,
  centreName: null,
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
      }>
    ) => {
      state.driverId = action.payload.driverId ?? null;
      state.driverEmpId = action.payload.driverEmpId ?? null;
      state.driverName = action.payload.driverName ?? null;
      state.vehicleId = action.payload.vehicleId ?? null;
      state.vehicleNo = action.payload.vehicleNo ?? null;
    },
    setTransportDestination: (
      state,
      action: PayloadAction<{
        centreId?: string | null;
        centreName?: string | null;
      }>
    ) => {
      state.centreId = action.payload.centreId ?? null;
      state.centreName = action.payload.centreName ?? null;
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
      state.centreId = null;
      state.centreName = null;
      state.loadedVarieties = [];
    },
  },
});

export const {
  setTransportDriver,
  setTransportDestination,
  addLoadedVariety,
  removeLoadedVariety,
  setLoadedVarieties,
  clearTransportLoad,
} = transportSlice.actions;

export default transportSlice.reducer;
