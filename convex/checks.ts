import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const PROVIDERS = ["spectrum", "att_plans", "att_air", "comcast", "frontier"];

export const initChecksForLead = mutation({
  args: { leadId: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.userId !== userId) throw new Error("Not found");

    for (const provider of PROVIDERS) {
      // Check if already exists
      const existing = await ctx.db
        .query("checks")
        .withIndex("by_lead_provider", (q) =>
          q.eq("leadId", args.leadId).eq("provider", provider)
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("checks", {
          leadId: args.leadId,
          userId,
          provider,
          status: "pending",
        });
      }
    }
    return null;
  },
});

export const upsertCheck = mutation({
  args: {
    leadId: v.id("leads"),
    provider: v.string(),
    status: v.string(),
    method: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lead = await ctx.db.get(args.leadId);
    if (!lead || lead.userId !== userId) throw new Error("Not found");

    const existing = await ctx.db
      .query("checks")
      .withIndex("by_lead_provider", (q) =>
        q.eq("leadId", args.leadId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        method: args.method || "manual",
        details: args.details,
        checkedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("checks", {
        leadId: args.leadId,
        userId,
        provider: args.provider,
        status: args.status,
        method: args.method || "manual",
        details: args.details,
        checkedAt: Date.now(),
      });
    }
    return null;
  },
});
