import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // Integration definitions (seeded: Asana, Slack Webhook, etc.)
  integrations: defineTable({
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
    // Configurable-integrations (prod parity): `configured` + `fieldStatus` are
    // denormalized onto the definition row so the public `integrations:list`
    // snapshot is self-contained (no join into integrationValues). The secret
    // values themselves stay in the integrationValues table (not listed publicly).
    configured: v.boolean(),
    fieldStatus: v.array(v.object({
      key: v.string(),
      hasValue: v.boolean(),
      preview: v.optional(v.string()),
    })),
  }).index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  // Stored credential values for each integration
  integrationValues: defineTable({
    integrationSlug: v.string(),
    key: v.string(),
    value: v.string(),
  }).index("by_slug_key", ["integrationSlug", "key"])
    .index("by_slug", ["integrationSlug"]),

  // Activity log
  actionLogs: defineTable({
    action: v.string(),
    detail: v.optional(v.string()),
    integrationSlug: v.optional(v.string()),
    timestamp: v.number(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("info")),
  }).index("by_timestamp", ["timestamp"]),
});

export default schema;
