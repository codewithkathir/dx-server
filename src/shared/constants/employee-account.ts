/**
 * Employee account (advance / float) entries. Amounts are signed so the
 * balance is SUM(amount): positive = company money the employee holds.
 *  advance    + money given to the employee
 *  expense    − approved claim settled from that money
 *  return     − unused money handed back
 *  adjustment ± correction by an admin
 */
export const AccountEntryTypes = ["advance", "expense", "return", "adjustment"] as const;
export type AccountEntryType = (typeof AccountEntryTypes)[number];

/** Entries an admin records (and may void); "expense" ones follow their claim. */
export const ManualAccountEntryTypes = ["advance", "return", "adjustment"] as const;
export type ManualAccountEntryType = (typeof ManualAccountEntryTypes)[number];
