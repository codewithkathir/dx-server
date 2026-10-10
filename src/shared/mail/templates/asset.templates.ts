import type { MailMessage, MailRecipient } from "../mail.types";
import { formatDate } from "./format";
import { renderEmail } from "./layout";

export interface AssetMailInfo {
  assetNo: string;
  name: string;
  brandModel: string | null;
  serialNo: string | null;
}

const assetRows = (asset: AssetMailInfo): Array<[string, string]> => [
  ["Asset", `${asset.name} (${asset.assetNo})`],
  ...(asset.brandModel ? ([["Make / model", asset.brandModel]] as Array<[string, string]>) : []),
  ...(asset.serialNo ? ([["Serial no.", asset.serialNo]] as Array<[string, string]>) : []),
];

export function assetAssignedEmail(
  to: MailRecipient,
  asset: AssetMailInfo,
  assignment: { assignedDate: string; expectedReturnDate: string | null; condition: string; notes: string | null },
  assetsUrl: string
): MailMessage {
  return {
    to,
    tag: "asset-assigned",
    subject: `Asset assigned to you: ${asset.name}`,
    ...renderEmail({
      preheader: "Please confirm in the app that you received it.",
      heading: "An asset has been assigned to you",
      paragraphs: [
        `Hi ${to.name ?? "there"},`,
        "The company has assigned the asset below to you. Please check it and tap “Confirm received” in the DX app.",
      ],
      details: [
        ...assetRows(asset),
        ["Assigned on", formatDate(assignment.assignedDate)],
        ["Condition", assignment.condition.replace(/^\w/, (c) => c.toUpperCase())],
        ...(assignment.expectedReturnDate
          ? ([["Return by", formatDate(assignment.expectedReturnDate)]] as Array<[string, string]>)
          : []),
      ],
      note: assignment.notes ? { label: "Notes", text: assignment.notes } : undefined,
      button: { label: "Open my assets", url: assetsUrl },
      footnote: "You are responsible for this asset until it is returned. Report loss or damage to your administrator straight away.",
    }),
  };
}

export function assetReturnedEmail(
  to: MailRecipient,
  asset: AssetMailInfo,
  returned: { returnedDate: string; condition: string },
  assetsUrl: string
): MailMessage {
  return {
    to,
    tag: "asset-returned",
    subject: `Asset return recorded: ${asset.name}`,
    ...renderEmail({
      preheader: `Returned on ${formatDate(returned.returnedDate)}.`,
      heading: "Asset return recorded",
      paragraphs: [`Hi ${to.name ?? "there"},`, "Your administrator recorded the return of this asset. It is no longer assigned to you."],
      details: [
        ...assetRows(asset),
        ["Returned on", formatDate(returned.returnedDate)],
        ["Condition", returned.condition.replace(/^\w/, (c) => c.toUpperCase())],
      ],
      button: { label: "Open my assets", url: assetsUrl },
    }),
  };
}
