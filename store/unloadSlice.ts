import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface UnloadedGradeItem {
  id: string; // e.g. "g-1"
  gradeTitle: string; // e.g. "Grade A"
  loadedWeightKg: number;
  loadedCrates: number;
  unloadedWeightKg: number | null;
  unloadedCrates: number | null;
}

export interface UnloadVarietyItem {
  id: string; // varietyId / loadedItem id
  varietyId?: string;
  name: string;
  image: string;
  weighed: boolean;
  expectedKg: number;
  measuredKg: number;
  expectedCrates: number;
  receivedCrates: number;
  grades: UnloadedGradeItem[];
  hasMismatch?: boolean;
}

export interface UnloadState {
  transportId: string | null;
  loadCode: string | null;
  vehicleNo: string | null;
  driverEmpId: string | null;
  driverName: string | null;
  varieties: UnloadVarietyItem[];
}

const initialState: UnloadState = {
  transportId: null,
  loadCode: null,
  vehicleNo: null,
  driverEmpId: null,
  driverName: null,
  varieties: [],
};

const unloadSlice = createSlice({
  name: "unload",
  initialState,
  reducers: {
    initUnloadTransfer: (
      state,
      action: PayloadAction<{
        transportId?: string | number | null;
        loadCode?: string | null;
        vehicleNo?: string | null;
        driverEmpId?: string | null;
        driverName?: string | null;
        varieties: UnloadVarietyItem[];
      }>
    ) => {
      const newTransportId = action.payload.transportId
        ? String(action.payload.transportId)
        : null;
      const newLoadCode = action.payload.loadCode
        ? String(action.payload.loadCode)
        : null;

      const isSameLoad = Boolean(
        (newTransportId && state.transportId && String(state.transportId) === newTransportId) ||
        (newLoadCode && state.loadCode && state.loadCode === newLoadCode)
      );

      if (isSameLoad && state.varieties && state.varieties.length > 0) {
        // Merge without losing weighed progress
        if (action.payload.vehicleNo) state.vehicleNo = action.payload.vehicleNo;
        if (action.payload.driverEmpId) state.driverEmpId = action.payload.driverEmpId;
        if (action.payload.driverName) state.driverName = action.payload.driverName;

        const existingMap = new Map(state.varieties.map((v) => [String(v.id), v]));
        action.payload.varieties.forEach((newV) => {
          if (!existingMap.has(String(newV.id))) {
            state.varieties.push(newV);
          }
        });
      } else {
        // Fresh initialization
        state.transportId = newTransportId;
        state.loadCode = newLoadCode;
        state.vehicleNo = action.payload.vehicleNo || null;
        state.driverEmpId = action.payload.driverEmpId || null;
        state.driverName = action.payload.driverName || null;
        state.varieties = action.payload.varieties;
      }
    },
    updateVarietyGrades: (
      state,
      action: PayloadAction<{
        varietyId: string;
        grades: UnloadedGradeItem[];
      }>
    ) => {
      const { varietyId, grades } = action.payload;
      const variety = state.varieties.find((v) => v.id === varietyId);
      if (variety) {
        variety.grades = grades;
        const allCompleted =
          grades.length > 0 &&
          grades.every(
            (g) => g.unloadedWeightKg !== null && g.unloadedCrates !== null
          );
        variety.weighed = allCompleted;

        // Recalculate measured total kg and received crates
        variety.measuredKg = grades.reduce(
          (acc, g) => acc + (g.unloadedWeightKg || 0),
          0
        );
        variety.receivedCrates = grades.reduce(
          (acc, g) => acc + (g.unloadedCrates || 0),
          0
        );

        variety.hasMismatch =
          Math.abs(variety.measuredKg - variety.expectedKg) > 0.01 ||
          variety.receivedCrates !== variety.expectedCrates;
      }
    },
    resetVarietyWeighed: (state, action: PayloadAction<string>) => {
      const variety = state.varieties.find((v) => v.id === action.payload);
      if (variety) {
        variety.weighed = false;
        variety.grades = variety.grades.map((g) => ({
          ...g,
          unloadedWeightKg: null,
          unloadedCrates: null,
        }));
        variety.measuredKg = 0;
        variety.receivedCrates = 0;
        variety.hasMismatch = false;
      }
    },
    clearUnloadState: (state) => {
      state.transportId = null;
      state.loadCode = null;
      state.vehicleNo = null;
      state.driverEmpId = null;
      state.driverName = null;
      state.varieties = [];
    },
  },
});

export const {
  initUnloadTransfer,
  updateVarietyGrades,
  resetVarietyWeighed,
  clearUnloadState,
} = unloadSlice.actions;

export default unloadSlice.reducer;
