import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/layout/admin-layout";
import { RouteFallback } from "@/components/shared/route-fallback";
import {
  PublicOnlyRoute,
  RequireActiveMembership,
  RequireAuth,
  RequireRole,
} from "@/features/auth/components/route-guards";

function lazyNamed<TModule extends Record<string, ComponentType>>(
  factory: () => Promise<TModule>,
  exportName: keyof TModule & string,
) {
  return lazy(async () => {
    const module = await factory();
    const Component = module[exportName];
    if (!Component) {
      throw new Error(`Exportação "${exportName}" não encontrada no módulo lazy`);
    }
    return { default: Component };
  });
}

const LoginPage = lazyNamed(() => import("@/pages/login-page"), "LoginPage");
const ForgotPasswordPage = lazyNamed(
  () => import("@/pages/forgot-password-page"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazyNamed(
  () => import("@/pages/reset-password-page"),
  "ResetPasswordPage",
);
const DashboardPage = lazyNamed(() => import("@/pages/dashboard-page"), "DashboardPage");
const ConsultantsPage = lazyNamed(
  () => import("@/pages/consultants-page"),
  "ConsultantsPage",
);
const ConsultantDetailPage = lazyNamed(
  () => import("@/pages/consultant-detail-page"),
  "ConsultantDetailPage",
);
const ConsultantFormPage = lazyNamed(
  () => import("@/pages/consultant-form-page"),
  "ConsultantFormPage",
);
const MerchantsPage = lazyNamed(() => import("@/pages/merchants-page"), "MerchantsPage");
const MerchantDetailPage = lazyNamed(
  () => import("@/pages/merchant-detail-page"),
  "MerchantDetailPage",
);
const MerchantFormPage = lazyNamed(
  () => import("@/pages/merchant-form-page"),
  "MerchantFormPage",
);
const ContractsPage = lazyNamed(() => import("@/pages/contracts-page"), "ContractsPage");
const ContractDetailPage = lazyNamed(
  () => import("@/pages/contract-detail-page"),
  "ContractDetailPage",
);
const RechargesPage = lazyNamed(() => import("@/pages/recharges-page"), "RechargesPage");
const OperatorsPage = lazyNamed(() => import("@/pages/operators-page"), "OperatorsPage");
const RegionsPage = lazyNamed(() => import("@/pages/regions-page"), "RegionsPage");
const ReportsPage = lazyNamed(() => import("@/pages/reports-page"), "ReportsPage");
const SettingsPage = lazyNamed(() => import("@/pages/settings-page"), "SettingsPage");
const SettingsUsersPage = lazyNamed(
  () => import("@/pages/settings-users-page"),
  "SettingsUsersPage",
);
const AccountPage = lazyNamed(() => import("@/pages/account-page"), "AccountPage");
const AccessDeniedPage = lazyNamed(
  () => import("@/pages/access-denied-page"),
  "AccessDeniedPage",
);
const NotFoundPage = lazyNamed(() => import("@/pages/not-found-page"), "NotFoundPage");

function withPageSuspense(Page: ComponentType) {
  return (
    <Suspense fallback={<RouteFallback embedded />}>
      <Page />
    </Suspense>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route
          path="/login"
          element={
            <Suspense fallback={<RouteFallback embedded={false} />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/esqueci-senha"
          element={
            <Suspense fallback={<RouteFallback embedded={false} />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="/redefinir-senha"
        element={
          <Suspense fallback={<RouteFallback embedded={false} />}>
            <ResetPasswordPage />
          </Suspense>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<RequireAuth />}>
        <Route element={<RequireActiveMembership />}>
          <Route element={<AdminLayout />}>
            <Route path="/dashboard" element={withPageSuspense(DashboardPage)} />
            <Route path="/lojistas" element={withPageSuspense(MerchantsPage)} />
            <Route path="/lojistas/novo" element={withPageSuspense(MerchantFormPage)} />
            <Route
              path="/lojistas/:merchantId/editar"
              element={withPageSuspense(MerchantFormPage)}
            />
            <Route
              path="/lojistas/:merchantId"
              element={withPageSuspense(MerchantDetailPage)}
            />
            <Route path="/contratos" element={withPageSuspense(ContractsPage)} />
            <Route
              path="/contratos/:contractId"
              element={withPageSuspense(ContractDetailPage)}
            />
            <Route path="/recargas" element={withPageSuspense(RechargesPage)} />
            <Route path="/conta" element={withPageSuspense(AccountPage)} />
            <Route path="/acesso-negado" element={withPageSuspense(AccessDeniedPage)} />

            <Route element={<RequireRole roles={["admin", "operator"]} />}>
              <Route path="/consultores" element={withPageSuspense(ConsultantsPage)} />
              <Route path="/consultores/novo" element={withPageSuspense(ConsultantFormPage)} />
              <Route
                path="/consultores/:consultantId/editar"
                element={withPageSuspense(ConsultantFormPage)}
              />
              <Route
                path="/consultores/:consultantId"
                element={withPageSuspense(ConsultantDetailPage)}
              />
              <Route path="/relatorios" element={withPageSuspense(ReportsPage)} />
            </Route>

            <Route element={<RequireRole roles={["admin"]} />}>
              <Route path="/operadoras" element={withPageSuspense(OperatorsPage)} />
              <Route path="/regioes" element={withPageSuspense(RegionsPage)} />
              <Route path="/configuracoes" element={withPageSuspense(SettingsPage)} />
              <Route
                path="/configuracoes/usuarios"
                element={withPageSuspense(SettingsUsersPage)}
              />
            </Route>

            <Route path="*" element={withPageSuspense(NotFoundPage)} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
