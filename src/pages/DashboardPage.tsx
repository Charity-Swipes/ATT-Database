import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Users,
  UserPlus,
  CheckCircle,
  TrendingUp,
  FileUp,
  ScanSearch,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PIPELINE_STATUSES, ISP_PROVIDERS } from "@/lib/constants";

export function DashboardPage() {
  const stats = useQuery(api.leads.getStats);

  if (!stats) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Leads",
      value: stats.total.toLocaleString(),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "New Leads",
      value: stats.new.toLocaleString(),
      icon: UserPlus,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Checked",
      value: stats.checked.toLocaleString(),
      icon: CheckCircle,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Converted",
      value: stats.converted.toLocaleString(),
      icon: TrendingUp,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Lead qualification overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/import">
              <FileUp className="size-4 mr-2" />
              Import Leads
            </Link>
          </Button>
          <Button asChild>
            <Link to="/checker">
              <ScanSearch className="size-4 mr-2" />
              Run Checker
            </Link>
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`size-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline + ISP Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Status */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {PIPELINE_STATUSES.map((status) => {
                const count =
                  stats[status.id as keyof typeof stats] as number || 0;
                const pct =
                  stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={status.id} className="flex items-center gap-3">
                    <div
                      className={`size-3 rounded-full ${status.color}`}
                    />
                    <span className="text-sm w-24">{status.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${status.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-16 text-right">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ISP Availability Results */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ISP Availability Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byProvider.map((bp) => {
                const provider = ISP_PROVIDERS.find(
                  (p) => p.id === bp.provider
                );
                const total = bp.available + bp.notAvailable + bp.pending;
                return (
                  <div key={bp.provider} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {provider?.icon} {provider?.name || bp.provider}
                      </span>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="text-green-500">
                          {bp.notAvailable} clean
                        </span>
                        <span className="text-orange-500">
                          {bp.available} found
                        </span>
                        <span>{bp.pending} pending</span>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="bg-green-500 transition-all"
                          style={{
                            width: `${(bp.notAvailable / total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-orange-500 transition-all"
                          style={{
                            width: `${(bp.available / total) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              {stats.byProvider.every(
                (p) => p.available + p.notAvailable + p.pending === 0
              ) && (
                <div className="text-center py-6 text-muted-foreground">
                  <ScanSearch className="size-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No availability checks yet</p>
                  <p className="text-xs mt-1">
                    Import leads and run the checker to see results
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Imports */}
      {stats.recentImports.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentImports.map((imp) => (
                <div
                  key={imp._id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{imp.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(imp._creationTime).toLocaleDateString()} ·{" "}
                        {imp.importedRows} imported
                        {imp.skippedRows > 0 && `, ${imp.skippedRows} skipped`}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      imp.status === "complete" ? "default" : "destructive"
                    }
                  >
                    {imp.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-12">
            <div className="text-center">
              <FileUp className="size-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No leads yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                Import your leads from a CSV file to get started. We'll help you
                map the columns and check ISP availability.
              </p>
              <Button asChild>
                <Link to="/import">
                  <FileUp className="size-4 mr-2" />
                  Import Your First Leads
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
