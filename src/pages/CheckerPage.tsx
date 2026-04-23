import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ScanSearch,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ISP_PROVIDERS } from "@/lib/constants";
import { toast } from "sonner";

export function CheckerPage() {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    processed: number;
    errors: number;
  } | null>(null);

  const stats = useQuery(api.checker.getStats);
  const user = useQuery(api.auth.currentUser);
  const runBatchCheck = useAction(api.checker.runBatchCheck);

  const handleBatchCheck = async (batchSize: number) => {
    if (!user) return;
    setRunning(true);
    try {
      const result = await runBatchCheck({
        batchSize,
        userId: user._id,
      });
      setLastResult({ processed: result.processed, errors: result.errors });
      toast.success(
        `Batch complete: ${result.processed} checked, ${result.errors} errors`
      );
    } catch (e) {
      toast.error(
        `Batch failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setRunning(false);
    }
  };

  if (!stats) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Address Checker</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Auto-check ISP availability using FCC Broadband Data & Census
          geocoding
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unchecked</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.uncheckedLeads}
                </p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-lg">
                <Clock className="size-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Checked</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.checkedLeads}
                </p>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg">
                <CheckCircle className="size-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Checks</p>
                <p className="text-3xl font-bold mt-1">
                  {stats.totalChecks}
                </p>
              </div>
              <div className="bg-purple-500/10 p-3 rounded-lg">
                <Activity className="size-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-3xl font-bold mt-1">{stats.errors}</p>
              </div>
              <div className="bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="size-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Check Controls */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="size-5 text-yellow-500" />
            Run Batch Check
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Geocodes each address via Census Bureau, then checks FCC Broadband
            Database for provider availability. Providers not found are marked
            as "No Service". AT&T Air (fixed wireless) requires manual
            verification.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleBatchCheck(10)}
              disabled={running || stats.uncheckedLeads === 0}
              variant="outline"
              className="min-w-[120px]"
            >
              {running ? (
                <ScanSearch className="size-4 mr-2 animate-spin" />
              ) : (
                <ScanSearch className="size-4 mr-2" />
              )}
              Check 10
            </Button>
            <Button
              onClick={() => handleBatchCheck(50)}
              disabled={running || stats.uncheckedLeads === 0}
              variant="outline"
              className="min-w-[120px]"
            >
              <ScanSearch className="size-4 mr-2" />
              Check 50
            </Button>
            <Button
              onClick={() => handleBatchCheck(200)}
              disabled={running || stats.uncheckedLeads === 0}
              className="min-w-[120px]"
            >
              <ScanSearch className="size-4 mr-2" />
              Check 200
            </Button>
          </div>

          {stats.uncheckedLeads === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              No unchecked leads. Import more leads to run checks.
            </p>
          )}

          {lastResult && (
            <div className="mt-4 p-3 rounded-lg bg-accent/50 border border-border/50">
              <p className="text-sm">
                <CheckCircle className="size-4 inline mr-1 text-green-500" />
                Last batch: {lastResult.processed} processed
                {lastResult.errors > 0 && (
                  <span className="text-destructive">
                    , {lastResult.errors} errors
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Summary */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Provider Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.byProvider.map((bp) => {
              const provider = ISP_PROVIDERS.find((p) => p.id === bp.provider);
              const total = bp.total;

              return (
                <div
                  key={bp.provider}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border/50"
                >
                  <div className="text-2xl w-8 text-center">
                    {provider?.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {provider?.displayName || bp.provider}
                    </p>
                    {total > 0 && (
                      <div className="flex h-2 rounded-full overflow-hidden bg-muted mt-2">
                        <div
                          className="bg-green-500 transition-all"
                          style={{
                            width: `${total > 0 ? (bp.notAvailable / total) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="bg-orange-500 transition-all"
                          style={{
                            width: `${total > 0 ? (bp.available / total) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="bg-red-500 transition-all"
                          style={{
                            width: `${total > 0 ? (bp.error / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs shrink-0">
                    <Badge
                      variant="outline"
                      className="text-green-500 gap-1"
                    >
                      {bp.notAvailable} clean
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-orange-500 gap-1"
                    >
                      {bp.available} found
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      {bp.pending} pending
                    </Badge>
                    {bp.error > 0 && (
                      <Badge
                        variant="outline"
                        className="text-red-500 gap-1"
                      >
                        {bp.error} errors
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}

            {stats.byProvider.every((p) => p.total === 0) && (
              <div className="text-center py-6 text-muted-foreground">
                <ScanSearch className="size-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No checks yet</p>
                <p className="text-xs mt-1">
                  Import leads and use the batch checker above
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
