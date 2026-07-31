import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  ClipboardList,
  Bell,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Plug,
  Activity,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, React.ElementType> = {
  ClipboardList,
  Bell,
  Plug,
  Activity,
  Shield,
};

const COLORS: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
  red: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  indigo: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
};

function IntegrationCard({ integration }: { integration: any }) {
  const setValue = useMutation(api.integrations.setValue);
  const removeValue = useMutation(api.integrations.removeValue);
  const toggleEnabled = useMutation(api.integrations.toggleEnabled);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [showFields, setShowFields] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const Icon = ICONS[integration.icon] || Plug;
  const colorClass = COLORS[integration.color] || COLORS.blue;

  const handleSave = async (fieldKey: string) => {
    const value = fieldValues[fieldKey];
    if (!value?.trim()) return;
    setSaving((s) => ({ ...s, [fieldKey]: true }));
    try {
      await setValue({
        integrationSlug: integration.slug,
        key: fieldKey,
        value: value.trim(),
      });
      toast.success(`Saved ${fieldKey}`);
      setFieldValues((v) => ({ ...v, [fieldKey]: "" }));
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving((s) => ({ ...s, [fieldKey]: false }));
    }
  };

  const handleRemove = async (fieldKey: string) => {
    if (!confirm(`Remove this credential?`)) return;
    try {
      await removeValue({ integrationSlug: integration.slug, key: fieldKey });
      toast.success("Credential removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${colorClass}`}>
              <Icon className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{integration.name}</h3>
                {integration.configured ? (
                  <Badge variant="outline" className="text-xs gap-1 border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                    <CheckCircle2 className="size-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs gap-1 border-zinc-300 text-zinc-500 bg-zinc-50 dark:bg-zinc-950/30">
                    <XCircle className="size-3" />
                    Not configured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {integration.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`toggle-${integration.slug}`} className="text-xs text-muted-foreground">
              {integration.enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id={`toggle-${integration.slug}`}
              checked={integration.enabled}
              onCheckedChange={(checked: boolean) =>
                toggleEnabled({ id: integration._id, enabled: checked })
              }
            />
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {integration.fields.map((field: any) => {
            const status = integration.fieldStatus.find((s: any) => s.key === field.key);
            const isPassword = field.type === "password";
            const showKey = `${integration.slug}-${field.key}`;

            return (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs font-medium">{field.label}</Label>
                {status?.hasValue ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm">
                      <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      <span className="text-muted-foreground font-mono text-xs">
                        {status.preview}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-8"
                      onClick={() => handleRemove(field.key)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={isPassword && !showFields[showKey] ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={fieldValues[field.key] || ""}
                        onChange={(e) =>
                          setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))
                        }
                        className="h-8 text-sm font-mono pr-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave(field.key);
                        }}
                      />
                      {isPassword && (
                        <button
                          type="button"
                          onClick={() => setShowFields((s) => ({ ...s, [showKey]: !s[showKey] }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showFields[showKey] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleSave(field.key)}
                      disabled={saving[field.key] || !fieldValues[field.key]?.trim()}
                    >
                      <Save className="size-3.5 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const integrations = useQuery(api.integrations.list);

  const grouped = integrations?.reduce(
    (acc, i) => {
      const cat = i.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(i);
      return acc;
    },
    {} as Record<string, typeof integrations>,
  );

  const categoryLabels: Record<string, string> = {
    "project-management": "Project Management",
    notifications: "Notifications",
    monitoring: "Monitoring",
    security: "Security",
    other: "Other",
  };

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage third-party service connections used across all components
        </p>
      </div>

      {integrations && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold">{integrations.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Integrations</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">
              {integrations.filter((i) => i.configured).length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Configured</div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {integrations.filter((i) => !i.configured).length}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">Needs Setup</div>
          </div>
        </div>
      )}

      {integrations === undefined ? (
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-muted rounded-lg" />
          <div className="h-40 bg-muted rounded-lg" />
        </div>
      ) : grouped ? (
        Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {categoryLabels[category] || category}
            </h2>
            <div className="space-y-4">
              {items!.map((integration) => (
                <IntegrationCard key={integration._id} integration={integration} />
              ))}
            </div>
          </div>
        ))
      ) : null}
    </div>
  );
}
