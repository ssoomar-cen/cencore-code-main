import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center space-y-4">
        <img
          src="/img/robot-head.jpg"
          alt="Lost robot"
          className="w-44 h-44 object-cover rounded-full mx-auto shadow-xl ring-4 ring-background"
        />
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <p className="text-xl text-muted-foreground">Hmm, that page doesn't exist.</p>
        <a href="/" className="inline-block mt-2 text-primary underline hover:text-primary/80 text-sm font-medium">
          Take me home →
        </a>
      </div>
    </div>
  );
};

export default NotFound;
