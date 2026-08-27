import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Bell,
  Shield,
  CreditCard,
  Mail,
  Save,
} from 'lucide-react';
import MFASettings from './MFAsettings';
import { toast } from "@/lib/toast";
import { useGetOwnerLegalDocsQuery, useUpsertOwnerLegalDocMutation } from "@/store/api/legalApi";

const AdminSettings = () => {
  // General Settings State
  const [siteName, setSiteName] = useState('TechSkills Academy');
  const [siteDescription, setSiteDescription] = useState('Learn, Practice & Master Real-World Tech Skills');
  const [supportEmail, setSupportEmail] = useState('support@techskills.com');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');

  // Notifications State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newUserNotify, setNewUserNotify] = useState(true);
  const [purchaseNotify, setPurchaseNotify] = useState(true);
  const [completionNotify, setCompletionNotify] = useState(false);

  const { data: legalData } = useGetOwnerLegalDocsQuery();
  const [upsertLegalDoc, { isLoading: savingLegal }] = useUpsertOwnerLegalDocMutation();
  const termsDoc = (legalData?.data?.rows || []).find((d) => d.doc_type === "terms");
  const privacyDoc = (legalData?.data?.rows || []).find((d) => d.doc_type === "privacy");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");

  useEffect(() => {
    if (termsDoc?.content) setTermsContent(termsDoc.content);
    if (privacyDoc?.content) setPrivacyContent(privacyDoc.content);
  }, [termsDoc?.content, privacyDoc?.content]);

  const handleSaveSettings = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <>
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-white border shadow-sm p-1">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Legal
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Platform Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Site Name</label>
                  <Input
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Site Description</label>
                  <Textarea
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Support Email</label>
                  <Input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Localization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Timezone</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">Eastern Time (EST)</SelectItem>
                        <SelectItem value="PST">Pacific Time (PST)</SelectItem>
                        <SelectItem value="GMT">Greenwich Mean Time (GMT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Currency</label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Language</label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive email notifications for important events</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">New User Registrations</p>
                  <p className="text-sm text-muted-foreground">Get notified when new users sign up</p>
                </div>
                <Switch checked={newUserNotify} onCheckedChange={setNewUserNotify} />
              </div>

              <div className="flex items-center justify-between py-3 border-b">
                <div>
                  <p className="font-medium">Course Purchases</p>
                  <p className="text-sm text-muted-foreground">Get notified when users purchase courses or labs</p>
                </div>
                <Switch checked={purchaseNotify} onCheckedChange={setPurchaseNotify} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Course Completions</p>
                  <p className="text-sm text-muted-foreground">Get notified when users complete courses</p>
                </div>
                <Switch checked={completionNotify} onCheckedChange={setCompletionNotify} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="space-y-6">
            <MFASettings />
          </div>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Payment Gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium mb-2">Stripe Integration</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Stripe account to accept payments for courses and labs.
                </p>
                <Button>Connect Stripe</Button>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium mb-2">PayPal Integration</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable PayPal as an additional payment option.
                </p>
                <Button variant="outline">Connect PayPal</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Host</label>
                  <Input placeholder="smtp.example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Port</label>
                  <Input placeholder="587" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Username</label>
                  <Input placeholder="username" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Password</label>
                  <Input type="password" placeholder="••••••••" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">From Email</label>
                <Input placeholder="noreply@example.com" />
              </div>

              <Button variant="outline">Send Test Email</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Terms & Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Terms & Conditions (HTML supported)</label>
                <Textarea value={termsContent} onChange={(e) => setTermsContent(e.target.value)} className="min-h-[140px]" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Privacy Policy (HTML supported)</label>
                <Textarea value={privacyContent} onChange={(e) => setPrivacyContent(e.target.value)} className="min-h-[140px]" />
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={savingLegal}
                  onClick={async () => {
                    await upsertLegalDoc({ type: "terms", title: "Terms & Conditions", content: termsContent, is_published: true }).unwrap();
                    await upsertLegalDoc({ type: "privacy", title: "Privacy Policy", content: privacyContent, is_published: true }).unwrap();
                    toast.success("Legal documents updated");
                  }}
                >
                  Save Legal Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end mt-6">
        <Button onClick={handleSaveSettings}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </>
  );
};

export default AdminSettings;