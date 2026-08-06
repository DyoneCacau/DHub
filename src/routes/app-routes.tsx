import { Suspense, lazy, type ComponentType } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AdminLayout } from "@/components/layout/admin-layout";
import { RouteFallback } from "@/components/shared/route-fallback";

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
const DashboardPage = lazyNamed(() => import("@/pages/dashboard-page"), "DashboardPage");
const ConsultantsPage = lazyNamed(
  () => import("@/pages/consultants-page"),
  "ConsultantsPage",
);
const MerchantsPage = lazyNamed(() => import("@/pages/merchants-page"), "MerchantsPage");
const MerchantDetailPage = lazyNamed(
  () => import("@/pages/merchant-detail-page"),
  "MerchantDetailPage",
);
const ContractsPage = lazyNamed(() => import("@/pages/contracts-page"), "ContractsPage");
const ContractDetailPage = lazyNamed(
  () => import("@/pages/contract-detail-page"),
  "ContractDetailPage",
);
const RechargesPage = lazyNamed(() => import("@/pages/recharges-page"), "RechargesPage");
const OperatorsPage = lazyNamed(() => import("@/pages/operators-page"), "OperatorsPage");
const ReportsPage = lazyNamed(() => import("@/pages/reports-page"), "ReportsPage");
const SettingsPage = lazyNamed(() => import("@/pages/settings-page"), "SettingsPage");
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
      <Route
        path="/login"
        element={
          <Suspense fallback={<RouteFallback embedded={false} />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={withPageSuspense(DashboardPage)} />
        <Route path="/consultores" element={withPageSuspense(ConsultantsPage)} />
        <Route path="/lojistas" element={withPageSuspense(MerchantsPage)} />
        <Route path="/lojistas/:merchantId" element={withPageSuspense(MerchantDetailPage)} />
        <Route path="/contratos" element={withPageSuspense(ContractsPage)} />
        <Route
          path="/contratos/:contractId"
          element={withPageSuspense(ContractDetailPage)}
        />
        <Route path="/recargas" element={withPageSuspense(RechargesPage)} />
        <Route path="/operadoras" element={withPageSuspense(OperatorsPage)} />
        <Route path="/relatorios" element={withPageSuspense(ReportsPage)} />
        <Route path="/configuracoes" element={withPageSuspense(SettingsPage)} />
        <Route path="/acesso-negado" element={withPageSuspense(AccessDeniedPage)} />
        <Route path="*" element={withPageSuspense(NotFoundPage)} />
      </Route>
    </Routes>
  );
}
