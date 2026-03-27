import { GitBranch, MessageCircle, Globe } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-[#2D2D3F] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-[#94A3B8] text-sm">
              Built for <span className="text-[#00F0FF]">EVE Frontier</span> — A Toolkit for Civilization
            </p>
            <p className="text-[#94A3B8] text-xs mt-1">
              Time Capsule © 2026. Preserving messages for the future.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[#94A3B8] hover:text-[#00F0FF] transition-colors" aria-label="GitHub"><GitBranch className="w-5 h-5" /></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-[#94A3B8] hover:text-[#00F0FF] transition-colors" aria-label="Twitter"><MessageCircle className="w-5 h-5" /></a>
            <a href="https://evefrontier.com" target="_blank" rel="noopener noreferrer" className="text-[#94A3B8] hover:text-[#00F0FF] transition-colors" aria-label="Website"><Globe className="w-5 h-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
