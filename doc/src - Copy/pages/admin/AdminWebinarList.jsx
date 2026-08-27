import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Calendar,
    Users,
    Clock,
    Video
} from 'lucide-react';
import GlobalPagination from '../../components/common/Pagination';
import { useDeleteOwnerWebinarMutation, useGetOwnerWebinarsQuery } from "@/store/api/webinarApi";

const AdminWebinarList = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;
    const { data, isLoading } = useGetOwnerWebinarsQuery({ page, limit });
    const [deleteWebinar] = useDeleteOwnerWebinarMutation();

    const webinars = data?.data?.rows || [];
    const pagination = data?.data?.pagination || {};

    const filteredWebinars = webinars.filter(webinar =>
        webinar.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status) => {
        switch (status) {
            case 'published':
                return 'bg-blue-100 text-blue-700';
            case 'draft':
                return 'bg-green-100 text-green-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Are you sure you want to delete this webinar?')) {
            await deleteWebinar(id);
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Webinars</h1>
                    <p className="text-muted-foreground mt-1">Manage your webinar schedule</p>
                </div>
                <Button onClick={() => navigate('/app/digital-programs/webinar/create')} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Create Webinar
                </Button>
            </div>

            <Card className="border shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="relative w-80">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search webinars..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Video className="w-4 h-4" />
                            <span>{pagination.total || webinars.length} Total Webinars</span>
                        </div>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Webinar</TableHead>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Attendees</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredWebinars.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No webinars found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredWebinars.map((webinar) => (
                                        <TableRow key={webinar.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{webinar.title}</p>
                                                    {webinar.isRecorded && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                                            <Video className="w-3 h-3" />
                                                            Recording enabled
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span>{webinar.schedule_summary || "-"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{webinar.time_summary || "-"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{webinar.duration_summary || "-"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">
                                                        {webinar.enrolled_count || 0}/{webinar.max_capacity || 0}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {!webinar.is_free ? (
                                                    <span className="text-sm font-medium">${webinar.price}</span>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">Free</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(webinar.status)}`}>
                                                    {String(webinar.status || "").charAt(0).toUpperCase() + String(webinar.status || "").slice(1)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm">
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => navigate(`/app/digital-programs/webinar/${webinar.id}`)}>
                                                            <Eye className="w-4 h-4 mr-2" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => navigate(`/app/webinar/edit/${webinar.id}`)}>
                                                            <Edit className="w-4 h-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(webinar.id)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
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
                    </div>
                {isLoading && (
                    <div className="p-4 text-sm text-muted-foreground">Loading webinars...</div>
                )}
                </CardContent>
                {/* Pagination */}
                <GlobalPagination
                    page={pagination.page || page}
                    totalPages={pagination.total_pages || 1}
                    totalItems={pagination.total || webinars.length}
                    itemsPerPage={pagination.limit || limit}
                    onPageChange={setPage}
                    showInfo={true}
                />
            </Card>
        </div>
    );
};

export default AdminWebinarList;