import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { PostHogProvider } from "posthog-js/react";
import { AuthenticatedApp } from "./App";
import { LandingPage } from "./pages/LandingPage";
import { DataPolicyPage } from "./pages/DataPolicyPage";
import { TermsOfUsePage } from "./pages/TermsOfUsePage";
import { SignIn } from "./components/auth/SignIn";
import { AdminAllowlistPage } from "./pages/AdminAllowlistPage";

const ADMIN_ROUTE_HASH = "a9f3d2c7be4e8f11";

const posthogOptions = {
  api_host: "/ingest",
  ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com",
  defaults: "2026-01-30" as const,
  capture_exceptions: true,
  debug: import.meta.env.DEV,
};

function RootLayout() {
  const { isLoading } = useConvexAuth();
  return (
    <PostHogProvider
      apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!}
      options={posthogOptions}
    >
      {isLoading ? (
        <div className="flex h-screen w-screen items-center justify-center bg-background">
          <span className="text-muted-foreground">Loading…</span>
        </div>
      ) : (
        <Outlet />
      )}
    </PostHogProvider>
  );
}

function IndexRoute() {
  const { isAuthenticated } = useConvexAuth();
  if (isAuthenticated) {
    return <Navigate to="/app" />;
  }
  return <LandingPage />;
}

function LoginRoute() {
  const { isAuthenticated } = useConvexAuth();
  if (isAuthenticated) {
    return <AuthenticatedApp />;
  }
  return <SignIn />;
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <Navigate to="/" />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexRoute,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/app",
  component: LoginRoute,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/privacy",
  component: DataPolicyPage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsOfUsePage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: `/admin/${ADMIN_ROUTE_HASH}`,
  component: AdminAllowlistPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  appRoute,
  privacyRoute,
  termsRoute,
  adminRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function AppRouter() {
  return <RouterProvider router={router} />;
}
