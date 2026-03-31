import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/components/layout/RootLayout";
import { GuildsView } from "@/pages/GuildsView";
import { VaultView } from "@/pages/VaultView";
import { CreateCapsule } from "@/pages/CreateCapsule";
import { MembersView } from "@/pages/MembersView";
import { HeartbeatView } from "@/pages/HeartbeatView";
import { InitializeView } from "@/pages/InitVault";
import { NotFound } from "@/pages/NotFound";
import { AssemblyView } from "@/pages/AssemblyView";
import { ProfileView } from "@/pages/Profile";
import { GameGuideView } from "@/pages/GameGuide";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <GuildsView /> },
      { path: "vault", element: <VaultView /> },
      { path: "create", element: <CreateCapsule /> },
      { path: "members", element: <MembersView /> },
      { path: "heartbeat", element: <HeartbeatView /> },
      { path: "assembly", element: <AssemblyView /> },
      { path: "profile", element: <ProfileView /> },
      { path: "guide", element: <GameGuideView /> },
      { path: "init-vault", element: <InitializeView /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
