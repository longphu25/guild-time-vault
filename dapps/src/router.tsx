import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/components/layout/RootLayout";
import { Home } from "@/pages/Home";
import { CreateCapsule } from "@/pages/CreateCapsule";
import { Timeline } from "@/pages/Timeline";
import { MyCapsules } from "@/pages/MyCapsules";
import { Archive } from "@/pages/Archive";
import { Admin } from "@/pages/Admin";
import { InitVault } from "@/pages/InitVault";
import { NotFound } from "@/pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "create", element: <CreateCapsule /> },
      { path: "timeline", element: <Timeline /> },
      { path: "my-capsules", element: <MyCapsules /> },
      { path: "archive", element: <Archive /> },
      { path: "admin", element: <Admin /> },
      { path: "init-vault", element: <InitVault /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
