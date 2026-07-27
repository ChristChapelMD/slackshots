"use client";

import { useUIStore } from "@/stores/ui-store";

export function useGridDensity() {
  const gridDensity = useUIStore((state) => state.gridDensity);
  const setGridDensity = useUIStore((state) => state.setGridDensity);

  return {
    gridDensity,
    setGridDensity,
  };
}
