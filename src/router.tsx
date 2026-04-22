import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { AuthenticatedApp } from "./App";
import { LandingPage } from "./pages/LandingPage";
import { DataPolicyPage } from "./pages/DataPolicyPage";
import { TermsOfUsePage } from "./pages/TermsOfUsePage";
import { SignIn } from "./components/SignIn";

function RootLayout() {
  const { isLoading } = useConvexAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <span className="text-muted-foreground">Loading…</span>
      </div>
    );
  }
  return <Outlet />;
}

function IndexRoute() {
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

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  privacyRoute,
  termsRoute,
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
