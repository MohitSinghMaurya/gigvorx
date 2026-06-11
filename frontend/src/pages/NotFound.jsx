import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-7xl font-extrabold tracking-tighter text-gradient">404</p>
        <h1 className="text-2xl font-bold mt-2">Page not found</h1>
        <p className="text-muted-foreground mt-2 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/"><Button className="bg-foreground text-background hover:bg-foreground/90">Back home</Button></Link>
      </div>
    </div>
  );
}
