/**
 * Integration management — CRUD for integration configs and credential values.
 */
import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

// Truncated preview of a secret value for the public fieldStatus projection
// (never the full value). Mirrors prod's configurable-integrations denorm.
function previewOf(value: string, type: string): string | undefined {
  if (type === "password") return `…${value.slice(-8)}`;
  if (type === "url") return value.slice(0, 40) + (value.length > 40 ? "…" : "");
  return `…${value.slice(-8)}`;
}

// Denormalized fieldStatus array derived from an integration's field defs and
// its stored values. Persisted onto the integration row so `list` stays a
// self-contained read (matching the imported prod snapshot).
function fieldStatusFor(
  fields: Array<{ key: string; type: string; [k: string]: unknown }>,
  valueMap: Map<string, string>,
) {
  return fields.map((f) => {
    const val = valueMap.get(f.key);
    return {
      key: f.key,
      hasValue: !!val,
      preview: val ? previewOf(val, f.type) : undefined,
    };
  });
}

// Recompute + persist the denormalized `configured` / `fieldStatus` on an
// integration definition after its values change (so the public list row stays
// accurate without joining integrationValues).
async function recomputeIntegrationStatus(ctx: any, integrationSlug: string) {
  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_slug", (q: any) => q.eq("slug", integrationSlug))
    .unique();
  if (!integration) return;

  const values = await ctx.db
    .query("integrationValues")
    .withIndex("by_slug", (q: any) => q.eq("integrationSlug", integrationSlug))
    .collect();
  const valueMap = new Map(values.map((v: any) => [v.key, v.value]));

  await ctx.db.patch(integration._id, {
    configured: values.length > 0,
    fieldStatus: fieldStatusFor(integration.fields, valueMap),
  });
}

// List all integrations (with status but no secret values)
export const list = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("integrations"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    color: v.string(),
    category: v.string(),
    fields: v.array(v.object({
      key: v.string(),
      label: v.string(),
      type: v.string(),
      placeholder: v.optional(v.string()),
      required: v.optional(v.boolean()),
    })),
    enabled: v.boolean(),
    configured: v.boolean(),
    fieldStatus: v.array(v.object({
      key: v.string(),
      hasValue: v.boolean(),
      preview: v.optional(v.string()),
    })),
  })),
  handler: async (ctx) => {
    const integrations = await ctx.db.query("integrations").collect();
    const result = [];

    for (const integration of integrations) {
      // Prefer the denormalized fields (imported prod snapshot, and every write
      // since the redesign). Fall back to computing from integrationValues for
      // any legacy row that predates denormalization.
      if (integration.fieldStatus !== undefined || integration.configured !== undefined) {
        result.push({
          _id: integration._id,
          slug: integration.slug,
          name: integration.name,
          description: integration.description,
          icon: integration.icon,
          color: integration.color,
          category: integration.category,
          fields: integration.fields,
          enabled: integration.enabled,
          configured: integration.configured ?? false,
          fieldStatus: integration.fieldStatus ?? fieldStatusFor(integration.fields, new Map()),
        });
        continue;
      }

      const values = await ctx.db
        .query("integrationValues")
        .withIndex("by_slug", (q) => q.eq("integrationSlug", integration.slug))
        .collect();
      const valueMap = new Map(values.map((v) => [v.key, v.value]));

      result.push({
        _id: integration._id,
        slug: integration.slug,
        name: integration.name,
        description: integration.description,
        icon: integration.icon,
        color: integration.color,
        category: integration.category,
        fields: integration.fields,
        enabled: integration.enabled,
        configured: values.length > 0,
        fieldStatus: fieldStatusFor(integration.fields, valueMap),
      });
    }

    return result;
  },
});

// Save a credential value for an integration
export const setValue = mutation({
  args: {
    integrationSlug: v.string(),
    key: v.string(),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("integrationValues")
      .withIndex("by_slug_key", (q) =>
        q.eq("integrationSlug", args.integrationSlug).eq("key", args.key),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("integrationValues", {
        integrationSlug: args.integrationSlug,
        key: args.key,
        value: args.value,
      });
    }

    await recomputeIntegrationStatus(ctx, args.integrationSlug);

    await ctx.db.insert("actionLogs", {
      action: "credential_updated",
      detail: `Updated ${args.key} for ${args.integrationSlug}`,
      integrationSlug: args.integrationSlug,
      timestamp: Date.now(),
      status: "success",
    });

    return null;
  },
});

// Remove a credential value
export const removeValue = mutation({
  args: {
    integrationSlug: v.string(),
    key: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("integrationValues")
      .withIndex("by_slug_key", (q) =>
        q.eq("integrationSlug", args.integrationSlug).eq("key", args.key),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await recomputeIntegrationStatus(ctx, args.integrationSlug);

    await ctx.db.insert("actionLogs", {
      action: "credential_removed",
      detail: `Removed ${args.key} from ${args.integrationSlug}`,
      integrationSlug: args.integrationSlug,
      timestamp: Date.now(),
      status: "info",
    });

    return null;
  },
});

// Toggle integration enabled/disabled
export const toggleEnabled = mutation({
  args: {
    id: v.id("integrations"),
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { enabled: args.enabled });
    return null;
  },
});

// ── Internal queries for HTTP API ──────────────────────────

export const getValues = internalQuery({
  args: { integrationSlug: v.string() },
  returns: v.array(v.object({
    key: v.string(),
    value: v.string(),
  })),
  handler: async (ctx, args) => {
    const values = await ctx.db
      .query("integrationValues")
      .withIndex("by_slug", (q) => q.eq("integrationSlug", args.integrationSlug))
      .collect();

    return values.map((v) => ({ key: v.key, value: v.value }));
  },
});

export const setValueInternal = internalMutation({
  args: {
    integrationSlug: v.string(),
    key: v.string(),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("integrationValues")
      .withIndex("by_slug_key", (q) =>
        q.eq("integrationSlug", args.integrationSlug).eq("key", args.key),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value });
    } else {
      await ctx.db.insert("integrationValues", {
        integrationSlug: args.integrationSlug,
        key: args.key,
        value: args.value,
      });
    }

    await recomputeIntegrationStatus(ctx, args.integrationSlug);

    await ctx.db.insert("actionLogs", {
      action: "credential_updated",
      detail: `Updated ${args.key} for ${args.integrationSlug} (via admin sync API)`,
      integrationSlug: args.integrationSlug,
      timestamp: Date.now(),
      status: "success",
    });

    return null;
  },
});

export const getValue = internalQuery({
  args: { integrationSlug: v.string(), key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const val = await ctx.db
      .query("integrationValues")
      .withIndex("by_slug_key", (q) =>
        q.eq("integrationSlug", args.integrationSlug).eq("key", args.key),
      )
      .unique();

    return val?.value ?? null;
  },
});

// Seed default integrations
export const seed = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const defaults = [
      {
        slug: "asana",
        name: "Asana",
        description: "Project management integration. Connect to see STAGE Production Tasks and prevent deleting staging sites with active work.",
        icon: "ClipboardList",
        color: "blue",
        category: "project-management",
        fields: [
          {
            key: "pat",
            label: "Personal Access Token",
            type: "password",
            placeholder: "Paste your Asana PAT...",
            required: true,
          },
          {
            key: "workspace_gid",
            label: "Workspace GID",
            type: "text",
            placeholder: "e.g., 5489909195735",
            required: false,
          },
        ],
        enabled: true,
      },
      {
        slug: "slack-webhook",
        name: "Slack Webhook",
        description: "Get Slack notifications when staging sites are out of sync with production. A daily check runs automatically.",
        icon: "Bell",
        color: "orange",
        category: "notifications",
        fields: [
          {
            key: "webhook_url",
            label: "Incoming Webhook URL",
            type: "url",
            placeholder: "https://hooks.slack.com/services/...",
            required: true,
          },
        ],
        enabled: true,
      },
      {
        slug: "statuscake",
        name: "StatusCake",
        description: "Uptime monitoring integration. Sync uptime test results to Production Manager for at-a-glance site health visibility.",
        icon: "Activity",
        color: "green",
        category: "monitoring",
        fields: [
          {
            key: "api_key",
            label: "API Key",
            type: "password",
            placeholder: "Paste your StatusCake API key...",
            required: true,
          },
        ],
        enabled: true,
      },
      {
        slug: "malcare",
        name: "MalCare",
        description: "Security & firewall integration (BlogVault API v6). Used for firewall IP whitelisting and site security management across YST sites.",
        icon: "Shield",
        color: "indigo",
        category: "security",
        fields: [
          {
            key: "api_key",
            label: "API Token",
            type: "password",
            placeholder: "Paste your MalCare API token (bvsk_...)...",
            required: true,
          },
        ],
        enabled: true,
      },
    ];

    for (const def of defaults) {
      const existing = await ctx.db
        .query("integrations")
        .withIndex("by_slug", (q) => q.eq("slug", def.slug))
        .unique();

      if (!existing) {
        await ctx.db.insert("integrations", {
          ...def,
          configured: false,
          fieldStatus: fieldStatusFor(def.fields, new Map()),
        });
      }
    }

    return null;
  },
});
