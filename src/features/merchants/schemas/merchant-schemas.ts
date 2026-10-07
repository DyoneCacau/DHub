import { z } from "zod";

export const merchantFormSchema = z.object({
  legal_name: z.string().trim().min(2, "Informe a razão social").max(200),
  trade_name: z.string().trim().max(200).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "E-mail inválido",
    }),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  consultant_id: z.string().uuid("Selecione o consultor"),
  postal_code: z.string().trim().max(12).optional().or(z.literal("")),
  street: z.string().trim().max(200).optional().or(z.literal("")),
  number: z.string().trim().max(30).optional().or(z.literal("")),
  complement: z.string().trim().max(120).optional().or(z.literal("")),
  district: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z
    .string()
    .trim()
    .max(2, "UF com até 2 caracteres")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type MerchantFormValues = z.infer<typeof merchantFormSchema>;
