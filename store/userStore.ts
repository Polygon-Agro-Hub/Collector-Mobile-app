import { create } from "zustand";

interface UserStore {
  userRole: string | null;
  token: string | null;
  empId: string | null;
  setUserRole: (role: string) => void;
  setToken: (token: string) => void;
  setEmpId: (empId: string) => void;
}

const useUserStore = create<UserStore>((set) => ({
  userRole: null,
  token: null,
  empId: null,
  setUserRole: (role: string) => set({ userRole: role }),
  setToken: (token: string) => set({ token }),
  setEmpId: (empId: string) => set({ empId }),
}));

export default useUserStore;
