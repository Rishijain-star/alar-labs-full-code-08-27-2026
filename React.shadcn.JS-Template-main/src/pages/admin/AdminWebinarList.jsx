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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDeleteOwnerWebinarMutation, useGetOwnerWebinarsQuery, useGetMyWebinarsQuery } from "@/store/api/webinarApi";
import { confirmDelete } from "@/lib/confirmAction";
import { canEditDigitalPrograms, canDeleteDigitalPrograms } from "@/lib/digitalProgramsPermissions";
import AdminContentDates from "@/components/admin/AdminContentDates";
import { WebinarLiveStatusBadge } from '@/components/training/WebinarLiveStatus';

const AdminWebinarList = () => {
    const navigate = useNavigate();
    const canEdit = canEditDigitalPrograms();
    const canDelete = canDeleteDigitalPrograms();
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [page, setPage] = useState(1);
    const limit = 10;
    const { data, isLoading } = useGetOwnerWebinarsQuery({ page, limit });
    const { data: myWebinarsRes, isLoading: isMyLoading } = useGetMyWebinarsQuery();
    const [deleteWebinar] = useDeleteOwnerWebinarMutation();

    const allWebinars = data?.data?.rows || [];
    const myWebinars = myWebinarsRes?.data?.rows || myWebinarsRes?.rows || [];
    const webinars = allWebinars;
    const pagination = data?.data?.pagination || {};

    const rawList = activeTab === 'my' ? myWebinars : allWebinars;

    const filteredWebinars = rawList.filter(webinar =>
        (webinar.title || "").toLowerCase().includes(searchQuery.toLowerCase())
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
        if (!(await confirmDelete("this webinar"))) return;
        await deleteWebinar(id);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Webinars</h1>
                    <p className="text-muted-foreground mt-1">Manage your webinar schedule</p>
                </div>
                {canEdit && (
                    <Button onClick={() => navigate('/app/webinar/create')} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Create Webinar
                    </Button>
                )}
            </div>

            <Card className="border shadow-sm">
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                                    <TabsTrigger value="all">All Webinars</TabsTrigger>
                                    <TabsTrigger value="my">My Webinars ({myWebinars.length})</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search webinars..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                                <Video className="w-4 h-4" />
                                <span>{activeTab === 'my' ? `${filteredWebinars.length} Joined` : `${pagination.total || allWebinars.length} Total`}</span>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Webinar</TableHead>
                                    <TableHead>Schedule & Status</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Spots Left</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredWebinars.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            {activeTab === 'my' 
                                                ? "You haven't joined any webinars yet. Switch to 'All Webinars' to explore and join!"
                                                : "No webinars found"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredWebinars.map((webinar) => {
                                        const isJoined = myWebinars.some(mw => String(mw.id) === String(webinar.id));
                                        return (
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
                                                        {(canEdit || canDelete) && (
                                                            <AdminContentDates record={webinar} className="mt-1.5" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1.5 items-start">
                                                        <WebinarLiveStatusBadge webinar={webinar} />
                                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                                            {webinar.schedule_summary && (
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>{webinar.schedule_summary}</span>
                                                                </div>
                                                            )}
                                                            {webinar.time_summary && (
                                                                <div className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>{webinar.time_summary}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm">{webinar.duration_summary || "-"}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm font-medium text-emerald-600">
                                                            {webinar.max_capacity
                                                                ? `${Math.max(0, webinar.max_capacity - (webinar.enrolled_count || 0))} Spots Left`
                                                                : `${webinar.enrolled_count || 0} Enrolled`}
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
                                                <TableCell className="text-right">
                                                    {canEdit || canDelete ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => navigate(`/app/webinar/${webinar.id}`)}>
                                                                    <Eye className="w-4 h-4 mr-2" />
                                                                    View Details
                                                                </DropdownMenuItem>
                                                                {canEdit && (
                                                                    <DropdownMenuItem onClick={() => navigate(`/app/webinar/create?edit=${webinar.id}`)}>
                                                                        <Edit className="w-4 h-4 mr-2" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {canDelete && (
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleDelete(webinar.id)}
                                                                        className="text-red-600"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : (
                                                        <Button
                                                            variant={isJoined ? "outline" : "premium"}
                                                            size="sm"
                                                            onClick={() => {
                                                                if (webinar.slug) {
                                                                    navigate(`/training/webinar/${webinar.slug}`);
                                                                } else if (webinar.meeting_link) {
                                                                    window.open(webinar.meeting_link, "_blank");
                                                                } else {
                                                                    navigate(`/training`);
                                                                }
                                                            }}
                                                        >
                                                            {isJoined ? 'Joined' : 'Join'}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
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
                    page={activeTab === 'my' ? 1 : (pagination.page || page)}
                    totalPages={activeTab === 'my' ? Math.max(1, Math.ceil(filteredWebinars.length / limit)) : (pagination.total_pages || 1)}
                    totalItems={activeTab === 'my' ? filteredWebinars.length : (pagination.total || allWebinars.length)}
                    itemsPerPage={activeTab === 'my' ? limit : (pagination.limit || limit)}
                    onPageChange={setPage}
                    showInfo={true}
                />
            </Card>
        </div>
    );
};

export default AdminWebinarList;