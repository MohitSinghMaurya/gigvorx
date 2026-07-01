import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center">
        <p className="text-gradient text-7xl font-extrabold tracking-tighter">
          404
        </p>

        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>

        <p className="mb-6 mt-2 text-muted-foreground">
          The page you are looking for does not exist.
        </p>

        <Link to="/">
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            Back home
          </Button>
        </Link>
      </div>
    </div>
  );
}