import { useGetCreatorInsightsQuery } from "@/store/api/learningApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function CreatorInsights() {
  const { data, isLoading, isError } = useGetCreatorInsightsQuery(undefined);
  const payload = data?.data ?? data;
  const courses = payload?.courses ?? [];
  const labs = payload?.labs ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-destructive">Could not load creator insights.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My content & reach</h1>
        <p className="text-muted-foreground mt-1">
          Enrollments and assignments on courses and labs you created (including Skill Builder labs).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your courses</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enrollments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link className="font-medium text-primary hover:underline" to={`/courses/${c.slug}`}>
                        {c.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.status}</Badge>
                    </TableCell>
                    <TableCell>{c.enrollments ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your labs</CardTitle>
        </CardHeader>
        <CardContent>
          {labs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No labs created yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Direct enrolls</TableHead>
                  <TableHead>Assignments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <Link className="font-medium text-primary hover:underline" to={`/labs/${l.slug}`}>
                        {l.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {l.labKind === "skill_builder" ? (
                        <Badge className="bg-amber-600">Skill Builder</Badge>
                      ) : (
                        <Badge variant="secondary">{l.labType}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{l.directEnrollments ?? 0}</TableCell>
                    <TableCell>{l.assignments ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
