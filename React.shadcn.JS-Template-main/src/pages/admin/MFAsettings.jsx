import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Shield,
    Loader2,
    Copy,
    Check,
    Download,
    AlertTriangle,
    QrCode
} from 'lucide-react';
import {
    useGetMFAStatusQuery,
    useStartMFAEnableMutation,
    useCompleteMFAEnableMutation,
    useDisableMFAMutation,
} from '@/store/api/userApi';

const MFASettings = () => {
    // RTK Query Hooks
    const { data: mfaStatus, isLoading: loadingStatus, refetch } = useGetMFAStatusQuery();
    const [startMFAEnable, { isLoading: isStarting }] = useStartMFAEnableMutation();
    const [completeMFAEnable, { isLoading: isCompleting }] = useCompleteMFAEnableMutation();
    const [disableMFA, { isLoading: isDisabling }] = useDisableMFAMutation();

    // State Management
    const [mfaEnabled, setMfaEnabled] = useState(false);

    // Modals
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [showQRCodeModal, setShowQRCodeModal] = useState(false);
    const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

    // 2FA Data
    const [qrCodeData, setQrCodeData] = useState(null);
    const [backupCodes, setBackupCodes] = useState([]);
    const [verificationCode, setVerificationCode] = useState('');
    const [disablePassword, setDisablePassword] = useState('');

    // UI State
    const [copiedCode, setCopiedCode] = useState(null);
    const [copiedSecret, setCopiedSecret] = useState(false);

    // Update MFA status when data changes
    useEffect(() => {
        if (mfaStatus) {
            setMfaEnabled(mfaStatus.enabled);
        }
    }, [mfaStatus]);

    /**
     * Handle MFA toggle switch
     */
    const handleMFAToggle = async (checked) => {
        if (checked) {
            // Enable MFA
            await startEnableMFA();
        } else {
            // Show disable confirmation
            setShowDisableConfirm(true);
        }
    };

    /**
     * Start MFA Enable Process - Get QR Code
     */
    const startEnableMFA = async () => {
        try {
            const response = await startMFAEnable().unwrap();

            if (response) {
                const qrCode = response.qrCode || response.qr_code || response.qr || null;
                const secret = response.secret || response.secretKey || response.secret_key || null;
                const backups = response.backupCodes || response.backup_codes || [];
                setQrCodeData({
                    qrCode,
                    secret,
                });
                setBackupCodes(backups);
                setShowQRCodeModal(true);
            }
        } catch (error) {
            console.error('Failed to start MFA enable:', error);
        }
    };

    /**
     * Complete MFA Enable - Verify Code
     */
    const completeMFAEnableHandler = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            return;
        }

        try {
            await completeMFAEnable(verificationCode).unwrap();

            setMfaEnabled(true);
            setShowQRCodeModal(false);
            setVerificationCode('');

            // Show backup codes modal
            if (backupCodes.length > 0) {
                setShowBackupCodesModal(true);
            }

            // Refetch MFA status
            refetch();
        } catch (error) {
            console.error('Failed to complete MFA enable:', error);

        }
    };

    /**
     * Disable MFA
     */
    const disableMFAHandler = async () => {
        if (!disablePassword) {

            return;
        }

        try {
            await disableMFA(disablePassword).unwrap();

            setMfaEnabled(false);
            setShowDisableConfirm(false);
            setDisablePassword('');

            // Refetch MFA status
            refetch();
        } catch (error) {

        }
    };

    /**
     * Copy backup code to clipboard
     */
    const copyBackupCode = (code, index) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(index);
        setTimeout(() => setCopiedCode(null), 2000);

    };

    /**
     * Copy secret to clipboard
     */
    const copySecret = () => {
        navigator.clipboard.writeText(qrCodeData.secret);
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);

    };

    /**
     * Download backup codes as text file
     */
    const downloadBackupCodes = () => {
        const content = `Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes securely. Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Keep these codes in a safe place. If you lose access to your authenticator app, 
you can use these codes to log in.`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `2fa-backup-codes-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);

    };

    // Combined loading state
    const isLoading = loadingStatus || isStarting || isCompleting || isDisabling;

    if (loadingStatus) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2">Loading security settings...</span>
            </div>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>
                        Add an extra layer of security to your account
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* MFA Status */}
                    <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex-1">
                            <p className="font-medium">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">
                                {mfaEnabled
                                    ? 'Your account is protected with 2FA'
                                    : 'Protect your account with an authenticator app'}
                            </p>
                        </div>
                        <Switch
                            checked={mfaEnabled}
                            onCheckedChange={handleMFAToggle}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Status Alert */}
                    {mfaEnabled && (
                        <Alert className="bg-green-50 border-green-200">
                            <Shield className="w-4 h-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                Two-factor authentication is currently <strong>enabled</strong> on your account.
                            </AlertDescription>
                        </Alert>
                    )}

                    {!mfaEnabled && (
                        <Alert className="bg-amber-50 border-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                                We recommend enabling two-factor authentication to secure your account.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Information */}
                    <div className="rounded-lg bg-muted/30 p-4">
                        <h4 className="font-medium mb-2">How it works:</h4>
                        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                            <li>Scan the QR code with your app</li>
                            <li>Enter the 6-digit code to verify</li>
                            <li>Save your backup codes in a secure location</li>
                        </ol>
                    </div>
                </CardContent>
            </Card>

            {/* QR Code Modal */}
            <Dialog open={showQRCodeModal} onOpenChange={setShowQRCodeModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <QrCode className="w-5 h-5" />
                            Set Up Two-Factor Authentication
                        </DialogTitle>
                        <DialogDescription>
                            Scan the QR code with your authenticator app, then enter the 6-digit code
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* QR Code */}
                        {qrCodeData?.qrCode && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="bg-white p-4 rounded-lg border-2">
                                    <img
                                        src={qrCodeData.qrCode}
                                        alt="QR Code"
                                        className="w-48 h-48"
                                    />
                                </div>

                                {/* Secret Key (Manual Entry) */}
                                <div className="w-full">
                                    <Label className="text-xs text-muted-foreground">
                                        Can't scan? Enter this code manually:
                                    </Label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 px-3 py-2 bg-muted rounded text-xs font-mono break-all">
                                            {qrCodeData.secret}
                                        </code>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={copySecret}
                                            className="shrink-0"
                                        >
                                            {copiedSecret ? (
                                                <Check className="w-4 h-4" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Verification Code Input */}
                        <div className="space-y-2">
                            <Label htmlFor="verification-code">
                                Enter 6-digit code from your app
                            </Label>
                            <Input
                                id="verification-code"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-2xl tracking-widest font-mono"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowQRCodeModal(false);
                                setVerificationCode('');
                                setQrCodeData(null);
                            }}
                            disabled={isCompleting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={completeMFAEnableHandler}
                            disabled={isCompleting || verificationCode.length !== 6}
                        >
                            {isCompleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify & Enable'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Backup Codes Modal */}
            <Dialog open={showBackupCodesModal} onOpenChange={setShowBackupCodesModal}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Save Your Backup Codes</DialogTitle>
                        <DialogDescription>
                            Store these codes in a safe place. You can use them to access your account
                            if you lose access to your authenticator app.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 text-sm">
                            <strong>Important:</strong> Each code can only be used once. Save them now!
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-2 py-4">
                        {backupCodes.map((code, index) => (
                            <div
                                key={index}
                                className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
                            >
                                <code className="flex-1 font-mono text-sm">
                                    {code}
                                </code>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyBackupCode(code, index)}
                                    className="h-8 w-8 p-0"
                                >
                                    {copiedCode === index ? (
                                        <Check className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={downloadBackupCodes}
                            className="w-full sm:w-auto gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download Codes
                        </Button>
                        <Button
                            onClick={() => setShowBackupCodesModal(false)}
                            className="w-full sm:w-auto"
                        >
                            I've Saved My Codes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disable Confirmation Dialog */}
            <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Disable Two-Factor Authentication?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will make your account less secure. You'll need to enter your password
                            to confirm this action.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2 py-4">
                        <Label htmlFor="disable-password">Enter your password to confirm</Label>
                        <Input
                            id="disable-password"
                            type="password"
                            placeholder="Enter your password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            autoComplete="current-password"
                        />
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => {
                                setShowDisableConfirm(false);
                                setDisablePassword('');
                            }}
                            disabled={isDisabling}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={disableMFAHandler}
                            disabled={isDisabling || !disablePassword}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDisabling ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Disabling...
                                </>
                            ) : (
                                'Disable 2FA'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default MFASettings;
