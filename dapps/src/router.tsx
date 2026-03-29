import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/components/layout/RootLayout";
import { VaultView } from "@/pages/VaultView";
import { CreateCapsule } from "@/pages/CreateCapsule";
import { MembersView } from "@/pages/MembersView";
import { HeartbeatView } from "@/pages/HeartbeatView";
import { InitVault } from "@/pages/InitVault";
import { NotFound } from "@/pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <VaultView /> },
      { path: "create", element: <CreateCapsule /> },
      { path: "members", element: <MembersView /> },
      { path: "heartbeat", element: <HeartbeatView /> },
      { path: "init-vault", element: <InitVault /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
