import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    pipelineStatus: v.optional(v.string()),
    state: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    leads: v.array(
      v.object({
        _id: v.id("leads"),
        _creationTime: v.number(),
        businessName: v.string(),
        contactName: v.string(),
        phone: v.string(),
        phone2: v.optional(v.string()),
        email: v.optional(v.string()),
        address: v.string(),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
        rep: v.optional(v.string()),
        saleDate: v.optional(v.string()),
        
        currentProducts: v.array(v.string()),
        activePackages: v.optional(v.string()),
        pipelineStatus: v.string(),
        notes: v.optional(v.string()),
        checkSummary: v.object({
          total: v.number(),
          available: v.number(),
          notAvailable: v.number(),
          pending: v.number(),
        }),
      })
    ),
    hasMore: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { leads: [], hasMore: false };

    const limit = args.limit ?? 100;

    let leadsQuery;

    if (args.search && args.search.trim().length > 0) {
      // Use search index
      leadsQuery = ctx.db
        .query("leads")
        .withSearchIndex("search_business", (q) => {
          let search = q.search("businessName", args.search!).eq("userId", userId);
          if (args.pipelineStatus) search = search.eq("pipelineStatus", args.pipelineStatus);
          if (args.state) search = search.eq("state", args.state);
          return search;
        });
    } else if (args.pipelineStatus) {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", userId).eq("pipelineStatus", args.pipelineStatus!)
        );
    } else {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_user", (q) => q.eq("userId", userId));
    }

    // Filter by state if not using search (search handles it)
    let allLeads = await leadsQuery.take(limit + 1);

    if (args.state && !args.search) {
      allLeads = allLeads.filter((l) => l.state === args.state);
    }

    const hasMore = allLeads.length > limit;
    const leads = allLeads.slice(0, limit);

    // Get check summaries for each lead
    const leadsWithChecks = await Promise.all(
      leads.map(async (lead) => {
        const checks = await ctx.db
          .query("checks")
          .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
          .collect();

        const checkSummary = {
          total: checks.length,
          available: checks.filter((c) => c.status === "available").length,
          notAvailable: checks.filter((c) => c.status === "not_available").length,
          pending: checks.filter((c) => c.status === "pending").length,
        };

        return {
          _id: lead._id,
          _creationTime: lead._creationTime,
          businessName: lead.businessName,
          contactName: lead.contactName,
          phone: lead.phone,
          phone2: lead.phone2,
          email: lead.email,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          rep: lead.rep,
          saleDate: lead.saleDate,
          
          currentProducts: lead.currentProducts,
          activePackages: lead.activePackages,
          pipelineStatus: lead.pipelineStatus,
          notes: lead.notes,
          checkSummary,
        };
      })
    );

    return { leads: leadsWithChecks, hasMore };
  },
});

export const get = query({
  args: { id: v.id("leads") },
  returns: v.union(
    v.object({
      _id: v.id("leads"),
      _creationTime: v.number(),
      businessName: v.string(),
      contactName: v.string(),
      phone: v.string(),
      phone2: v.optional(v.string()),
      email: v.optional(v.string()),
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      rep: v.optional(v.string()),
      saleDate: v.optional(v.string()),
      
      currentProducts: v.array(v.string()),
      activePackages: v.optional(v.string()),
      pipelineStatus: v.string(),
      notes: v.optional(v.string()),
      checks: v.array(
        v.object({
          _id: v.id("checks"),
          provider: v.string(),
          status: v.string(),
          method: v.optional(v.string()),
          details: v.optional(v.string()),
          checkedAt: v.optional(v.number()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return null;

    const checks = await ctx.db
      .query("checks")
      .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
      .collect();

    return {
      _id: lead._id,
      _creationTime: lead._creationTime,
      businessName: lead.businessName,
      contactName: lead.contactName,
      phone: lead.phone,
      phone2: lead.phone2,
      email: lead.email,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      rep: lead.rep,
      saleDate: lead.saleDate,
      
      currentProducts: lead.currentProducts,
      activePackages: lead.activePackages,
      pipelineStatus: lead.pipelineStatus,
      notes: lead.notes,
      checks: checks.map((c) => ({
        _id: c._id,
        provider: c.provider,
        status: c.status,
        method: c.method,
        details: c.details,
        checkedAt: c.checkedAt,
      })),
    };
  },
});

export const getStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    new: v.number(),
    checking: v.number(),
    checked: v.number(),
    contacted: v.number(),
    converted: v.number(),
    skipped: v.number(),
    byProvider: v.array(
      v.object({
        provider: v.string(),
        available: v.number(),
        notAvailable: v.number(),
        pending: v.number(),
      })
    ),
    recentImports: v.array(
      v.object({
        _id: v.id("imports"),
        _creationTime: v.number(),
        fileName: v.string(),
        importedRows: v.number(),
        skippedRows: v.number(),
        status: v.string(),
      })
    ),
    states: v.array(v.string()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        total: 0,
        new: 0,
        checking: 0,
        checked: 0,
        contacted: 0,
        converted: 0,
        skipped: 0,
        byProvider: [],
        recentImports: [],
        states: [],
      };

    const allLeads = await ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const statusCounts: Record<string, number> = {};
    const stateSet = new Set<string>();
    for (const lead of allLeads) {
      statusCounts[lead.pipelineStatus] =
        (statusCounts[lead.pipelineStatus] || 0) + 1;
      if (lead.state) stateSet.add(lead.state);
    }

    // Provider stats
    const providers = ["spectrum", "att_plans", "att_air", "comcast", "frontier"];
    const byProvider = await Promise.all(
      providers.map(async (provider) => {
        const available = await ctx.db
          .query("checks")
          .withIndex("by_user_provider_status", (q) =>
            q.eq("userId", userId).eq("provider", provider).eq("status", "available")
          )
          .collect();
        const notAvailable = await ctx.db
          .query("checks")
          .withIndex("by_user_provider_status", (q) =>
            q.eq("userId", userId).eq("provider", provider).eq("status", "not_available")
          )
          .collect();
        const pending = await ctx.db
          .query("checks")
          .withIndex("by_user_provider_status", (q) =>
            q.eq("userId", userId).eq("provider", provider).eq("status", "pending")
          )
          .collect();
        return {
          provider,
          available: available.length,
          notAvailable: notAvailable.length,
          pending: pending.length,
        };
      })
    );

    const recentImports = await ctx.db
      .query("imports")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(5);

    return {
      total: allLeads.length,
      new: statusCounts["new"] || 0,
      checking: statusCounts["checking"] || 0,
      checked: statusCounts["checked"] || 0,
      contacted: statusCounts["contacted"] || 0,
      converted: statusCounts["converted"] || 0,
      skipped: statusCounts["skipped"] || 0,
      byProvider,
      recentImports: recentImports.map((i) => ({
        _id: i._id,
        _creationTime: i._creationTime,
        fileName: i.fileName,
        importedRows: i.importedRows,
        skippedRows: i.skippedRows,
        status: i.status,
      })),
      states: Array.from(stateSet).sort(),
    };
  },
});

export const importLeads = mutation({
  args: {
    leads: v.array(
      v.object({
        externalId: v.optional(v.string()),
        businessName: v.string(),
        contactName: v.string(),
        phone: v.string(),
        phone2: v.optional(v.string()),
        email: v.optional(v.string()),
        address: v.string(),
        address2: v.optional(v.string()),
        city: v.string(),
        state: v.string(),
        zip: v.string(),
        rep: v.optional(v.string()),
        leadRep: v.optional(v.string()),
        saleDate: v.optional(v.string()),
        paymentCleared: v.optional(v.string()),
        pipelineStatus: v.optional(v.string()),
        leadTemperature: v.optional(v.string()),
        language: v.optional(v.string()),
        callAttempts: v.optional(v.number()),
        lastCallAt: v.optional(v.string()),
        callable: v.optional(v.boolean()),
        badPhone: v.optional(v.boolean()),
        currentProducts: v.array(v.string()),
        activePackages: v.optional(v.string()),
        fgStatus: v.optional(v.string()),
        fgDepartment: v.optional(v.string()),
        fastgemId: v.optional(v.string()),
        lat: v.optional(v.string()),
        lng: v.optional(v.string()),
        createdAtSource: v.optional(v.string()),
        updatedAtSource: v.optional(v.string()),
      })
    ),
    fileName: v.string(),
  },
  returns: v.object({
    imported: v.number(),
    skipped: v.number(),
    importId: v.id("imports"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const importId = await ctx.db.insert("imports", {
      userId,
      fileName: args.fileName,
      totalRows: args.leads.length,
      importedRows: 0,
      skippedRows: 0,
      status: "processing",
    });

    let imported = 0;
    let skipped = 0;

    for (const lead of args.leads) {
      if (!lead.businessName || !lead.address || !lead.city || !lead.state || !lead.zip) {
        skipped++;
        continue;
      }
      await ctx.db.insert("leads", {
        userId,
        externalId: lead.externalId,
        businessName: lead.businessName,
        contactName: lead.contactName || "",
        phone: lead.phone || "",
        phone2: lead.phone2,
        email: lead.email,
        address: lead.address,
        address2: lead.address2,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
        rep: lead.rep,
        leadRep: lead.leadRep,
        saleDate: lead.saleDate,
        paymentCleared: lead.paymentCleared,
        pipelineStatus: lead.pipelineStatus || "new",
        leadTemperature: lead.leadTemperature,
        language: lead.language,
        callAttempts: lead.callAttempts,
        lastCallAt: lead.lastCallAt,
        callable: lead.callable,
        badPhone: lead.badPhone,
        currentProducts: lead.currentProducts || [],
        activePackages: lead.activePackages,
        fgStatus: lead.fgStatus,
        fgDepartment: lead.fgDepartment,
        fastgemId: lead.fastgemId,
        lat: lead.lat,
        lng: lead.lng,
        createdAtSource: lead.createdAtSource,
        updatedAtSource: lead.updatedAtSource,
        importId,
      });
      imported++;
    }

    await ctx.db.patch(importId, {
      importedRows: imported,
      skippedRows: skipped,
      status: "complete",
    });

    return { imported, skipped, importId };
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("leads"),
    pipelineStatus: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { pipelineStatus: args.pipelineStatus });
    return null;
  },
});

export const updateNotes = mutation({
  args: {
    id: v.id("leads"),
    notes: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(args.id, { notes: args.notes });
    return null;
  },
});

export const deleteLead = mutation({
  args: { id: v.id("leads") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) throw new Error("Not found");

    // Delete all checks for this lead
    const checks = await ctx.db
      .query("checks")
      .withIndex("by_lead", (q) => q.eq("leadId", args.id))
      .collect();
    for (const check of checks) {
      await ctx.db.delete(check._id);
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const bulkUpdateStatus = mutation({
  args: {
    ids: v.array(v.id("leads")),
    pipelineStatus: v.string(),
  },
  returns: v.object({ updated: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let updated = 0;
    for (const id of args.ids) {
      const lead = await ctx.db.get(id);
      if (lead && lead.userId === userId) {
        await ctx.db.patch(id, { pipelineStatus: args.pipelineStatus });
        updated++;
      }
    }
    return { updated };
  },
});

export const bulkDelete = mutation({
  args: { ids: v.array(v.id("leads")) },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let deleted = 0;
    for (const id of args.ids) {
      const lead = await ctx.db.get(id);
      if (lead && lead.userId === userId) {
        const checks = await ctx.db
          .query("checks")
          .withIndex("by_lead", (q) => q.eq("leadId", id))
          .collect();
        for (const check of checks) {
          await ctx.db.delete(check._id);
        }
        await ctx.db.delete(id);
        deleted++;
      }
    }
    return { deleted };
  },
});

export const exportLeads = query({
  args: {
    pipelineStatus: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      businessName: v.string(),
      contactName: v.string(),
      phone: v.string(),
      phone2: v.optional(v.string()),
      email: v.optional(v.string()),
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
      rep: v.optional(v.string()),
      saleDate: v.optional(v.string()),
      
      currentProducts: v.string(),
      activePackages: v.optional(v.string()),
      pipelineStatus: v.string(),
      notes: v.optional(v.string()),
      spectrum: v.string(),
      att_plans: v.string(),
      att_air: v.string(),
      comcast: v.string(),
      frontier: v.string(),
      upgradeRecommendation: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let leadsQuery;
    if (args.pipelineStatus) {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", userId).eq("pipelineStatus", args.pipelineStatus!)
        );
    } else {
      leadsQuery = ctx.db
        .query("leads")
        .withIndex("by_user", (q) => q.eq("userId", userId));
    }

    let leads = await leadsQuery.collect();

    if (args.state) {
      leads = leads.filter((l) => l.state === args.state);
    }

    return Promise.all(
      leads.map(async (lead) => {
        const checks = await ctx.db
          .query("checks")
          .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
          .collect();

        const checkMap: Record<string, string> = {};
        for (const c of checks) {
          checkMap[c.provider] = c.status;
        }

        // Smart upgrade recommendation
        const recommendation = getUpgradeRecommendation(
          lead.currentProducts,
          checkMap
        );

        return {
          businessName: lead.businessName,
          contactName: lead.contactName,
          phone: lead.phone,
          phone2: lead.phone2,
          email: lead.email,
          address: lead.address,
          city: lead.city,
          state: lead.state,
          zip: lead.zip,
          rep: lead.rep,
          saleDate: lead.saleDate,
          
          currentProducts: lead.currentProducts.join(", "),
          activePackages: lead.activePackages,
          pipelineStatus: lead.pipelineStatus,
          notes: lead.notes,
          spectrum: checkMap["spectrum"] || "unchecked",
          att_plans: checkMap["att_plans"] || "unchecked",
          att_air: checkMap["att_air"] || "unchecked",
          comcast: checkMap["comcast"] || "unchecked",
          frontier: checkMap["frontier"] || "unchecked",
          upgradeRecommendation: recommendation,
        };
      })
    );
  },
});

// Smart upgrade recommendation engine
function getUpgradeRecommendation(
  currentProducts: string[],
  checkResults: Record<string, string>
): string {
  const products = currentProducts.map((p) => p.toLowerCase());
  const recommendations: string[] = [];

  const hasDSL = products.some(
    (p) => p.includes("dsl") || p.includes("uverse") || p.includes("u-verse")
  );
  const hasPOTS = products.some(
    (p) => p.includes("pots") || p.includes("plain old")
  );
  const hasFiber = products.some(
    (p) => p.includes("fiber") || p.includes("fttn") || p.includes("fttp")
  );
  const hasSlowDSL = products.some(
    (p) =>
      p.includes("dsl_slow") ||
      p.includes("1.5m") ||
      p.includes("3m") ||
      p.includes("6m")
  );

  // No competitors = clean target
  const noCompetitors =
    checkResults["spectrum"] === "not_available" &&
    checkResults["comcast"] === "not_available" &&
    checkResults["frontier"] === "not_available";

  if (hasSlowDSL || hasPOTS) {
    recommendations.push("🔥 HIGH PRIORITY: Legacy service detected");
    recommendations.push("Upgrade to AT&T Fiber or AT&T Internet Air");
  } else if (hasDSL) {
    recommendations.push("⚡ Upgrade DSL to AT&T Fiber/Air for faster speeds");
  }

  if (noCompetitors) {
    recommendations.push("✅ No competing ISPs — strong conversion target");
  }

  if (checkResults["spectrum"] === "available") {
    recommendations.push("⚠️ Spectrum available — emphasize AT&T fiber speed advantage");
  }
  if (checkResults["comcast"] === "available") {
    recommendations.push("⚠️ Comcast available — highlight AT&T reliability & pricing");
  }

  if (!hasFiber && checkResults["att_plans"] === "available") {
    recommendations.push("📡 AT&T Fiber available at this address — pitch fiber upgrade");
  }

  if (checkResults["att_air"] === "available") {
    recommendations.push("📶 AT&T Internet Air available — good backup/secondary option");
  }

  return recommendations.length > 0
    ? recommendations.join(" | ")
    : "Standard follow-up recommended";
}
