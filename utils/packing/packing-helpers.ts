/**
 * Packing Helper Utilities for Frontend
 */

export interface PackageItem {
  id: number;
  name: string;
  count?: number;
  qty?: number;
}

export interface PrintStep {
  id: number;
  type: "main" | "package" | "alacarte";
  label: string;
  formattedIndex: string;
  textColor: string;
  circleBgColor: string;
  circleTextColor: string;
  packageId?: number;
  packageIndex?: number;
  packageBoxSubIndex?: number;
  isPrinted?: boolean;
}

/**
 * Calculates total physical package count considering package quantity (pkg.qty)
 */
export const calculateTotalPhysicalPackages = (packagesList: PackageItem[] = []): number => {
  if (!packagesList || packagesList.length === 0) return 0;
  return packagesList.reduce((acc: number, pkg: any) => acc + Math.max(1, Number(pkg.qty || 1)), 0);
};

/**
 * Calculates total physical boxes for an order (Packages + Alacarte)
 */
export const calculateTotalBoxes = (packagesList: PackageItem[] = [], alacarteCount: number = 0): number => {
  const totalPackages = calculateTotalPhysicalPackages(packagesList);
  return totalPackages + (alacarteCount > 0 ? 1 : 0);
};

/**
 * Generates dynamic print steps for QR handling confirmation
 */
export const generatePrintSteps = (
  packagesList: PackageItem[] = [],
  alacarteCount: number = 0
): PrintStep[] => {
  const steps: PrintStep[] = [];
  const totalBoxes = calculateTotalBoxes(packagesList, alacarteCount);

  // 1. Add Main Container if order has more than 1 box
  if (totalBoxes > 1) {
    steps.push({
      id: 1,
      type: "main",
      label: "Main Container",
      formattedIndex: "01",
      textColor: "#000000",
      circleBgColor: "bg-slate-100",
      circleTextColor: "text-black",
    });
  }

  // 2. Add package boxes based on qty
  if (packagesList && packagesList.length > 0) {
    packagesList.forEach((pkg: any, pkgIdx: number) => {
      const pkgQty = Math.max(1, Number(pkg.qty || 1));
      for (let i = 0; i < pkgQty; i++) {
        const stepId = steps.length + 1;
        const formattedIndex = String(stepId).padStart(2, "0");
        const label = pkgQty > 1 ? `${pkg.name} (${i + 1}/${pkgQty})` : pkg.name;
        steps.push({
          id: stepId,
          type: "package",
          label: label,
          formattedIndex,
          textColor: "#980775",
          circleBgColor: "bg-[#fdf4ff]",
          circleTextColor: "text-[#980775]",
          packageId: pkg.id,
          packageIndex: pkgIdx,
          packageBoxSubIndex: i,
        });
      }
    });
  }

  // 3. Add À la carte box if present
  if (alacarteCount > 0) {
    const stepId = steps.length + 1;
    const formattedIndex = String(stepId).padStart(2, "0");
    steps.push({
      id: stepId,
      type: "alacarte",
      label: "À la carte",
      formattedIndex,
      textColor: "#AC7F5E",
      circleBgColor: "bg-[#fdf8f6]",
      circleTextColor: "text-[#AC7F5E]",
    });
  }

  return steps;
};
