import { useState, useMemo } from "react";
import { useGetAdminEnrollmentsQuery } from "@/store/api/learningApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MoreVertical, Eye, Edit, Trash2, Users, IndianRupee, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GlobalPagination from "../../components/common/Pagination";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper to group array by a key field
const groupEnrollments = (items, keyField, type) => {
  const grouped = items.reduce((acc, curr) => {
    const key = curr[keyField] || `Unknown ${type}`;
    const rawDate = curr.createdAt || curr.created_at || curr.enrolledAt || curr.enrolled_at;
    let formattedDate = "N/A";
    if (rawDate) {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString();
      }
    }

    if (!acc[key]) {
      acc[key] = {
        title: key,
        type: type,
        instructor: curr.instructorName || "System / Admin",
        createdAt: formattedDate,
        users: [],
        totalRevenue: 0,
        isPaid: false,
      };
    }
    acc[key].users.push(curr);
    if (curr.source === "purchase") {
      acc[key].totalRevenue += Number(curr.price || 0);
    }
    if (curr.price > 0) {
      acc[key].isPaid = true;
    }
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => b.users.length - a.users.length);
};

export default function AdminEnrollments() {
  const { data, isLoading, isError } = useGetAdminEnrollmentsQuery({ page: 1, limit: 1000 });
  const payload = data?.data ?? data;
  
  const ce = payload?.courseEnrollments?.rows ?? [];
  const le = payload?.labEnrollments?.rows ?? [];
  const la = payload?.labAssignments?.rows ?? [];
  const pe = payload?.programEnrollments?.rows ?? payload?.programs?.rows ?? [];

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (val) => {
    setTypeFilter(val);
    setPage(1);
  };

  const allGroups = useMemo(() => {
    const courseGroups = groupEnrollments(ce, "courseTitle", "Course");
    const labGroups = groupEnrollments(le, "labTitle", "Lab");
    const assignmentGroups = groupEnrollments(la, "labTitle", "Assignment");
    const programGroups = groupEnrollments(pe, "programTitle", "Program");
    return [...courseGroups, ...labGroups, ...assignmentGroups, ...programGroups];
  }, [ce, le, la, pe]);

  const filteredGroups = useMemo(() => {
    return allGroups.filter(g => {
      const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesType = true;
      const t = (g.type || "").toLowerCase();
      const isPaid = !!g.isPaid;

      if (typeFilter === "all") {
        matchesType = true;
      } else if (typeFilter === "paid_courses") {
        matchesType = t === "course" && isPaid;
      } else if (typeFilter === "free_courses") {
        matchesType = t === "course" && !isPaid;
      } else if (typeFilter === "paid_labs") {
        matchesType = (t === "lab" || t === "assignment") && isPaid;
      } else if (typeFilter === "free_labs") {
        matchesType = (t === "lab" || t === "assignment") && !isPaid;
      } else if (typeFilter === "programs") {
        matchesType = t === "program";
      } else {
        matchesType = t === typeFilter.toLowerCase();
      }

      return matchesSearch && matchesType;
    });
  }, [allGroups, searchQuery, typeFilter]);

  const totalItems = filteredGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const paginatedGroups = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredGroups.slice(start, start + limit);
  }, [filteredGroups, page, limit]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
        <h3 className="font-semibold text-lg">Failed to load enrollments</h3>
        <p>You may not have the required admin permissions or the server encountered an error.</p>
      </div>
    );
  }

  const handleViewDetails = (group) => {
    setSelectedGroup(group);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Enrollments Overview</h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage and view all enrolled users grouped by courses and labs.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-border">
        <CardHeader className="bg-muted/30 pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">All Enrollments</CardTitle>
              <CardDescription>Total {filteredGroups.length} unique items based on filters.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title..."
                  className="pl-9 bg-background"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              <Select value={typeFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-48 bg-background">
                  <SelectValue placeholder="Filter by Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="paid_courses">Paid Courses</SelectItem>
                  <SelectItem value="free_courses">Free Courses</SelectItem>
                  <SelectItem value="paid_labs">Paid Labs</SelectItem>
                  <SelectItem value="free_labs">Free Labs</SelectItem>
                  <SelectItem value="programs">Programs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[30%] pl-6">Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead className="text-center">Total Enrolled</TableHead>
                <TableHead className="text-right pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No enrollments found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((g, i) => (
                  <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="pl-6 font-medium text-foreground">
                      {g.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {g.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.instructor}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {g.createdAt}
                    </TableCell>
                    <TableCell>
                      <Badge className={g.isPaid ? "badge-paid" : "badge-free"}>
                        {g.isPaid ? "Paid" : "Free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="px-3 py-1 font-semibold text-sm">
                        {g.users.length} Users
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleViewDetails(g)} className="cursor-pointer">
                            <Eye className="mr-2 h-4 w-4 text-primary" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalItems > 0 && (
            <div className="p-4 border-t">
              <GlobalPagination
                mode="full"
                page={page}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={limit}
                onPageChange={(newPage) => setPage(newPage)}
                onItemsPerPageChange={(newLimit) => {
                  setLimit(newLimit);
                  setPage(1);
                }}
                showItemsPerPage
                showInfo
                itemsPerPageOptions={[10, 20, 50, 100]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 bg-muted/40 border-b">
            <DialogTitle className="text-2xl font-bold text-foreground">
              {selectedGroup?.title}
            </DialogTitle>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{selectedGroup?.type}</Badge>
              <span>•</span>
              <span>Instructor: {selectedGroup?.instructor}</span>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-background rounded-lg border p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Enrolled Users</p>
                  <p className="text-2xl font-bold text-foreground">{selectedGroup?.users.length || 0}</p>
                </div>
              </div>
              <div className="bg-background rounded-lg border p-4 flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-success/10 text-success rounded-full">
                  <IndianRupee className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Estimated Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₹{selectedGroup?.totalRevenue?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* User List Table */}
          <div className="overflow-y-auto p-6 bg-background">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                <TableRow>
                  <TableHead className="w-[300px]">User Details</TableHead>
                  <TableHead>Enrollment Source</TableHead>
                  <TableHead>Progress</TableHead>
                  {selectedGroup?.type === "Assignment" && <TableHead>Status & Score</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedGroup?.users.map((u, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{u.userName || (u.userId ? `User ID: ${u.userId}` : "—")}</div>
                      {u.userEmail && <div className="text-xs text-muted-foreground">{u.userEmail}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.source === "purchase" ? "default" : "outline"} className="capitalize">
                        {u.source || "assigned"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-full max-w-[120px] bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min(u.progress ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{u.progress ?? 0}%</span>
                      </div>
                    </TableCell>
                    {selectedGroup?.type === "Assignment" && (
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{u.status || "—"}</span>
                          <span className="text-xs text-muted-foreground">Score: {u.score ?? "—"}</span>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t bg-muted/20 flex justify-end">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
