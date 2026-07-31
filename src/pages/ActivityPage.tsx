import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckCircle2, XCircle, Info } from "lucide-react";

export default function ActivityPage() {
  const logs = useQuery(api.actionLogs.list, { limit: 100 });

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Recent integration credential changes and events
        </p>
      </div>

      {logs === undefined ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Info className="size-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold">No activity yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Activity will appear here when integration credentials are updated.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log._id}
              className="flex items-start gap-3 rounded-lg border bg-card p-3.5"
            >
              <div className="mt-0.5">
                {log.status === "success" ? (
                  <CheckCircle2 className="size-4 text-emerald-500" />
                ) : log.status === "error" ? (
                  <XCircle className="size-4 text-red-500" />
                ) : (
                  <Info className="size-4 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {log.action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  {log.integrationSlug && (
                    <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {log.integrationSlug}
                    </span>
                  )}
                </div>
                {log.detail && (
                  <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(log.timestamp).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
