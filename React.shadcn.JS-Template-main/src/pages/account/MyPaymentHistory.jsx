import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Receipt, Loader2, User, ShieldAlert } from 'lucide-react';
import { useGetMyPaymentHistoryQuery } from '@/store/api/learningApi';
import { formatPriceDisplay } from '@/lib/localeFormat';
import { isSuperAdmin } from '@/lib/auth';
import { hasAnyPermission } from '@/utils/permissions';

const formatDate = (dateValue) => {
  if (!dateValue) return 'Recently';
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
};

export default function MyPaymentHistory() {
  const canViewAll = isSuperAdmin() || hasAnyPermission(["view_all_payments"]);
  const canViewOwn = hasAnyPermission(["view_own_payments"]);
  const canViewPayments = canViewAll || canViewOwn;

  const { data, isLoading } = useGetMyPaymentHistoryQuery(undefined, { skip: !canViewPayments });
  const history = data?.data?.history || data?.history || [];
  const isAdminView = canViewAll || (data?.data?.isAdmin ?? false);
  const isAccessDenied = data?.data?.accessDenied;

  const hasUserColumn = history.some((item) => !!item.user) || isAdminView;

  if (!canViewPayments || isAccessDenied) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center py-16">
        <Card className="border-red-200 bg-red-50/50 p-8 shadow-sm">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Insufficient Permission</h2>
          <p className="text-sm text-red-600 max-w-md mx-auto">
            You do not have permission to view payment or transaction history. Please contact your system administrator to grant access.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" /> {isAdminView ? 'Platform Transactions & Payment History' : 'Payment History'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAdminView
            ? 'Executive ledger of all user transactions, course enrollments, lab purchases, and webinar payments.'
            : 'View all your past transactions, purchased courses, labs, and webinars.'}
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <span>Transaction Details</span>
            <Badge variant="outline" className="font-medium text-xs bg-muted/60">
              Total Transactions: {history.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium">No payment history found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Purchases and paid enrollments will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3.5">Payment ID</th>
                    {hasUserColumn && <th className="px-6 py-3.5">User</th>}
                    <th className="px-6 py-3.5">Item</th>
                    <th className="px-6 py-3.5">Type</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Payment Mode</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((item) => (
                    <tr key={item.id || item.paymentId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-medium text-foreground">
                        {item.paymentId}
                      </td>
                      {hasUserColumn && (
                        <td className="px-6 py-4">
                          {item.user ? (
                            <div>
                              <p className="font-semibold text-xs text-foreground">{item.user.name}</p>
                              <p className="text-[11px] text-muted-foreground">{item.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">User</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium text-foreground max-w-xs truncate">
                        {item.itemTitle}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="secondary" className="text-xs font-normal">
                          {item.itemType}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {formatPriceDisplay(item.amount, item.currency || 'INR')}
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3.5 w-3.5 text-primary" />
                          {item.paymentMethod || 'Razorpay'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.date)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-200">
                          {item.status || 'Success'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
