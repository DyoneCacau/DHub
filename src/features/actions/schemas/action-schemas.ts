import { z } from "zod";

import { parseMoney } from "@/features/actions/utils/format";

const moneyField = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(parseMoney(value)), {
    message: "Valor inválido (ex.: 1.234,56)",
  });

const optionalDate = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), { message: "Data inválida" });

export const actionFormSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o nome da ação").max(160),
    operator_id: z.string(),
    region_id: z.string(),
    city: z.string().trim().max(120),
    starts_on: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início"),
    ends_on: optionalDate,
    status: z.enum(["planned", "in_progress", "completed", "cancelled"]),
    budget_amount: moneyField,
    notes: z.string().trim().max(2000),
  })
  .refine((values) => !values.ends_on || values.ends_on >= values.starts_on, {
    message: "A data final deve ser igual ou posterior ao início",
    path: ["ends_on"],
  });

export type ActionFormValues = z.infer<typeof actionFormSchema>;

export const expenseFormSchema = z.object({
  expense_type_id: z.string().uuid("Selecione o tipo de despesa"),
  consultant_id: z.string(),
  supplier: z.string().trim().max(160),
  description: z.string().trim().max(500),
  expense_date: optionalDate,
  planned_amount: moneyField,
  actual_amount: moneyField,
  payment_method: z.string().trim().max(80),
  status: z.enum(["planned", "paid", "cancelled"]),
  notes: z.string().trim().max(2000),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const expenseTypeFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do tipo").max(80),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type ExpenseTypeFormValues = z.infer<typeof expenseTypeFormSchema>;

export const ATTACHMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
