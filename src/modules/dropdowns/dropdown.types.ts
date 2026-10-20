export interface DropdownOption {
  id: number;
  name: string;
}

export interface CategoryDropdownOption extends DropdownOption {
  /** Claims in this category ask for a vehicle and its odometer. */
  isVehicleExpense: boolean;
}

export interface VehicleDropdownOption {
  id: number;
  assetNo: string;
  name: string;
  /** Latest odometer reading, to hint the next one. */
  odometerKm: number | null;
}

export interface WhomDropdownOption {
  id: number;
  empName: string;
  employeeCode: string | null;
  status: string;
}

export interface SubCategoryDropdownQuery {
  categoryId: number;
}

export interface SubSubCategoryDropdownQuery {
  categoryId?: number;
  subCategoryId?: number;
}
