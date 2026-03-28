import { Outlet } from "react-router";
import { Navbar } from "./Navbar";
import { StarfieldBackground } from "./StarfieldBackground";
import { Footer } from "./Footer";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] font-sans">
      <StarfieldBackground />
      <Navbar />
      <main className="pt-16 relative z-10">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
