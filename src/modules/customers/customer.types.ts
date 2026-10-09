import type { PartyStatus } from "../../shared/constants/finance";
import type { BaseEntity } from "../../shared/types/common.types";
import type { ListQueryOptions } from "../../shared/utils/query-builder";
import type { CreateCustomerBody, UpdateCustomerBody } from "./customer.validation";

export interface CustomerRow extends BaseEntity {
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
  trn: string | null;
  credit_limit: string | null;
  payment_terms: string | null;
  status: PartyStatus;
  comments: string | null;
}

export interface CustomerPublic {
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
  trn: string | null;
  creditLimit: number | null;
  paymentTerms: string | null;
  status: PartyStatus;
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerOption {
  id: number;
  companyName: string;
}

export type CreateCustomerInput = CreateCustomerBody;
export type UpdateCustomerInput = UpdateCustomerBody;
export interface CustomerListQuery extends ListQueryOptions {}
