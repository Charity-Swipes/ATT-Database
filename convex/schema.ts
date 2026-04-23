import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  leads: defineTable({
    userId: v.id("users"),
    // Core identifiers
    externalId: v.optional(v.string()), // Lead Portal id
    businessName: v.string(),
    contactName: v.string(),
    phone: v.string(),
    phone2: v.optional(v.string()),
    email: v.optional(v.string()),
    // Address
    address: v.string(),
    address2: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    zip: v.string(),
    lat: v.optional(v.string()),
    lng: v.optional(v.string()),
    // Sales / pipeline
    rep: v.optional(v.string()),
    leadRep: v.optional(v.string()),
    saleDate: v.optional(v.string()),
    paymentCleared: v.optional(v.string()),
    pipelineStatus: v.string(), // new, calling, contact, callback, verified, closer_calling, closer_contact, closer_verified, checking, checked, contacted, converted, skipped
    leadTemperature: v.optional(v.string()), // hot, warm, cold, ""
    language: v.optional(v.string()), // english, spanish, other
    // Telephony
    callAttempts: v.optional(v.number()),
    lastCallAt: v.optional(v.string()),
    callable: v.optional(v.boolean()),
    badPhone: v.optional(v.boolean()),
    // Products
    currentProducts: v.array(v.string()),
    activePackages: v.optional(v.string()),
    // FastGem
    fgStatus: v.optional(v.string()),
    fgDepartment: v.optional(v.string()),
    fastgemId: v.optional(v.string()),
    // Metadata
    notes: v.optional(v.string()),
    importId: v.optional(v.id("imports")),
    createdAtSource: v.optional(v.string()),
    updatedAtSource: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "pipelineStatus"])
    .index("by_user_state", ["userId", "state"])
    .index("by_import", ["importId"])
    .searchIndex("search_business", {
      searchField: "businessName",
      filterFields: ["userId", "pipelineStatus", "state"],
    }),

  checks: defineTable({
    leadId: v.id("leads"),
    userId: v.id("users"),
    provider: v.string(), // spectrum, att_plans, att_air, comcast, frontier
    status: v.string(), // pending, available, not_available, unknown, error
    method: v.optional(v.string()), // manual, auto, fcc_bdc
    details: v.optional(v.string()),
    checkedAt: v.optional(v.number()),
  })
    .index("by_lead", ["leadId"])
    .index("by_lead_provider", ["leadId", "provider"])
    .index("by_user_provider_status", ["userId", "provider", "status"]),

  imports: defineTable({
    userId: v.id("users"),
    fileName: v.string(),
    totalRows: v.number(),
    importedRows: v.number(),
    skippedRows: v.number(),
    status: v.string(), // processing, complete, error
    columnMappings: v.optional(v.string()), // JSON string of mappings
  }).index("by_user", ["userId"]),
});
