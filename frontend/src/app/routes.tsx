import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "../layouts/AppLayout";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { StationsPage } from "../pages/StationsPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { BookingsPage } from "../pages/BookingsPage";
import { UsersPage } from "../pages/UsersPage";
import { RequireAuth, RequireRole } from "./RouteAccess";

export const router = createBrowserRouter([
  { path: "/", Component: LandingPage },
  { path: "/login", Component: LoginPage },
  {
    path: "/app",
    Component: RequireAuth,
    children: [
      {
        Component: AppLayout,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          {
            path: "dashboard",
            element: <RequireRole roles={["ADMIN", "OPERATOR"]}><DashboardPage /></RequireRole>,
          },
          { path: "stations", Component: StationsPage },
          {
            path: "bookings",
            element: <RequireRole roles={["DRIVER"]}><BookingsPage /></RequireRole>,
          },
          {
            path: "analytics",
            element: <RequireRole roles={["ADMIN", "OPERATOR"]}><AnalyticsPage /></RequireRole>,
          },
          {
            path: "users",
            element: <RequireRole roles={["ADMIN"]}><UsersPage /></RequireRole>,
          },
          { path: "*", element: <Navigate to="dashboard" replace /> },
        ],
      },
    ],
  },
]);
