import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(_values: LoginFormValues) {
    setError("root", {
      message:
        "A autenticação real será implementada na Sprint 2. Nenhum dado foi enviado.",
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_oklch(0.94_0.02_245),_var(--background)_55%)] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div>
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">
              DHub
            </p>
            <CardTitle className="mt-1 text-2xl">Entrar na plataforma</CardTitle>
          </div>
          <CardDescription>
            Acesso operacional para consultores e escritório da Prime Service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="seu.email@empresa.com"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {errors.root ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground" role="status">
                {errors.root.message}
              </p>
            ) : null}

            <Button type="submit" className="w-full">
              Entrar
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </button>
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
                Ver layout (demo)
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
