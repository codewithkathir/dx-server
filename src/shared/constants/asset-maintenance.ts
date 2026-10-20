/** Where an odometer reading came from. */
export const OdometerSources = ["manual", "service", "assign", "return", "employee", "expense"] as const;
export type OdometerSource = (typeof OdometerSources)[number];

/** Readings corrected through their service record or expense claim, not deleted on their own. */
export const LinkedOdometerSources: readonly OdometerSource[] = ["service", "expense"];

export const ServiceTypeStatuses = ["active", "inactive"] as const;
export type ServiceTypeStatus = (typeof ServiceTypeStatuses)[number];
