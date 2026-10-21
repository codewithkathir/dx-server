import type {
  CategoryDropdownOption,
  DropdownOption,
  VehicleDropdownOption,
  SubCategoryDropdownQuery,
  SubSubCategoryDropdownQuery,
  WhomDropdownOption,
} from "./dropdown.types";
import { dropdownRepository } from "./dropdown.repository";
import { countryService } from "../countries/country.service";
import type { CountryOption } from "../countries/country.types";

class DropdownService {
  async listCategories(): Promise<CategoryDropdownOption[]> {
    return dropdownRepository.findActiveCategories();
  }

  async listVehicles(employeeId?: number): Promise<VehicleDropdownOption[]> {
    return dropdownRepository.findVehicles(employeeId);
  }

  async listSubCategories(
    query: SubCategoryDropdownQuery
  ): Promise<DropdownOption[]> {
    return dropdownRepository.findActiveSubCategories(query);
  }

  async listSubSubCategories(
    query: SubSubCategoryDropdownQuery
  ): Promise<DropdownOption[]> {
    return dropdownRepository.findActiveSubSubCategories(query);
  }

  async listPaymentMethods(): Promise<DropdownOption[]> {
    return dropdownRepository.findActivePaymentMethods();
  }

  async listCountries(): Promise<CountryOption[]> {
    return countryService.listActive();
  }

  async listWhom(): Promise<WhomDropdownOption[]> {
    return dropdownRepository.findWhomEmployees();
  }
}

export const dropdownService = new DropdownService();
