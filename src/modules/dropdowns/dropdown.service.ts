import type {
  DropdownOption,
  SubCategoryDropdownQuery,
  SubSubCategoryDropdownQuery,
  WhomDropdownOption,
} from "./dropdown.types";
import { dropdownRepository } from "./dropdown.repository";

class DropdownService {
  async listCategories(): Promise<DropdownOption[]> {
    return dropdownRepository.findActiveCategories();
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

  async listWhom(): Promise<WhomDropdownOption[]> {
    return dropdownRepository.findWhomEmployees();
  }
}

export const dropdownService = new DropdownService();
