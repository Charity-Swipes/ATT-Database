import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ScanSearch, FileUp, Target } from "lucide-react";
import { ISP_PROVIDERS } from "@/lib/constants";

export function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/5" />
        <div className="container max-w-5xl mx-auto px-4 py-24 relative">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-card text-sm text-muted-foreground">
              <ScanSearch className="size-4 text-blue-500" />
              ISP Availability Intelligence
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Qualify leads.{" "}
              <span className="text-blue-500">Find upgrades.</span>
              <br />
              Close faster.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Import your AT&T leads, auto-check ISP availability at every
              address, and identify the best upgrade targets — all in one tool.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button asChild size="lg" className="text-base">
                <Link to="/signup">
                  Get Started Free
                  <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container max-w-5xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3 p-6 rounded-xl border border-border/50 bg-card">
            <div className="size-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileUp className="size-6 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold">CSV Import</h3>
            <p className="text-sm text-muted-foreground">
              Upload your Lead Portal export. Auto-maps columns and imports
              thousands of leads in seconds.
            </p>
          </div>
          <div className="space-y-3 p-6 rounded-xl border border-border/50 bg-card">
            <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ScanSearch className="size-6 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold">5-Provider Check</h3>
            <p className="text-sm text-muted-foreground">
              Check each address against Spectrum, AT&T, Comcast, Frontier, and
              AT&T Air using FCC broadband data.
            </p>
          </div>
          <div className="space-y-3 p-6 rounded-xl border border-border/50 bg-card">
            <div className="size-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Target className="size-6 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold">Smart Recommendations</h3>
            <p className="text-sm text-muted-foreground">
              Auto-detect upgrade opportunities based on current products and
              competitive overlap. Prioritize your best targets.
            </p>
          </div>
        </div>
      </section>

      {/* Provider Logos */}
      <section className="container max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground mb-6">
          Checks availability against
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-lg">
          {ISP_PROVIDERS.map((p) => (
            <span key={p.id} className="text-muted-foreground">
              {p.icon} {p.name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
