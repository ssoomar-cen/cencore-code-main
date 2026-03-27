import { Outlet, useLocation, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Settings, Mail, Link2 } from "lucide-react";

const preferencePages = [
  {
    title: "Profile",
    path: "/settings",
    icon: Settings,
  },
  {
    title: "Email Templates",
    path: "/preferences/email-templates",
    icon: Mail,
  },
  {
    title: "Connections",
    path: "/preferences/connections",
    icon: Link2,
  },
];

export default function Preferences() {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings & Preferences</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <Card className="h-fit p-4">
          <nav className="space-y-1">
            {preferencePages.map((page) => {
              const isActive = location.pathname === page.path;
              const Icon = page.icon;
              
              return (
                <Link
                  key={page.path}
                  to={page.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {page.title}
                </Link>
              );
            })}
          </nav>
        </Card>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
