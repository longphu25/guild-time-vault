import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Loader2, X, AlertCircle } from "lucide-react";

export type ProgressStep = {
  id: number;
  label: string;
  status: "pending" | "loading" | "completed" | "error";
};

interface ProgressModalProps {
  isOpen: boolean;
  steps: ProgressStep[];
  onClose: () => void;
  isFinished: boolean;
  error?: string;
}

export function ProgressModal({ isOpen, steps, onClose, isFinished, error }: ProgressModalProps) {
  const canClose = isFinished || !!error;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={isFinished || canClose ? onClose : undefined}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md my-auto glass-panel border border-primary/20 p-6 shadow-2xl"
          >
            {(isFinished || canClose) && (
              <button onClick={onClose} className="absolute top-3 right-3 text-on-surface-variant hover:text-primary transition-colors">
                <X size={18} />
              </button>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="font-headline text-xl font-black tracking-tight text-on-surface uppercase">
                  {isFinished ? "CAPSULE DEPLOYED" : canClose ? "DEPLOYMENT FAILED" : "DEPLOYING CAPSULE"}
                </h2>
                <p className="text-on-surface-variant font-headline text-[10px] uppercase tracking-widest opacity-70">
                  {isFinished ? "All systems nominal" : canClose ? "An error occurred during deployment" : "Approve each transaction in your wallet"}
                </p>
              </div>

              <div className="space-y-3 py-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                      {step.status === "loading" && <Loader2 className="text-primary animate-spin" size={16} />}
                      {step.status === "completed" && <CheckCircle2 className="text-primary" size={16} />}
                      {step.status === "pending" && <div className="w-2 h-2 rounded-full bg-on-surface-variant/20" />}
                      {step.status === "error" && <AlertCircle className="text-error" size={16} />}
                    </div>
                    <span className={`font-headline text-[11px] uppercase tracking-wider ${
                      step.status === "loading" ? "text-primary" :
                      step.status === "completed" ? "text-on-surface" :
                      step.status === "error" ? "text-error" :
                      "text-on-surface-variant/40"
                    }`}>{step.label}</span>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-error/10 border border-error/20">
                  <p className="text-[10px] font-headline text-error uppercase tracking-widest leading-relaxed break-all">{error}</p>
                </div>
              )}

              {isFinished && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="p-3 bg-primary/10 border border-primary/20 mb-3">
                    <p className="text-[10px] font-headline text-primary uppercase tracking-widest leading-relaxed">
                      Capsule encrypted, stored on Walrus, and registered on-chain.
                    </p>
                  </div>
                  <button onClick={onClose}
                    className="w-full bg-primary py-3 text-background font-headline font-black text-xs tracking-[0.3em] uppercase transition-all hover:brightness-110">
                    CLOSE
                  </button>
                </motion.div>
              )}

              {canClose && !isFinished && (
                <button onClick={onClose}
                  className="w-full border border-on-surface-variant/20 py-3 text-on-surface-variant font-headline font-black text-xs tracking-[0.3em] uppercase transition-all hover:text-on-surface">
                  DISMISS
                </button>
              )}
            </div>

            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/30" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/30" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
