export const APP_NAME = "ISP Lead Checker";

// Pipeline statuses — includes Lead Portal statuses + checker statuses
export const PIPELINE_STATUSES = [
  { id: "new", label: "New", color: "bg-blue-500", textColor: "text-blue-500" },
  { id: "calling", label: "Calling", color: "bg-amber-500", textColor: "text-amber-500" },
  { id: "callback", label: "Callback", color: "bg-orange-400", textColor: "text-orange-400" },
  { id: "contact", label: "Contact", color: "bg-teal-500", textColor: "text-teal-500" },
  { id: "verified", label: "Verified", color: "bg-indigo-500", textColor: "text-indigo-500" },
  { id: "closer_calling", label: "Closer Calling", color: "bg-pink-500", textColor: "text-pink-500" },
  { id: "closer_contact", label: "Closer Contact", color: "bg-rose-500", textColor: "text-rose-500" },
  { id: "closer_verified", label: "Closer Verified", color: "bg-fuchsia-500", textColor: "text-fuchsia-500" },
  { id: "checking", label: "Checking", color: "bg-yellow-500", textColor: "text-yellow-500" },
  { id: "checked", label: "Checked", color: "bg-purple-500", textColor: "text-purple-500" },
  { id: "contacted", label: "Contacted", color: "bg-cyan-500", textColor: "text-cyan-500" },
  { id: "converted", label: "Converted", color: "bg-emerald-500", textColor: "text-emerald-500" },
  { id: "skipped", label: "Skipped", color: "bg-zinc-400", textColor: "text-zinc-400" },
] as const;

// ISP Providers
export const ISP_PROVIDERS = [
  { id: "spectrum", name: "Spectrum", displayName: "Spectrum (Charter)", icon: "📡", url: "https://www.allconnect.com/providers/spectrum/availability" },
  { id: "att_plans", name: "AT&T Plans", displayName: "AT&T Internet", icon: "🌐", url: "https://www.att.com/buy/internet/plans" },
  { id: "att_air", name: "AT&T Air", displayName: "AT&T Internet Air", icon: "📶", url: "https://mst.att.com/business/internet-air#tab-2" },
  { id: "comcast", name: "Comcast", displayName: "Comcast Business", icon: "📺", url: "https://business.comcast.com/shop/gateway" },
  { id: "frontier", name: "Frontier", displayName: "Frontier Fiber", icon: "🔴", url: "https://frontier.com/" },
] as const;

// Check statuses
export const CHECK_STATUSES = [
  { id: "pending", label: "Pending", color: "text-muted-foreground", bgColor: "bg-muted" },
  { id: "available", label: "Service Found", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  { id: "not_available", label: "No Service", color: "text-green-500", bgColor: "bg-green-500/10" },
  { id: "unknown", label: "Unknown", color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
  { id: "error", label: "Error", color: "text-red-500", bgColor: "bg-red-500/10" },
] as const;

// Column mapping labels for CSV import — matches Lead Portal export
export const COLUMN_LABELS: Record<string, string> = {
  externalId: "Lead Portal ID",
  businessName: "Business Name",
  contactName: "Contact / Customer Name",
  phone: "Phone",
  phone2: "Secondary Phone",
  email: "Email",
  address: "Address",
  address2: "Address Line 2",
  city: "City",
  state: "State",
  zip: "ZIP Code",
  rep: "Sales Rep",
  leadRep: "Lead Rep",
  saleDate: "WO/Sale Date",
  paymentCleared: "Payment Cleared",
  pipelineStatus: "Lead Status",
  leadTemperature: "Temperature",
  language: "Language",
  callAttempts: "Call Attempts",
  lastCallAt: "Last Call At",
  callable: "Callable",
  badPhone: "Bad Phone",
  currentProducts: "Current Products / Packages",
  activePackages: "Active Packages (raw)",
  fgStatus: "FG Status",
  fgDepartment: "FG Department",
  fastgemId: "FastGem ID",
  lat: "Latitude",
  lng: "Longitude",
  createdAtSource: "Created At (source)",
  updatedAtSource: "Updated At (source)",
};

// Required fields for import
export const REQUIRED_IMPORT_FIELDS = ["businessName", "address", "city", "state", "zip"];

// Auto-mapping aliases for CSV columns (Lead Portal format + generic)
export const COLUMN_ALIASES: Record<string, string[]> = {
  externalId: ["id", "lead id", "external id", "portal id", "lead_id"],
  businessName: ["biz_name", "biz name", "business name", "business", "company", "company name", "account name", "dba"],
  contactName: ["customer", "contact name", "contact", "name", "full name", "person", "contact person"],
  phone: ["phone", "phone1", "phone number", "telephone", "tel", "primary phone", "main phone"],
  phone2: ["secondary_phone", "phone2", "phone 2", "secondary phone", "alt phone", "alternate phone", "mobile"],
  email: ["email", "email address", "e-mail", "contact email"],
  address: ["address", "street", "street address", "address1", "address 1", "location"],
  address2: ["address2", "address 2", "address line 2", "suite", "unit", "apt"],
  city: ["city", "town"],
  state: ["us_state", "state", "st", "province"],
  zip: ["zip", "zip code", "zipcode", "postal", "postal code"],
  rep: ["rep", "sales rep", "representative", "agent", "salesperson"],
  leadRep: ["lead_rep", "lead rep"],
  saleDate: ["wo_sale_date", "sale date", "date", "sold date", "close date", "install date"],
  paymentCleared: ["payment_cleared", "payment cleared", "cleared"],
  pipelineStatus: ["lead_status", "lead status", "status", "pipeline status"],
  leadTemperature: ["lead_temperature", "lead temperature", "temperature", "temp"],
  language: ["language", "lang"],
  callAttempts: ["call_attempts", "call attempts", "calls", "attempts"],
  lastCallAt: ["last_call_at", "last call at", "last call", "last called"],
  callable: ["callable", "can call"],
  badPhone: ["bad_phone", "bad phone"],
  currentProducts: ["all_packages", "all packages", "current products", "products", "services", "current services", "product", "active_packages", "active packages"],
  activePackages: ["all_packages", "packages", "package", "plan", "plans"],
  fgStatus: ["fg_status", "fg status", "fastgem status"],
  fgDepartment: ["fg_department", "fg department", "fastgem department", "department"],
  fastgemId: ["fastgem_id", "fastgem id", "fg id", "fg_id"],
  lat: ["lat", "latitude"],
  lng: ["lng", "longitude", "lon", "long"],
  createdAtSource: ["created_at", "created at", "date created"],
  updatedAtSource: ["updated_at", "updated at", "date updated", "last updated"],
};

// Smart upgrade recommendation helpers
export function getUpgradeRecommendation(
  currentProducts: string[],
  checks: Array<{ provider: string; status: string }>
): { priority: "high" | "medium" | "low"; label: string; details: string[] } {
  const products = currentProducts.map((p) => p.toLowerCase());
  const checkMap: Record<string, string> = {};
  for (const c of checks) {
    checkMap[c.provider] = c.status;
  }
  const details: string[] = [];

  const hasDSL = products.some((p) => p.includes("dsl") || p.includes("uverse") || p.includes("u-verse"));
  const hasPOTS = products.some((p) => p.includes("pots") || p.includes("plain old") || p.includes("retention pots"));
  const hasSlowDSL = products.some((p) => p.includes("1.5m") || p.includes("3m") || p.includes("6m") || p.includes("dsl_slow"));
  const hasMidDSL = products.some((p) => p.includes("25m") || p.includes("45m") || p.includes("50m") || p.includes("dsl_mid"));
  const hasFiber = products.some((p) => p.includes("fiber") || p.includes("fttp"));
  const hasRetention = products.some((p) => p.includes("retention"));
  const hasVOIP = products.some((p) => p.includes("voip"));
  const hasDTV = products.some((p) => p.includes("directv") || p.includes("dtv"));
  const hasDISH = products.some((p) => p.includes("dish"));

  const noCompetitors =
    checkMap.spectrum === "not_available" &&
    checkMap.comcast === "not_available" &&
    checkMap.frontier === "not_available";

  let priority: "high" | "medium" | "low" = "low";

  // High priority: legacy slow DSL or POTS — strongest upgrade candidates
  if (hasSlowDSL || hasPOTS) {
    priority = "high";
    details.push("Legacy/slow service — strong upgrade candidate");
  } else if (hasMidDSL && !hasFiber) {
    priority = "high";
    details.push("Mid-tier DSL — fiber upgrade target");
  } else if (hasDSL && !hasFiber) {
    priority = "medium";
    details.push("DSL customer — fiber/air upgrade available");
  }

  // Retention customers are already flagged for attention
  if (hasRetention) {
    if (priority === "low") priority = "medium";
    details.push("Retention account — existing AT&T relationship");
  }

  if (hasVOIP) {
    details.push("Has VOIP service — bundle opportunity");
  }

  if (hasDTV) {
    details.push("DirecTV customer — bundle with internet upgrade");
  } else if (hasDISH) {
    details.push("DISH customer — opportunity to win video too");
  }

  if (noCompetitors) {
    if (priority === "low") priority = "medium";
    details.push("No competing ISPs at address");
  }

  if (checkMap.spectrum === "available") details.push("⚠️ Spectrum available — competitive pressure");
  if (checkMap.comcast === "available") details.push("⚠️ Comcast available — competitive pressure");
  if (checkMap.att_plans === "available" && !hasFiber) details.push("AT&T Fiber available — pitch upgrade");
  if (checkMap.att_air === "available") details.push("AT&T Air available as option");

  const label = priority === "high" ? "🔥 High Priority" : priority === "medium" ? "⚡ Medium Priority" : "📋 Standard";

  return { priority, label, details: details.length > 0 ? details : ["Standard follow-up recommended"] };
}
