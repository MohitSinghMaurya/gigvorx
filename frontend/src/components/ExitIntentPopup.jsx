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

  const handleMouseLeave = useCallback((e) => {
    if (e.clientY < 10 && !hasShown && !show) {
      setShow(true);
      setHasShown(true);
      sessionStorage.setItem("exitPopupShown", "true");
    }
  }, [hasShown, show]);

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
            <Card className="p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
                aria-label="Close popup"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Wait — your first brief is free</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                Join 2,000+ freelancers who use GigVorx to collect client requirements in minutes, not hours. No credit card needed.
              </p>
              <div className="flex flex-col gap-2 text-sm text-left mb-6 max-w-xs mx-auto">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>AI-generated niche questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>WhatsApp + PDF sharing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Free forever plan available</span>
                </div>
              </div>
              <Link to="/signup" onClick={handleClose}>
                <Button size="lg" className="w-full bg-gradient-to-r from-blue-500 to-violet-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/25">
                  Start free trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Setup takes 5 minutes. Cancel anytime.
              </p>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}