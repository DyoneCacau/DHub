import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .trim()
    .min(1, "VITE_SUPABASE_URL não configurada")
    .url("VITE_SUPABASE_URL deve ser uma URL válida"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .trim()
    .min(1, "VITE_SUPABASE_PUBLISHABLE_KEY não configurada"),
});

export type AppEnv = z.infer<typeof envSchema>;

export type EnvBootstrap =
  | { ok: true; data: AppEnv }
  | { ok: false; message: string };

/** Validação tipada. Não registra nem inclui valores nos erros. */
export const envBootstrap: EnvBootstrap = (() => {
  const parsed = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join("; ");
    return {
      ok: false,
      message: `Configuração de ambiente inválida. Confira .env.local e .env.example. ${messages}`,
    };
  }

  return { ok: true, data: parsed.data };
})();

export function requireEnv(): AppEnv {
  if (!envBootstrap.ok) {
    throw new Error(envBootstrap.message);
  }
  return envBootstrap.data;
}
