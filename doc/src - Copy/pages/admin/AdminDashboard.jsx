import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  BookOpen,
  FlaskConical,
  DollarSign,
  Clock,
  MoreHorizontal,
  LoaderCircle,
  ArrowUpRight,
  ArrowDownRight,
  Circle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useGetMySupportTicketsQuery } from '@/store/api/supportApi';

const stats = [
  {
    title: 'Total Users',
    value: '12,458',
    change: '+12.5%',
    trend: 'up',
    icon: Users,
    color: 'bg-blue-500'
  },
  {
    title: 'Active Courses',
    value: '156',
    change: '+8.2%',
    trend: 'up',
    icon: BookOpen,
    color: 'bg-green-500'
  },
  {
    title: 'Total Labs',
    value: '342',
    change: '+15.3%',
    trend: 'up',
    icon: FlaskConical,
    color: 'bg-purple-500'
  },
  {
    title: 'Revenue',
    value: '$84,254',
    change: '-2.4%',
    trend: 'down',
    icon: DollarSign,
    color: 'bg-amber-500'
  },
];

const recentCourses = [
  { id: 1, title: 'Advanced React Patterns', students: 234, status: 'Published', type: 'Paid' },
  { id: 2, title: 'AWS Cloud Fundamentals', students: 456, status: 'Draft', type: 'Free' },
  { id: 3, title: 'Docker & Kubernetes', students: 189, status: 'Published', type: 'Paid' },
  { id: 4, title: 'Python for Data Science', students: 567, status: 'Published', type: 'Free' },
];

const recentUsers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Student', joined: '2 hours ago' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Instructor', joined: '5 hours ago' },
  { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'Student', joined: '1 day ago' },
  { id: 4, name: 'Sarah Wilson', email: 'sarah@example.com', role: 'Admin', joined: '2 days ago' },
];

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { data: supportData } = useGetMySupportTicketsQuery({}, { refetchOnMountOrArgChange: true });
  const supportTickets = supportData?.data?.rows || [];

  // Simulate loading for 1.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
  // Show skeleton while loading


  return (

    <>
      {
        isLoading == true ? (
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index} className="border-0 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                        <stat.icon className="w-6 h-6 text-white" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">{stat.value}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <div className={`flex items-center text-xs font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {stat.trend === 'up' ? (
                          <ArrowUpRight className="w-3 h-3 mr-0.5" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-0.5" />
                        )}
                        {stat.change}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Link to="/admin/courses/new">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <BookOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Create Course</h3>
                      <p className="text-sm text-muted-foreground">Add new learning content</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/admin/labs/new">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <FlaskConical className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Create Lab</h3>
                      <p className="text-sm text-muted-foreground">Build hands-on exercises</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/admin/users">
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Manage Users</h3>
                      <p className="text-sm text-muted-foreground">View and edit user roles</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold">Support Replies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {supportTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No support messages yet.</p>
                  ) : (
                    supportTickets.slice(0, 3).map((t) => (
                      <div key={t.id} className="rounded-md border p-3">
                        <p className="text-sm font-medium">{t.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.admin_reply || "Awaiting admin reply"}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              {/* Recent Courses */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-lg font-semibold">Recent Courses</CardTitle>
                  <Link to="/admin/courses" className="text-sm text-primary hover:underline">
                    View All
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {recentCourses.map((course) => (
                      <div key={course.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{course.title}</p>
                            <p className="text-xs text-muted-foreground">{course.students} students</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${course.type === 'Free' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
                          >
                            {course.type}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${course.status === 'Published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                          >
                            {course.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Users */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                  <CardTitle className="text-lg font-semibold">Recent Users</CardTitle>
                  <Link to="/admin/users" className="text-sm text-primary hover:underline">
                    View All
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {recentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-xs">
                            {user.role}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {user.joined}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )

      }

    </>
  );
};

export default AdminDashboard;