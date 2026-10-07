import { z } from "zod";

export const operatorFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da bandeira").max(80),
  code: z
    .string()
    .trim()
    .min(1, "Informe o código")
    .max(40)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Use letras minúsculas, números, hífen ou sublinhado"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type OperatorFormValues = z.infer<typeof operatorFormSchema>;

export const regionFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da região ou cidade").max(120),
  state: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[A-Za-z]{2}$/.test(value), {
      message: "UF deve ter 2 letras",
    }),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type RegionFormValues = z.infer<typeof regionFormSchema>;
