import { v } from "convex/values";
import { query, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const PROVIDERS = ["spectrum", "att_plans", "att_air", "comcast", "frontier"];

export const getStats = query({
  args: {},
  returns: v.object({
    totalLeads: v.number(),
    uncheckedLeads: v.number(),
    checkedLeads: v.number(),
    totalChecks: v.number(),
    pendingChecks: v.number(),
    completedChecks: v.number(),
    errors: v.number(),
    byProvider: v.array(
      v.object({
        provider: v.string(),
        total: v.number(),
        available: v.number(),
        notAvailable: v.number(),
        pending: v.number(),
        error: v.number(),
      })
    ),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId)
      return {
        totalLeads: 0,
        uncheckedLeads: 0,
        checkedLeads: 0,
        totalChecks: 0,
        pendingChecks: 0,
        completedChecks: 0,
        errors: 0,
        byProvider: [],
      };

    const allLeads = await ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const newLeads = allLeads.filter((l) => l.pipelineStatus === "new");
    const checkedLeads = allLeads.filter(
      (l) => l.pipelineStatus !== "new" && l.pipelineStatus !== "checking"
    );

    const byProvider = await Promise.all(
      PROVIDERS.map(async (provider) => {
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
        const error = await ctx.db
          .query("checks")
          .withIndex("by_user_provider_status", (q) =>
            q.eq("userId", userId).eq("provider", provider).eq("status", "error")
          )
          .collect();

        return {
          provider,
          total: available.length + notAvailable.length + pending.length + error.length,
          available: available.length,
          notAvailable: notAvailable.length,
          pending: pending.length,
          error: error.length,
        };
      })
    );

    const totalChecks = byProvider.reduce((s, p) => s + p.total, 0);
    const pendingChecks = byProvider.reduce((s, p) => s + p.pending, 0);
    const errorChecks = byProvider.reduce((s, p) => s + p.error, 0);

    return {
      totalLeads: allLeads.length,
      uncheckedLeads: newLeads.length,
      checkedLeads: checkedLeads.length,
      totalChecks,
      pendingChecks,
      completedChecks: totalChecks - pendingChecks - errorChecks,
      errors: errorChecks,
      byProvider,
    };
  },
});

// FCC BDC API lookup for broadband availability
async function checkFCCBroadband(
  address: string,
  city: string,
  state: string,
  zip: string
): Promise<Array<{ provider: string; technology: string; maxDown: number; maxUp: number }>> {
  try {
    // Step 1: Geocode the address using Census Bureau geocoder
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;
    const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(fullAddress)}&benchmark=Public_AR_Current&format=json`;

    const geoResponse = await fetch(geocodeUrl);
    if (!geoResponse.ok) {
      console.log(`Geocode HTTP error: ${geoResponse.status}`);
      return [];
    }

    const geoData = await geoResponse.json();
    const matches = geoData?.result?.addressMatches;
    if (!matches || matches.length === 0) {
      console.log(`No geocode match for: ${fullAddress}`);
      return [];
    }

    const { x: longitude, y: latitude } = matches[0].coordinates;

    // Step 2: Query FCC BDC API for broadband availability
    const fccUrl = `https://broadbandmap.fcc.gov/api/location-summary/fixed?latitude=${latitude}&longitude=${longitude}&speed_type=download&technology_code=0&category=all`;

    const fccResponse = await fetch(fccUrl, {
      headers: { "User-Agent": "ISPLeadChecker/1.0" },
    });

    if (!fccResponse.ok) {
      console.log(`FCC API HTTP error: ${fccResponse.status}`);
      // Try the alternative endpoint
      const altUrl = `https://broadbandmap.fcc.gov/location-summary/fixed?latitude=${latitude}&longitude=${longitude}&addr_full=${encodeURIComponent(fullAddress)}&speed=25&latency=0&category=all`;
      const altResponse = await fetch(altUrl, {
        headers: { "User-Agent": "ISPLeadChecker/1.0" },
      });
      if (!altResponse.ok) return [];
      // Parse alt response...
      return [];
    }

    const fccData = await fccResponse.json();
    const results: Array<{ provider: string; technology: string; maxDown: number; maxUp: number }> = [];

    if (fccData?.data) {
      for (const entry of fccData.data) {
        results.push({
          provider: entry.brand_name || entry.provider_name || "Unknown",
          technology: entry.technology_description || "Unknown",
          maxDown: entry.max_advertised_download_speed || 0,
          maxUp: entry.max_advertised_upload_speed || 0,
        });
      }
    }

    return results;
  } catch (error) {
    console.error("FCC check error:", error);
    return [];
  }
}

// Map FCC provider names to our provider IDs
function mapFCCProvider(providerName: string): string | null {
  const name = providerName.toLowerCase();
  if (name.includes("spectrum") || name.includes("charter")) return "spectrum";
  if (name.includes("at&t") || name.includes("att") || name.includes("bellsouth")) return "att_plans";
  if (name.includes("comcast") || name.includes("xfinity")) return "comcast";
  if (name.includes("frontier")) return "frontier";
  // AT&T Air (fixed wireless) is harder to detect from FCC data
  return null;
}

export const updateCheckResult = internalMutation({
  args: {
    leadId: v.id("leads"),
    userId: v.id("users"),
    provider: v.string(),
    status: v.string(),
    method: v.string(),
    details: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("checks")
      .withIndex("by_lead_provider", (q) =>
        q.eq("leadId", args.leadId).eq("provider", args.provider)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        method: args.method,
        details: args.details,
        checkedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("checks", {
        leadId: args.leadId,
        userId: args.userId,
        provider: args.provider,
        status: args.status,
        method: args.method,
        details: args.details,
        checkedAt: Date.now(),
      });
    }
    return null;
  },
});

export const updateLeadStatus = internalMutation({
  args: {
    leadId: v.id("leads"),
    pipelineStatus: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, { pipelineStatus: args.pipelineStatus });
    return null;
  },
});

export const getLeadsForChecking = internalMutation({
  args: {
    userId: v.id("users"),
    batchSize: v.number(),
  },
  returns: v.array(
    v.object({
      _id: v.id("leads"),
      address: v.string(),
      city: v.string(),
      state: v.string(),
      zip: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.userId).eq("pipelineStatus", "new")
      )
      .take(args.batchSize);

    // Mark them as checking
    for (const lead of leads) {
      await ctx.db.patch(lead._id, { pipelineStatus: "checking" });
    }

    return leads.map((l) => ({
      _id: l._id,
      address: l.address,
      city: l.city,
      state: l.state,
      zip: l.zip,
    }));
  },
});

export const runBatchCheck = action({
  args: {
    batchSize: v.number(),
    userId: v.id("users"),
  },
  returns: v.object({
    processed: v.number(),
    errors: v.number(),
    results: v.array(
      v.object({
        leadId: v.string(),
        providersFound: v.array(v.string()),
        error: v.optional(v.string()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    // Get leads to check
    const leads = await ctx.runMutation(internal.checker.getLeadsForChecking, {
      userId: args.userId,
      batchSize: args.batchSize,
    });

    let processed = 0;
    let errors = 0;
    const results: Array<{
      leadId: string;
      providersFound: string[];
      error?: string;
    }> = [];

    for (const lead of leads) {
      try {
        // Check FCC broadband data
        const fccResults = await checkFCCBroadband(
          lead.address,
          lead.city,
          lead.state,
          lead.zip
        );

        const providersFound: string[] = [];
        const foundProviders = new Set<string>();

        // Map FCC results to our providers
        for (const result of fccResults) {
          const mappedProvider = mapFCCProvider(result.provider);
          if (mappedProvider && !foundProviders.has(mappedProvider)) {
            foundProviders.add(mappedProvider);
            providersFound.push(mappedProvider);

            await ctx.runMutation(internal.checker.updateCheckResult, {
              leadId: lead._id,
              userId: args.userId,
              provider: mappedProvider,
              status: "available",
              method: "fcc_bdc",
              details: `${result.provider} - ${result.technology} (${result.maxDown}/${result.maxUp} Mbps)`,
            });
          }
        }

        // Mark providers NOT found as not_available
        const allProviders = ["spectrum", "att_plans", "comcast", "frontier"];
        for (const provider of allProviders) {
          if (!foundProviders.has(provider)) {
            await ctx.runMutation(internal.checker.updateCheckResult, {
              leadId: lead._id,
              userId: args.userId,
              provider,
              status: "not_available",
              method: "fcc_bdc",
              details: "Not found in FCC broadband database",
            });
          }
        }

        // AT&T Air is fixed wireless - set to unknown from FCC data
        if (!foundProviders.has("att_air")) {
          await ctx.runMutation(internal.checker.updateCheckResult, {
            leadId: lead._id,
            userId: args.userId,
            provider: "att_air",
            status: "unknown",
            method: "fcc_bdc",
            details: "Fixed wireless not reliably tracked in FCC data - verify manually",
          });
        }

        // Update lead status to checked
        await ctx.runMutation(internal.checker.updateLeadStatus, {
          leadId: lead._id,
          pipelineStatus: "checked",
        });

        processed++;
        results.push({ leadId: lead._id, providersFound });
      } catch (error) {
        errors++;
        // Update lead status back to new on error
        await ctx.runMutation(internal.checker.updateLeadStatus, {
          leadId: lead._id,
          pipelineStatus: "new",
        });

        results.push({
          leadId: lead._id,
          providersFound: [],
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return { processed, errors, results };
  },
});

export const checkSingleLead = action({
  args: {
    leadId: v.id("leads"),
    userId: v.id("users"),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    providersFound: v.array(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    try {
      await ctx.runMutation(internal.checker.updateLeadStatus, {
        leadId: args.leadId,
        pipelineStatus: "checking",
      });

      const fccResults = await checkFCCBroadband(
        args.address,
        args.city,
        args.state,
        args.zip
      );

      const providersFound: string[] = [];
      const foundProviders = new Set<string>();

      for (const result of fccResults) {
        const mappedProvider = mapFCCProvider(result.provider);
        if (mappedProvider && !foundProviders.has(mappedProvider)) {
          foundProviders.add(mappedProvider);
          providersFound.push(mappedProvider);

          await ctx.runMutation(internal.checker.updateCheckResult, {
            leadId: args.leadId,
            userId: args.userId,
            provider: mappedProvider,
            status: "available",
            method: "fcc_bdc",
            details: `${result.provider} - ${result.technology} (${result.maxDown}/${result.maxUp} Mbps)`,
          });
        }
      }

      const allProviders = ["spectrum", "att_plans", "comcast", "frontier"];
      for (const provider of allProviders) {
        if (!foundProviders.has(provider)) {
          await ctx.runMutation(internal.checker.updateCheckResult, {
            leadId: args.leadId,
            userId: args.userId,
            provider,
            status: "not_available",
            method: "fcc_bdc",
            details: "Not found in FCC broadband database",
          });
        }
      }

      if (!foundProviders.has("att_air")) {
        await ctx.runMutation(internal.checker.updateCheckResult, {
          leadId: args.leadId,
          userId: args.userId,
          provider: "att_air",
          status: "unknown",
          method: "fcc_bdc",
          details: "Fixed wireless - verify manually",
        });
      }

      await ctx.runMutation(internal.checker.updateLeadStatus, {
        leadId: args.leadId,
        pipelineStatus: "checked",
      });

      return { success: true, providersFound };
    } catch (error) {
      await ctx.runMutation(internal.checker.updateLeadStatus, {
        leadId: args.leadId,
        pipelineStatus: "new",
      });

      return {
        success: false,
        providersFound: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
