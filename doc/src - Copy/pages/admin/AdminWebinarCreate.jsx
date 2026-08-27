import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Upload,
  Video,
  Calendar,
  Clock,
  Users,
  Globe
} from 'lucide-react';

const AdminWebinarCreate = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [maxAttendees, setMaxAttendees] = useState('100');
  const [isRecorded, setIsRecorded] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('0');

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4 text-muted-foreground"
          onClick={() => navigate('/app/digital-programs/live-webinar')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-2xl font-bold mb-6">Create New Webinar</h1>

        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Video className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Webinar Details</h3>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Webinar Title <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Introduction to Cloud Architecture"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    placeholder="Describe what attendees will learn..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-muted/30 min-h-[100px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Cover Image</label>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG (max. 1920x1080px)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Schedule</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="bg-muted/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Timezone</label>
                  <Select defaultValue="EST">
                    <SelectTrigger className="bg-muted/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                      <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="GMT">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Settings</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Maximum Attendees</label>
                  <Input
                    type="number"
                    value={maxAttendees}
                    onChange={(e) => setMaxAttendees(e.target.value)}
                    className="bg-muted/30 w-40"
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">Record Webinar</p>
                    <p className="text-sm text-muted-foreground">Save recording for later access</p>
                  </div>
                  <Switch checked={isRecorded} onCheckedChange={setIsRecorded} />
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">Paid Webinar</p>
                    <p className="text-sm text-muted-foreground">Charge attendees for access</p>
                  </div>
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                </div>

                {isPaid && (
                  <div className="flex items-center gap-2 pl-4">
                    <span className="text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-32"
                    />
                    <span className="text-sm text-muted-foreground">USD</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => navigate('/app/digital-programs/live-webinar')}>
              Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline">Save as Draft</Button>
              <Button>Schedule Webinar</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminWebinarCreate;
