import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ArrowRight, Sparkles, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function ExitIntentPopup() {
  const [show, setShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem("exitPopupShown");
    if (alreadyShown) setHasShown(true);
  }, []);

  const handleMouseLeave = useCallback(
    (e) => {
      if (e.clientY < 10 && !hasShown && !show) {
        setShow(true);
        setHasShown(true);
        sessionStorage.setItem("exitPopupShown", "true");
      }
    },
    [hasShown, show]
  );

  useEffect(() => {
    if (window.innerWidth > 768) {
      document.addEventListener("mouseleave", handleMouseLeave);
      return () => document.removeEventListener("mouseleave", handleMouseLeave);
    }
  }, [handleMouseLeave]);

  useEffect(() => {
    if (window.innerWidth <= 768) {
      let lastScrollY = window.scrollY;
      let scrollUpCount = 0;

      const handleScroll = () => {
        const currentY = window.scrollY;

        if (lastScrollY - currentY > 50) {
          scrollUpCount++;
          if (scrollUpCount >= 2 && !hasShown && !show) {
            setShow(true);
            setHasShown(true);
            sessionStorage.setItem("exitPopupShown", "true");
          }
        }

        lastScrollY = currentY;
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }
  }, [hasShown, show]);

  const handleClose = () => setShow(false);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="relative overflow-hidden p-8 text-center">
              <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500" />

              <button
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full p-1.5 transition-colors hover:bg-muted"
                aria-label="Close popup"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>

              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <Gift className="h-8 w-8 text-blue-500" />
              </div>

              <h3 className="mb-2 text-2xl font-bold">
                Wait — start your 7-day free trial
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                Turn messy client chats into clear briefs, scope, invoices, and
                follow-ups in one place. No credit card required to get started.
              </p>

              <div className="mx-auto mb-6 flex max-w-xs flex-col gap-2 text-left text-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Client briefs built for service businesses</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Invoices, approvals, and follow-ups in one workflow</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>7-day free trial with full setup in minutes</span>
                </div>
              </div>

              <Link to="/signup" onClick={handleClose}>
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/25 hover:opacity-90"
                >
                  Start 7-day free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              <p className="mt-3 text-xs text-muted-foreground">
                Setup takes 5 minutes. Upgrade only if it fits your workflow.
              </p>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}