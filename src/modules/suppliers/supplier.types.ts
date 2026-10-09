import type { PartyStatus } from "../../shared/constants/finance";
import type { BaseEntity } from "../../shared/types/common.types";
import type { ListQueryOptions } from "../../shared/utils/query-builder";
import type { CreateSupplierBody, UpdateSupplierBody } from "./supplier.validation";

export interface SupplierRow extends BaseEntity {
  company_name: string;
  contact_name_1: string | null;
  contact_name_2: string | null;
  company_address: string | null;
  city_state: string | null;
  country: string | null;
  phone_1: string | null;
  phone_2: string | null;
  email: string | null;
  whatsapp_no: string | null;
  status: PartyStatus;
  comments: string | null;
}

export interface SupplierPublic {
  id: number;
  companyName: string;
  contactName1: string | null;
  contactName2: string | null;
  companyAddress: string | null;
  cityState: string | null;
  country: string | null;
  phone1: string | null;
  phone2: string | null;
  email: string | null;
  whatsappNo: string | null;
  status: PartyStatus;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierOption {
  id: number;
  companyName: string;
}

export type CreateSupplierInput = CreateSupplierBody;
export type UpdateSupplierInput = UpdateSupplierBody;
export interface SupplierListQuery extends ListQueryOptions {}
