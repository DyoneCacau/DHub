import { z } from "zod";

const requiredDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data");
const requiredDateTime = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "Informe data e hora")
  .refine((value) => new Date(value).getTime() <= Date.now() + 10 * 60_000, {
    message: "Data de recebimento no futuro",
  });

export const receiveContractSchema = z.object({
  channel_id: z.string(),
  operator_id: z.string().uuid("Selecione a bandeira"),
  consultant_id: z.string().uuid("Selecione o consultor"),
  merchant_id: z.string().uuid("Selecione o lojista"),
  signed_on: requiredDate.refine((value) => value <= new Date().toISOString().slice(0, 10), {
    message: "Data de assinatura no futuro",
  }),
  received_at: requiredDateTime,
  plan_name: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

export type ReceiveContractValues = z.infer<typeof receiveContractSchema>;

export const submissionFormSchema = z.object({
  kind: z.enum(["correction", "complement"]),
  channel_id: z.string(),
  received_at: requiredDateTime,
  notes: z.string().trim().max(1000),
});

export type SubmissionFormValues = z.infer<typeof submissionFormSchema>;

export const contractEditSchema = z.object({
  operator_id: z.string().uuid("Selecione a bandeira"),
  signed_on: requiredDate,
  plan_name: z.string().trim().max(120),
  notes: z.string().trim().max(2000),
});

export type ContractEditValues = z.infer<typeof contractEditSchema>;

export const pendencyReasonSchema = z
  .string()
  .trim()
  .min(3, "Descreva a pendência")
  .max(500, "Máximo de 500 caracteres");

export const statusNoteSchema = z.string().trim().max(1000);

export const discardReasonSchema = z
  .string()
  .trim()
  .min(3, "Informe o motivo do descarte")
  .max(500, "Máximo de 500 caracteres");

export const intakeChannelSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do canal").max(80),
  channel_type: z.enum(["whatsapp", "email", "presencial", "outro"]),
  operator_id: z.string(),
  phone_label: z.string().trim().max(40),
  notes: z.string().trim().max(1000),
});

export type IntakeChannelValues = z.infer<typeof intakeChannelSchema>;
