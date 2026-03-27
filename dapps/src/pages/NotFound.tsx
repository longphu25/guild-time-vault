import { Link } from "react-router";
import { AlertCircle, Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-20 h-20 text-[#F59E0B] mx-auto mb-6 drop-shadow-[0_0_20px_rgba(245,158,11,0.6)]" />
        <h1 className="text-6xl font-heading text-[#E2E8F0] mb-4">404</h1>
        <h2 className="text-2xl font-heading text-[#E2E8F0] mb-4">Lost in Space</h2>
        <p className="text-[#94A3B8] mb-8">The capsule you're looking for doesn't exist in this sector of the galaxy.</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-[#00F0FF] text-[#0A0A0F] rounded-lg hover:drop-shadow-[0_0_20px_rgba(0,240,255,0.8)] transition-all">
          <Home className="w-5 h-5" /> Return Home
        </Link>
      </div>
    </div>
  );
}
