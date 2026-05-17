export const CatalogStatuses = ["active", "inactive"] as const;
export type CatalogStatus = (typeof CatalogStatuses)[number];
