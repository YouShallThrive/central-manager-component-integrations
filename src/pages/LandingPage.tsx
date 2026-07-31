import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plug, ArrowRight, ClipboardList, Bell, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-lg text-center space-y-8">
          <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-purple-600 text-white shadow-lg shadow-purple-600/20">
            <Plug className="size-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">
              Integrations
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Centralized third-party service connections for all your management components.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
              <ClipboardList className="size-4 text-blue-500" />
              Asana
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
              <Bell className="size-4 text-orange-500" />
              Slack Webhooks
            </div>
            <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
              <Zap className="size-4 text-amber-500" />
              More Coming
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-purple-600 hover:bg-purple-700 gap-2">
              <Link to="/login">
                Sign In
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
