import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  ChevronRight,
  Trash2,
  CheckSquare,
  Square,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PIPELINE_STATUSES } from "@/lib/constants";
import type { Id } from "../../convex/_generated/dataModel";

export function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const stats = useQuery(api.leads.getStats);
  const leads = useQuery(api.leads.list, {
    search: search || undefined,
    pipelineStatus: statusFilter !== "all" ? statusFilter : undefined,
    state: stateFilter !== "all" ? stateFilter : undefined,
    limit: 100,
  });
  const exportData = useQuery(api.leads.exportLeads, {
    pipelineStatus: statusFilter !== "all" ? statusFilter : undefined,
    state: stateFilter !== "all" ? stateFilter : undefined,
  });

  const bulkUpdateStatus = useMutation(api.leads.bulkUpdateStatus);
  const bulkDelete = useMutation(api.leads.bulkDelete);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (!leads) return;
    if (selectedIds.size === leads.leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.leads.map((l) => l._id)));
    }
  };

  const handleBulkStatus = async (status: string) => {
    const ids = Array.from(selectedIds) as Id<"leads">[];
    await bulkUpdateStatus({ ids, pipelineStatus: status });
    toast.success(`Updated ${ids.length} leads to ${status}`);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds) as Id<"leads">[];
    await bulkDelete({ ids });
    toast.success(`Deleted ${ids.length} leads`);
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    if (!exportData || exportData.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Business Name", "Contact Name", "Phone", "Phone 2", "Email",
      "Address", "City", "State", "ZIP", "Rep", "Sale Date",
      "Account Number", "Current Products", "Active Packages",
      "Pipeline Status", "Notes", "Spectrum", "AT&T Plans",
      "AT&T Air", "Comcast", "Frontier", "Upgrade Recommendation",
    ];

    const rows = exportData.map((lead) => [
      lead.businessName, lead.contactName, lead.phone, lead.phone2 || "",
      lead.email || "", lead.address, lead.city, lead.state, lead.zip,
      lead.rep || "", lead.saleDate || "",
      lead.currentProducts, lead.activePackages || "", lead.pipelineStatus,
      lead.notes || "", lead.spectrum, lead.att_plans, lead.att_air,
      lead.comcast, lead.frontier, lead.upgradeRecommendation,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportData.length} leads`);
  };

  const getStatusBadge = (status: string) => {
    const s = PIPELINE_STATUSES.find((p) => p.id === status);
    return (
      <Badge variant="outline" className={`${s?.textColor} gap-1.5`}>
        <div className={`size-2 rounded-full ${s?.color}`} />
        {s?.label || status}
      </Badge>
    );
  };

  const getCheckSummaryBadge = (summary: {
    total: number;
    available: number;
    notAvailable: number;
    pending: number;
  }) => {
    if (summary.total === 0) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex gap-1.5 text-xs">
        {summary.notAvailable > 0 && (
          <span className="text-green-500">{summary.notAvailable}✓</span>
        )}
        {summary.available > 0 && (
          <span className="text-orange-500">{summary.available}!</span>
        )}
        {summary.pending > 0 && (
          <span className="text-muted-foreground">{summary.pending}…</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats?.total.toLocaleString() || 0} total leads
          </p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="size-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search business name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="size-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
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
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {(stats?.states || []).map((st) => (
              <SelectItem key={st} value={st}>
                {st}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50 border border-border/50">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="size-4 mr-1" />
                Bulk Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {PIPELINE_STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onClick={() => handleBulkStatus(s.id)}
                >
                  <div className={`size-2 rounded-full ${s.color} mr-2`} />
                  Set to {s.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleBulkDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4 mr-2" />
                Delete Selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {!leads ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading leads...
            </div>
          ) : leads.leads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm">No leads found</p>
              <p className="text-xs mt-1">
                Try adjusting your filters or import some leads
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10">
                      <button onClick={toggleAll} className="p-1">
                        {selectedIds.size === leads.leads.length &&
                        leads.leads.length > 0 ? (
                          <CheckSquare className="size-4" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ISP Checks</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.leads.map((lead) => (
                    <TableRow key={lead._id} className="group">
                      <TableCell>
                        <button
                          onClick={() => toggleSelect(lead._id)}
                          className="p-1"
                        >
                          {selectedIds.has(lead._id) ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/leads/${lead._id}`}
                          className="hover:underline font-medium"
                        >
                          {lead.businessName}
                        </Link>
                        {lead.currentProducts.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {lead.currentProducts.slice(0, 2).map((p) => (
                              <Badge
                                key={p}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {p.replace("att_", "AT&T ").replace("_", " ")}
                              </Badge>
                            ))}
                            {lead.currentProducts.length > 2 && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0"
                              >
                                +{lead.currentProducts.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.contactName}</div>
                        <div className="text-xs text-muted-foreground">
                          {lead.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.city}, {lead.state}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {lead.zip}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(lead.pipelineStatus)}</TableCell>
                      <TableCell>
                        {getCheckSummaryBadge(lead.checkSummary)}
                      </TableCell>
                      <TableCell>
                        <Link to={`/leads/${lead._id}`}>
                          <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {leads?.hasMore && (
        <p className="text-center text-sm text-muted-foreground">
          Showing first 100 leads. Use filters to narrow results.
        </p>
      )}
    </div>
  );
}
