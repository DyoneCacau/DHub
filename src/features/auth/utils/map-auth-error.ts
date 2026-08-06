export function mapAuthError(error: { message?: string; code?: string } | null): string {
  if (!error) {
    return "Não foi possível concluir a operação. Tente novamente.";
  }

  const message = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();

  if (
    message.includes("invalid login") ||
    message.includes("invalid credentials") ||
    code.includes("invalid_credentials")
  ) {
    return "E-mail ou senha inválidos.";
  }

  if (message.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Falha de rede. Verifique sua conexão.";
  }

  if (message.includes("session") || message.includes("refresh")) {
    return "Sessão expirada. Entre novamente.";
  }

  if (message.includes("recovery") || message.includes("otp")) {
    return "Link de recuperação inválido ou expirado.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}
