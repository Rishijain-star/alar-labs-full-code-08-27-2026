import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    Calendar,
    Clock,
    Users,
    DollarSign,
    Video,
    MapPin,
    Edit,
    Trash2,
    Download,
    Mail,
    Search,
    CheckCircle,
    XCircle,
    User
} from 'lucide-react';

const AdminWebinarDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchQuery, setSearchQuery] = useState('');

    // Sample webinar data
    const webinar = {
        id: 1,
        title: 'Introduction to Cloud Architecture',
        description: 'Learn the fundamentals of cloud architecture, including best practices for designing scalable, reliable, and secure cloud infrastructure. This comprehensive webinar covers AWS, Azure, and Google Cloud platforms.',
        date: '2026-02-15',
        time: '14:00',
        duration: 60,
        timezone: 'EST',
        maxAttendees: 100,
        currentAttendees: 45,
        status: 'Scheduled',
        isPaid: false,
        price: 0,
        isRecorded: true,
        coverImage: 'https://via.placeholder.com/800x400',
        createdAt: '2026-01-10'
    };

    // Sample attendees data
    const [attendees, setAttendees] = useState([
        {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            registeredAt: '2026-01-15 10:30',
            status: 'Confirmed',
            avatar: null,
            company: 'Tech Corp',
            title: 'Software Engineer'
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah.j@example.com',
            registeredAt: '2026-01-16 14:20',
            status: 'Confirmed',
            avatar: null,
            company: 'Digital Solutions',
            title: 'DevOps Lead'
        },
        {
            id: 3,
            name: 'Michael Chen',
            email: 'michael.chen@example.com',
            registeredAt: '2026-01-17 09:15',
            status: 'Confirmed',
            avatar: null,
            company: 'Cloud Innovations',
            title: 'Cloud Architect'
        },
        {
            id: 4,
            name: 'Emily Rodriguez',
            email: 'emily.r@example.com',
            registeredAt: '2026-01-18 16:45',
            status: 'Pending',
            avatar: null,
            company: 'StartupXYZ',
            title: 'CTO'
        },
        {
            id: 5,
            name: 'David Kim',
            email: 'david.kim@example.com',
            registeredAt: '2026-01-19 11:30',
            status: 'Confirmed',
            avatar: null,
            company: 'Enterprise Inc',
            title: 'System Administrator'
        },
        {
            id: 6,
            name: 'Lisa Anderson',
            email: 'lisa.a@example.com',
            registeredAt: '2026-01-20 13:20',
            status: 'Cancelled',
            avatar: null,
            company: 'Tech Ventures',
            title: 'Product Manager'
        }
    ]);

    const filteredAttendees = attendees.filter(attendee =>
        attendee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attendee.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'Confirmed':
                return 'bg-green-100 text-green-700';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'Cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const confirmedCount = attendees.filter(a => a.status === 'Confirmed').length;
    const pendingCount = attendees.filter(a => a.status === 'Pending').length;

    const exportAttendees = () => {
        console.log('Exporting attendees list...');
        // Add export functionality here
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this webinar?')) {
            navigate('/admin/webinars');
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <Button
                variant="ghost"
                className="mb-4 text-muted-foreground"
                onClick={() => navigate('/admin/digital-programs/live-Webinar')}
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Webinars
            </Button>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">{webinar.title}</h1>
                    <p className="text-muted-foreground mt-1">Webinar Details & Attendees</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => navigate(`/admin/webinar/edit/${id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <Button variant="outline" onClick={handleDelete} className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <Card className="border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Registered</p>
                                <p className="text-2xl font-bold">{webinar.currentAttendees}/{webinar.maxAttendees}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Confirmed</p>
                                <p className="text-2xl font-bold">{confirmedCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{pendingCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card className="border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Webinar Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Date & Time</p>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(webinar.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                                <p className="text-sm text-muted-foreground">{webinar.time} {webinar.timezone}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Duration</p>
                                <p className="text-sm text-muted-foreground">{webinar.duration} minutes</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Price</p>
                                <p className="text-sm text-muted-foreground">
                                    {webinar.isPaid ? `$${webinar.price}` : 'Free'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Video className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Recording</p>
                                <p className="text-sm text-muted-foreground">
                                    {webinar.isRecorded ? 'Enabled' : 'Disabled'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="text-sm font-medium">Capacity</p>
                                <p className="text-sm text-muted-foreground">
                                    {webinar.maxAttendees} maximum attendees
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {webinar.description}
                        </p>
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs text-muted-foreground">
                                Created on {new Date(webinar.createdAt).toLocaleDateString()}
                            </p>
                            <div className="mt-2">
                                <Badge className={getStatusColor(webinar.status)}>
                                    {webinar.status}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border shadow-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Registered Attendees ({webinar.currentAttendees})</CardTitle>
                        <Button variant="outline" size="sm" onClick={exportAttendees}>
                            <Download className="w-4 h-4 mr-2" />
                            Export List
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search attendees by name, email, or company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Attendee</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAttendees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No attendees found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAttendees.map((attendee) => (
                                        <TableRow key={attendee.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-10 h-10">
                                                        <AvatarImage src={attendee.avatar} />
                                                        <AvatarFallback className="bg-primary/10 text-primary">
                                                            {getInitials(attendee.name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-medium">{attendee.name}</p>
                                                        <p className="text-sm text-muted-foreground">{attendee.title}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{attendee.company}</span>
                                            </TableCell>
                                            <TableCell>
                                                <a
                                                    href={`mailto:${attendee.email}`}
                                                    className="text-sm text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <Mail className="w-3 h-3" />
                                                    {attendee.email}
                                                </a>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(attendee.registeredAt).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(attendee.status)}>
                                                    {attendee.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">
                                                    <User className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminWebinarDetail;