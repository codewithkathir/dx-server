import type {
  CategoryDropdownOption,
  DropdownOption,
  VehicleDropdownOption,
  VehicleWorkOption,
  SubCategoryDropdownQuery,
  SubSubCategoryDropdownQuery,
  WhomDropdownOption,
} from "./dropdown.types";
import { dropdownRepository } from "./dropdown.repository";
import { countryService } from "../countries/country.service";
import type { CountryOption } from "../countries/country.types";
import { productService } from "../products/product.service";
import type { ProductOption } from "../products/product.types";

class DropdownService {
  async listCategories(): Promise<CategoryDropdownOption[]> {
    return dropdownRepository.findActiveCategories();
  }

  async listVehicles(employeeId?: number): Promise<VehicleDropdownOption[]> {
    return dropdownRepository.findVehicles(employeeId);
  }

  /** One entry per service type: the first category mapped to it (sub categories before sub-sub). */
  async listVehicleWork(): Promise<VehicleWorkOption[]> {
    const seen = new Set<number>();
    return (await dropdownRepository.findVehicleWork()).filter((w) => {
      if (seen.has(w.serviceTypeId)) return false;
      seen.add(w.serviceTypeId);
      return true;
    });
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

  async listProducts(): Promise<ProductOption[]> {
    return productService.listActiveOptions();
  }

  async listCountries(): Promise<CountryOption[]> {
    return countryService.listActive();
  }

  async listWhom(): Promise<WhomDropdownOption[]> {
    return dropdownRepository.findWhomEmployees();
  }
}

export const dropdownService = new DropdownService();
