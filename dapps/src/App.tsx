import { RouterProvider } from "react-router";
import { Toaster } from "sonner";
import { router } from "./router";

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1A1A2E",
            border: "1px solid #2D2D3F",
            color: "#E2E8F0",
          },
        }}
      />
    </>
  );
}
