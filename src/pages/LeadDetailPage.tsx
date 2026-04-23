import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,

  ExternalLink,
  Trash2,
  CircleDot,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  PIPELINE_STATUSES,
  ISP_PROVIDERS,
  CHECK_STATUSES,
  getUpgradeRecommendation,
} from "@/lib/constants";
import type { Id } from "../../convex/_generated/dataModel";

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const lead = useQuery(
    api.leads.get,
    id ? { id: id as Id<"leads"> } : "skip"
  );
  const updateStatus = useMutation(api.leads.updateStatus);
  const updateNotes = useMutation(api.leads.updateNotes);
  const deleteLead = useMutation(api.leads.deleteLead);
  const upsertCheck = useMutation(api.checks.upsertCheck);
  const initChecks = useMutation(api.checks.initChecksForLead);
  const checkSingleLead = useAction(api.checker.checkSingleLead);
  const user = useQuery(api.auth.currentUser);

  const [notesValue, setNotesValue] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [autoChecking, setAutoChecking] = useState(false);

  if (!id) return null;
  if (lead === undefined) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    );
  }
  if (lead === null) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Lead not found</p>
        <Button asChild variant="link" className="mt-2 px-0">
          <Link to="/leads">Back to leads</Link>
        </Button>
      </div>
    );
  }

  const fullAddress = `${lead.address}, ${lead.city}, ${lead.state} ${lead.zip}`;
  const recommendation = getUpgradeRecommendation(
    lead.currentProducts,
    lead.checks
  );

  const handleStatusChange = async (status: string) => {
    await updateStatus({ id: lead._id, pipelineStatus: status });
    toast.success(`Status updated to ${status}`);
  };

  const handleSaveNotes = async () => {
    if (notesValue !== null) {
      await updateNotes({ id: lead._id, notes: notesValue });
      toast.success("Notes saved");
    }
  };

  const handleDelete = async () => {
    await deleteLead({ id: lead._id });
    toast.success("Lead deleted");
    navigate("/leads");
  };

  const handleInitChecks = async () => {
    await initChecks({ leadId: lead._id });
    toast.success("Checks initialized for all providers");
  };

  const handleManualCheck = (provider: (typeof ISP_PROVIDERS)[number]) => {
    window.open(provider.url, "_blank");
  };

  const handleSetCheckResult = async (provider: string, status: string) => {
    await upsertCheck({
      leadId: lead._id,
      provider,
      status,
      method: "manual",
      details: "Manually verified",
    });
    toast.success("Check result updated");
  };

  const handleAutoCheck = async () => {
    if (!user) return;
    setAutoChecking(true);
    try {
      const result = await checkSingleLead({
        leadId: lead._id,
        userId: user._id,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        zip: lead.zip,
      });
      if (result.success) {
        toast.success(
          `Auto-check complete: ${result.providersFound.length} providers found`
        );
      } else {
        toast.error(`Check failed: ${result.error}`);
      }
    } catch (e) {
      toast.error(
        `Check failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    } finally {
      setAutoChecking(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/leads">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {lead.businessName}
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
            <MapPin className="size-3" />
            {fullAddress}
          </p>
        </div>
        <Select
          value={lead.pipelineStatus}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STATUSES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className={`size-2 rounded-full ${s.color}`} />
                  {s.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Upgrade Recommendation */}
      <Card
        className={`border-border/50 ${
          recommendation.priority === "high"
            ? "border-orange-500/30 bg-orange-500/5"
            : recommendation.priority === "medium"
              ? "border-blue-500/30 bg-blue-500/5"
              : ""
        }`}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {recommendation.priority === "high"
                ? "🔥"
                : recommendation.priority === "medium"
                  ? "⚡"
                  : "📋"}
            </span>
            <div>
              <p className="font-semibold">{recommendation.label}</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                {recommendation.details.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Contact */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="size-4 text-muted-foreground" />
                <span className="text-sm">{lead.contactName}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="size-4 text-muted-foreground" />
                <a
                  href={`tel:${lead.phone}`}
                  className="text-sm text-blue-500 hover:underline"
                >
                  {lead.phone}
                </a>
              </div>
              {lead.phone2 && (
                <div className="flex items-center gap-3">
                  <Phone className="size-4 text-muted-foreground" />
                  <a
                    href={`tel:${lead.phone2}`}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {lead.phone2}
                  </a>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="size-4 text-muted-foreground" />
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Account Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.rep && (
                <div className="flex items-center gap-3">
                  <User className="size-4 text-muted-foreground" />
                  <span className="text-sm">Rep: {lead.rep}</span>
                </div>
              )}
              {lead.saleDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-sm">Sale: {lead.saleDate}</span>
                </div>
              )}
              {/* Account info shown from activePackages if available */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Current Products
                </p>
                <div className="flex flex-wrap gap-1">
                  {lead.currentProducts.length > 0 ? (
                    lead.currentProducts.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {p.replace("att_", "AT&T ").replace("_", " ")}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              {lead.activePackages && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Active Packages
                  </p>
                  <p className="text-sm">{lead.activePackages}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Add notes about this lead..."
                value={notesValue ?? lead.notes ?? ""}
                onChange={(e) => setNotesValue(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              {notesValue !== null && notesValue !== (lead.notes ?? "") && (
                <Button size="sm" className="mt-2" onClick={handleSaveNotes}>
                  Save Notes
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Delete */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive w-full"
              >
                <Trash2 className="size-4 mr-2" />
                Delete Lead
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{lead.businessName}"? This
                  will also remove all availability checks. This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Right column - ISP Checks */}
        <div className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  ISP Availability Checks
                </CardTitle>
                <div className="flex gap-2">
                  {lead.checks.length === 0 && (
                    <Button size="sm" variant="outline" onClick={handleInitChecks}>
                      Initialize Checks
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleAutoCheck}
                    disabled={autoChecking}
                  >
                    {autoChecking ? "Checking..." : "Auto-Check (FCC)"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Check if this address has service with competing ISPs.
                <br />
                <span className="text-green-500 font-medium">No Service</span>{" "}
                = good conversion target ·{" "}
                <span className="text-orange-500 font-medium">
                  Service Found
                </span>{" "}
                = competitor present
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ISP_PROVIDERS.map((provider) => {
                  const check = lead.checks.find(
                    (c) => c.provider === provider.id
                  );
                  const statusInfo = CHECK_STATUSES.find(
                    (s) => s.id === check?.status
                  );

                  return (
                    <div
                      key={provider.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/5 transition-colors"
                    >
                      <div className="text-2xl w-8 text-center">
                        {provider.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {provider.displayName}
                        </p>
                        {check?.details && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {check.details}
                          </p>
                        )}
                        {check?.checkedAt && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            <Clock className="size-2.5 inline mr-1" />
                            {new Date(check.checkedAt).toLocaleString()} ·{" "}
                            {check.method}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {check ? (
                          <Badge
                            variant="outline"
                            className={`${statusInfo?.color} gap-1.5`}
                          >
                            <CircleDot className="size-3" />
                            {statusInfo?.label || check.status}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground gap-1.5"
                          >
                            <CircleDot className="size-3" />
                            Not checked
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleManualCheck(provider)}
                          title={`Open ${provider.name} and check manually`}
                        >
                          <ExternalLink className="size-3 mr-1" />
                          Check
                        </Button>
                        <Select
                          value={check?.status || ""}
                          onValueChange={(v) =>
                            handleSetCheckResult(provider.id, v)
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue placeholder="Set result" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">
                              Service Found
                            </SelectItem>
                            <SelectItem value="not_available">
                              No Service
                            </SelectItem>
                            <SelectItem value="unknown">Unknown</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
