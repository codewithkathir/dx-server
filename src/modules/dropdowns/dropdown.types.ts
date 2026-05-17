export interface DropdownOption {
  id: number;
  name: string;
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
