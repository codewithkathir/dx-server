export { mailService } from "./mail.service";
export type { MailMessage, MailRecipient } from "./mail.types";
export { passwordChangedEmail, passwordResetEmail } from "./templates/auth.templates";
export { claimApprovedEmail, claimPaidEmail, claimRejectedEmail, type ClaimSummary } from "./templates/expense.templates";
export { assetAssignedEmail, assetReturnedEmail, type AssetMailInfo } from "./templates/asset.templates";
