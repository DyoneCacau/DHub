import { z } from "zod";

export const consultantFormSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome completo").max(160),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "E-mail inválido",
    }),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  document: z.string().trim().max(20).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  user_id: z.string().uuid("Usuário inválido").optional().or(z.literal("")),
});

export type ConsultantFormValues = z.infer<typeof consultantFormSchema>;
