import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const list = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(v.object({
    _id: v.id("actionLogs"),
    action: v.string(),
    detail: v.optional(v.string()),
    integrationSlug: v.optional(v.string()),
    timestamp: v.number(),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("info")),
  })),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const logs = await ctx.db
      .query("actionLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
    return logs;
  },
});

export const add = internalMutation({
  args: {
    action: v.string(),
    detail: v.optional(v.string()),
    integrationSlug: v.optional(v.string()),
    status: v.union(v.literal("success"), v.literal("error"), v.literal("info")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("actionLogs", {
      ...args,
      timestamp: Date.now(),
    });
    return null;
  },
});
