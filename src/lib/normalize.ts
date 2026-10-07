/** Utilitários de normalização — espelham regras do banco; máscaras só na UI. */

export function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeDigits(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

export function normalizePhone(value: string | null | undefined): string | null {
  return normalizeDigits(value);
}

export function normalizeWhatsapp(value: string | null | undefined): string | null {
  return normalizeDigits(value);
}

/** CPF/CNPJ sem pontuação; preserva letras (CNPJ alfanumérico). */
export function normalizeDocument(value: string | null | undefined): string | null {
  const cleaned = (value ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizePostalCode(value: string | null | undefined): string | null {
  return normalizeDigits(value);
}

export function normalizeUf(value: string | null | undefined): string | null {
  const uf = value?.trim().toUpperCase() ?? "";
  if (!uf) return null;
  return uf.slice(0, 2);
}

export function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/** Código estável a partir de um nome: minúsculas, sem acentos, separado por hífen. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function emptyToNull(value: string | null | undefined): string | null {
  return normalizeText(value);
}
