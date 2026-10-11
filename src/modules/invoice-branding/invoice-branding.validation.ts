import { z } from "zod";
import { BrandingImageKinds } from "./invoice-branding.types";

const optionalName = z
  .string()
  .trim()
  .max(150)
  .transform((value) => value || null)
  .nullable()
  .optional();

export const updateBrandingSchema = z
  .object({
    signatoryName: optionalName,
    signatoryTitle: optionalName,
  })
  .strict();

export const brandingImageParamSchema = z.object({
  kind: z.enum(BrandingImageKinds),
});

export type UpdateBrandingBody = z.infer<typeof updateBrandingSchema>;
export type BrandingImageParam = z.infer<typeof brandingImageParamSchema>;
