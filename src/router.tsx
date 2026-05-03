import { lazy, Suspense } from "react";
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
import { LandingPage } from "./pages/LandingPage";
import { SignIn } from "./components/auth/SignIn";

const AuthenticatedAppLazy = lazy(() =>
  import("./App").then((m) => ({ default: m.AuthenticatedApp })),
);

const DataPolicyPageLazy = lazy(() =>
  import("./pages/DataPolicyPage").then((m) => ({
    default: m.DataPolicyPage,
  })),
);

const TermsOfUsePageLazy = lazy(() =>
  import("./pages/TermsOfUsePage").then((m) => ({
    default: m.TermsOfUsePage,
  })),
);

const AdminAllowlistPageLazy = lazy(() =>
  import("./pages/AdminAllowlistPage").then((m) => ({
    default: m.AdminAllowlistPage,
  })),
);

const GraphPageLazy = lazy(() =>
  import("./pages/GraphPage").then((m) => ({
    default: m.GraphPage,
  })),
);

function RouteChunkFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <span className="text-muted-foreground">Loading…</span>
    </div>
  );
}

const ADMIN_ROUTE_HASH = "a9f3d2c7be4e8f11";

const isDev = import.meta.env.DEV;
const enablePostHogInDev =
  import.meta.env.VITE_PUBLIC_POSTHOG_ENABLE_IN_DEV === "true";
const posthogCapturingEnabled = !isDev || enablePostHogInDev;

const posthogOptions = {
  api_host: "/ingest",
  ui_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com",
  defaults: "2026-01-30" as const,
  capture_exceptions: true,
  debug: posthogCapturingEnabled && isDev,
  opt_out_capturing_by_default: !posthogCapturingEnabled,
  loaded: (posthog: { register: (props: Record<string, string>) => void }) => {
    posthog.register({
      environment: import.meta.env.MODE,
    });
  },
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
    return (
      <Suspense fallback={<RouteChunkFallback />}>
        <AuthenticatedAppLazy />
      </Suspense>
    );
  }
  return <SignIn />;
}

function PrivacyRoute() {
  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <DataPolicyPageLazy />
    </Suspense>
  );
}

function TermsRoute() {
  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <TermsOfUsePageLazy />
    </Suspense>
  );
}

function AdminRoute() {
  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <AdminAllowlistPageLazy />
    </Suspense>
  );
}

function GraphRoute() {
  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <GraphPageLazy />
    </Suspense>
  );
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
  component: PrivacyRoute,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms",
  component: TermsRoute,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: `/admin/${ADMIN_ROUTE_HASH}`,
  component: AdminRoute,
});

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/graph",
  component: GraphRoute,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  appRoute,
  privacyRoute,
  termsRoute,
  adminRoute,
  graphRoute,
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
