import { Outlet } from "react-router";
import { TopBar } from "./TopBar";
import { SideBar } from "./SideBar";
import { AnimatePresence, motion } from "motion/react";
import { useLocation } from "react-router";

export function RootLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background text-on-surface font-body overflow-x-hidden">
      <TopBar />
      <SideBar />

      <main className="md:ml-64 pt-24 px-6 lg:px-12 pb-12 min-h-screen relative">
        <div className="scanline fixed inset-0 z-0 opacity-10 pointer-events-none" />
        <div className="relative z-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Telemetry Overlay */}
        <div className="fixed bottom-6 right-10 flex flex-col items-end gap-1 opacity-40 pointer-events-none hidden lg:flex">
          <div className="font-mono text-[8px] tracking-[0.3em] uppercase">Sector: Deep Space 7</div>
          <div className="font-mono text-[8px] tracking-[0.3em] uppercase text-primary">Pulse: Nominal</div>
        </div>
      </main>

      {/* Visual Artifacts */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-50 pointer-events-none" />
      <div className="fixed top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-primary/10 -m-4 pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-primary/10 -m-4 pointer-events-none" />
    </div>
  );
}
