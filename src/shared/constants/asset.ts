export const AssetCategories = [
  "laptop",
  "desktop",
  "phone",
  "tablet",
  "monitor",
  "accessory",
  "vehicle",
  "sim_card",
  "access_card",
  "tools",
  "furniture",
  "other",
] as const;
export type AssetCategory = (typeof AssetCategories)[number];

/** "assigned" is set by assign/return only; admins choose the others. */
export const AssetStatuses = ["available", "assigned", "in_repair", "retired", "lost"] as const;
export type AssetStatus = (typeof AssetStatuses)[number];

/** Statuses an asset can move to when it comes back (or is edited while unassigned). */
export const UnassignedAssetStatuses = ["available", "in_repair", "retired", "lost"] as const;
export type UnassignedAssetStatus = (typeof UnassignedAssetStatuses)[number];

export const AssetConditions = ["new", "good", "fair", "poor", "damaged"] as const;
export type AssetCondition = (typeof AssetConditions)[number];
