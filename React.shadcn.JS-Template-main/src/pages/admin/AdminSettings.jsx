import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
  Loader2,
  Scale,
  CheckCircle,
} from 'lucide-react';
import MFASettings from './MFAsettings';
import { toast } from "@/lib/toast";
import { useGetOwnerLegalDocsQuery, useUpsertOwnerLegalDocMutation } from "@/store/api/legalApi";
import {
  useGetSettingsQuery,
  useUpdateSettingsSectionMutation,
  useSendTestEmailMutation,
} from "@/store/api/settingsApi";
import {
  getVisibleSettingsTabs,
  canEditSettingsTab,
} from "@/lib/settingsPermissions";
import { useInitializePermissions } from "@/hooks/useInitializePermissions";

const TAB_ICONS = {
  general: Building,
  notifications: Bell,
  security: Shield,
  payments: CreditCard,
  email: Mail,
  legal: Scale,
};

const AdminSettings = () => {
  const { isInitialized: permissionsReady } = useInitializePermissions();

  const visibleTabs = useMemo(
    () => (permissionsReady ? getVisibleSettingsTabs() : []),
    [permissionsReady]
  );

  const canEdit = useMemo(
    () => ({
      general: canEditSettingsTab("general"),
      notifications: canEditSettingsTab("notifications"),
      security: canEditSettingsTab("security"),
      payments: canEditSettingsTab("payments"),
      email: canEditSettingsTab("email"),
      legal: canEditSettingsTab("legal"),
    }),
    [permissionsReady]
  );

  const [activeTab, setActiveTab] = useState("general");

  const { data: settingsRes, isLoading } = useGetSettingsQuery(undefined, {
    skip: visibleTabs.length === 0,
  });
  const [updateSection, { isLoading: saving }] = useUpdateSettingsSectionMutation();
  const [sendTestEmail, { isLoading: sendingTest }] = useSendTestEmailMutation();

  const settings = settingsRes?.data?.settings || settingsRes?.settings || {};
  const editable = settingsRes?.data?.editable || settingsRes?.editable || {};

  const payments = settings.payments || {};
  const email = settings.email || {};

  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [baseCurrency, setBaseCurrency] = useState('INR');
  const [exchangeRates, setExchangeRates] = useState({ INR: 1, USD: 90, EUR: 98, GBP: 112 });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newUserNotify, setNewUserNotify] = useState(true);
  const [purchaseNotify, setPurchaseNotify] = useState(true);
  const [completionNotify, setCompletionNotify] = useState(false);
  const [enrollmentEmailUser, setEnrollmentEmailUser] = useState(true);
  const [enrollmentEmailAdmin, setEnrollmentEmailAdmin] = useState(true);
  const [enrollmentPushUser, setEnrollmentPushUser] = useState(true);

  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');

  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');

  const [require2faForAll, setRequire2faForAll] = useState(false);

  const { data: legalData } = useGetOwnerLegalDocsQuery(undefined, {
    skip: !visibleTabs.some((t) => t.id === 'legal'),
  });
  const [upsertLegalDoc, { isLoading: savingLegal }] = useUpsertOwnerLegalDocMutation();
  const termsDoc = (legalData?.data?.rows || []).find((d) => d.doc_type === "terms");
  const privacyDoc = (legalData?.data?.rows || []).find((d) => d.doc_type === "privacy");
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");

  useEffect(() => {
    if (!settingsRes) return;

    const s = settingsRes?.data?.settings || settingsRes?.settings || {};
    const g = s.general || {};
    const n = s.notifications || {};
    const p = s.payments || {};
    const em = s.email || {};
    const sec = s.security || {};

    setSiteName(g.siteName || "");
    setSiteDescription(g.siteDescription || "");
    setSupportEmail(g.supportEmail || "");
    setTimezone(g.timezone || "UTC");
    setCurrency(g.currency || "USD");
    setBaseCurrency(g.baseCurrency || g.currency || "INR");
    setExchangeRates({
      INR: 1,
      USD: 90,
      EUR: 98,
      GBP: 112,
      ...(g.exchangeRates && typeof g.exchangeRates === "object" ? g.exchangeRates : {}),
    });

    setEmailNotifications(n.emailNotifications !== false);
    setNewUserNotify(n.newUserNotify !== false);
    setPurchaseNotify(n.purchaseNotify !== false);
    setCompletionNotify(!!n.completionNotify);
    setEnrollmentEmailUser(n.enrollmentEmailUser !== false);
    setEnrollmentEmailAdmin(n.enrollmentEmailAdmin !== false);
    setEnrollmentPushUser(n.enrollmentPushUser !== false);

    setRazorpayKeyId(p.keyId || "");
    setRazorpayKeySecret("");
    setSmtpHost(em.host || "");
    setSmtpPort(String(em.port || 587));
    setSmtpUser(em.user || "");
    setSmtpPass("");
    setFromEmail(em.fromEmail || "");
    setFromName(em.fromName || "ALAR Labs");
    setSmtpSecure(!!em.secure);
    setRequire2faForAll(!!sec.require2faForAll);
  }, [settingsRes]);

  useEffect(() => {
    if (termsDoc?.content) setTermsContent(termsDoc.content);
    if (privacyDoc?.content) setPrivacyContent(privacyDoc.content);
  }, [termsDoc?.content, privacyDoc?.content]);

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.find((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const handleSaveSection = async (section, payload) => {
    if (!canEdit[section]) {
      toast.error("You do not have permission to edit this section");
      return;
    }
    await updateSection({ section, data: payload }).unwrap();
  };

  const handleSaveActiveTab = async () => {
    switch (activeTab) {
      case 'general':
        await handleSaveSection('general', {
          siteName, siteDescription, supportEmail, timezone, currency, baseCurrency, exchangeRates,
        });
        break;
      case 'notifications':
        await handleSaveSection('notifications', {
          emailNotifications, newUserNotify, purchaseNotify, completionNotify,
          enrollmentEmailUser, enrollmentEmailAdmin, enrollmentPushUser,
        });
        break;
      case 'payments':
        await handleSaveSection('payments', {
          provider: 'razorpay',
          keyId: razorpayKeyId,
          ...(razorpayKeySecret ? { keySecret: razorpayKeySecret } : {}),
        });
        break;
      case 'email':
        await handleSaveSection('email', {
          host: smtpHost,
          port: parseInt(smtpPort, 10) || 587,
          secure: smtpSecure,
          user: smtpUser,
          ...(smtpPass ? { pass: smtpPass } : {}),
          fromEmail,
          fromName,
        });
        break;
      case 'security':
        await handleSaveSection('security', { require2faForAll });
        break;
      default:
        break;
    }
  };

  if (!visibleTabs.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          You do not have permission to view any settings sections.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading settings…
      </div>
    );
  }

  const canEditActive = canEdit[activeTab] || editable[activeTab];
  const showSave = ['general', 'notifications', 'payments', 'email', 'security'].includes(activeTab);

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border shadow-sm p-1 flex flex-wrap h-auto gap-1">
          {visibleTabs.map((tab) => {
            const Icon = TAB_ICONS[tab.id] || Building;
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {visibleTabs.some((t) => t.id === 'general') && (
        <TabsContent value="general">
          <div className="grid grid-cols-1 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Platform Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Site Name</label>
                  <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} disabled={!canEdit.general} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Site Description</label>
                  <Textarea value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} className="min-h-[80px]" disabled={!canEdit.general} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Support Email</label>
                  <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} disabled={!canEdit.general} />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-lg">Localization</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Platform Timezone</label>
                    <Select value={timezone} onValueChange={setTimezone} disabled={!canEdit.general}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                        <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                        <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                        <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">Default when user timezone is unknown. User times are stored in UTC.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Display Currency</label>
                    <Select value={currency} onValueChange={setCurrency} disabled={!canEdit.general}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Base Currency (admin enters prices in)</label>
                  <Select value={baseCurrency} onValueChange={setBaseCurrency} disabled={!canEdit.general}>
                    <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Exchange Rates (1 unit = X base currency)</label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Example: base INR, USD = 90 means 1 USD = 90 INR. A course priced 100 INR shows as $1.11 for US users.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['USD', 'EUR', 'GBP', 'INR'].map((code) => (
                      <div key={code}>
                        <label className="block text-xs font-medium mb-1">{code}</label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={exchangeRates[code] ?? ''}
                          onChange={(e) =>
                            setExchangeRates((prev) => ({
                              ...prev,
                              [code]: parseFloat(e.target.value) || 0,
                            }))
                          }
                          disabled={!canEdit.general}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        )}

        {visibleTabs.some((t) => t.id === 'notifications') && (
        <TabsContent value="notifications">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { label: 'Email Notifications', desc: 'Master switch for outbound emails', val: emailNotifications, set: setEmailNotifications },
                { label: 'New User Registrations', desc: 'Notify admins when users sign up', val: newUserNotify, set: setNewUserNotify },
                { label: 'Course / Lab Purchases', desc: 'Notify admins on paid purchases', val: purchaseNotify, set: setPurchaseNotify },
                { label: 'Course Completions', desc: 'Notify admins when users complete courses', val: completionNotify, set: setCompletionNotify },
                { label: 'Enrollment email to learner', desc: 'Send confirmation email on enroll / purchase', val: enrollmentEmailUser, set: setEnrollmentEmailUser },
                { label: 'Enrollment email to admins', desc: 'Email admins on new enrollments', val: enrollmentEmailAdmin, set: setEnrollmentEmailAdmin },
                { label: 'Push notification on enroll', desc: 'In-app + push when user enrolls', val: enrollmentPushUser, set: setEnrollmentPushUser },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{row.label}</p>
                    <p className="text-sm text-muted-foreground">{row.desc}</p>
                  </div>
                  <Switch checked={row.val} onCheckedChange={row.set} disabled={!canEdit.notifications} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {visibleTabs.some((t) => t.id === 'security') && (
        <TabsContent value="security">
          <div className="space-y-6">
            <MFASettings />
            {canEdit.security && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Platform Security Policy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Require 2FA for all users</p>
                      <p className="text-sm text-muted-foreground">When enabled, users must set up two-factor authentication</p>
                    </div>
                    <Switch checked={require2faForAll} onCheckedChange={setRequire2faForAll} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
        )}

        {visibleTabs.some((t) => t.id === 'payments') && (
        <TabsContent value="payments">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Razorpay Payment Gateway</CardTitle>
              {payments.connected && (
                <Badge className="bg-green-600 gap-1"><CheckCircle className="w-3 h-3" /> Connected</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure Razorpay to accept payments for courses and labs. Keys are stored securely on the server.
              </p>
              <div>
                <label className="block text-sm font-medium mb-2">Razorpay Key ID</label>
                <Input
                  placeholder="rzp_test_..."
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  disabled={!canEdit.payments}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Razorpay Key Secret</label>
                <Input
                  type="password"
                  placeholder={payments.hasKeySecret ? '•••••••• (leave blank to keep)' : 'Enter key secret'}
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  disabled={!canEdit.payments}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {visibleTabs.some((t) => t.id === 'email') && (
        <TabsContent value="email">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">SMTP Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Registration, enrollment, and notification emails use this SMTP configuration dynamically.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Host</label>
                  <Input placeholder="smtp.example.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} disabled={!canEdit.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Port</label>
                  <Input placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} disabled={!canEdit.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Username</label>
                  <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} disabled={!canEdit.email} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">SMTP Password</label>
                  <Input type="password" placeholder={email.hasPassword ? '••••••••' : '••••••••'} value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} disabled={!canEdit.email} />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Use SSL/TLS (port 465)</span>
                <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} disabled={!canEdit.email} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Email</label>
                <Input placeholder="noreply@example.com" value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} disabled={!canEdit.email} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">From Name</label>
                <Input value={fromName} onChange={(e) => setFromName(e.target.value)} disabled={!canEdit.email} />
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium mb-2">Test recipient</label>
                  <Input placeholder="you@example.com" value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)} />
                </div>
                <Button
                  variant="outline"
                  disabled={sendingTest || !canEdit.email}
                  onClick={async () => {
                    try {
                      await sendTestEmail({ to: testEmailTo || undefined }).unwrap();
                    } catch (_) { /* toast from api */ }
                  }}
                >
                  {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Test Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        )}

        {visibleTabs.some((t) => t.id === 'legal') && (
        <TabsContent value="legal">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-lg">Terms & Privacy</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Terms & Conditions (HTML supported)</label>
                <Textarea value={termsContent} onChange={(e) => setTermsContent(e.target.value)} className="min-h-[140px]" disabled={!canEdit.legal} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Privacy Policy (HTML supported)</label>
                <Textarea value={privacyContent} onChange={(e) => setPrivacyContent(e.target.value)} className="min-h-[140px]" disabled={!canEdit.legal} />
              </div>
              {canEdit.legal && (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
        )}
      </Tabs>

      {showSave && canEditActive && (
        <div className="flex justify-end mt-6">
          <Button onClick={handleSaveActiveTab} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      )}
    </>
  );
};

export default AdminSettings;
