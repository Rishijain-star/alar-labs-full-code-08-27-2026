import { useGetAdminEnrollmentsQuery } from "@/store/api/learningApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminEnrollments() {
  const { data, isLoading, isError } = useGetAdminEnrollmentsQuery({ page: 1, limit: 50 });
  const payload = data?.data ?? data;
  const ce = payload?.courseEnrollments?.rows ?? [];
  const le = payload?.labEnrollments?.rows ?? [];
  const la = payload?.labAssignments?.rows ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive">Failed to load enrollments (requires admin permission).</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Enrollments overview</h1>
        <p className="text-muted-foreground mt-1">
          All course enrollments, standalone lab enrollments, and lab assignments.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course enrollments ({ce.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ce.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="font-medium">{r.userName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                  </TableCell>
                  <TableCell>{r.courseTitle}</TableCell>
                  <TableCell>
                    <Badge variant={r.source === "purchase" ? "default" : "secondary"}>
                      {r.source}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.progress ?? 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Standalone lab enrollments ({le.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {le.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="font-medium">{r.userName || "—"}</div>
                    <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                  </TableCell>
                  <TableCell>{r.labTitle}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.source}</Badge>
                  </TableCell>
                  <TableCell>{r.progress ?? 0}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lab assignments ({la.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Lab</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {la.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{r.userId}</TableCell>
                  <TableCell>{r.labTitle}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.score ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
