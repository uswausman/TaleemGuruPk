import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AdminConfirmDialog } from './AdminConfirmDialog';

interface NewsletterSubscriber {
  id: number;
  email: string;
  status: 'active' | 'inactive';
  subscribedAt: string;
}

export const AdminNewsletterTab: React.FC = () => {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; id: number | null; action: 'remove' | 'toggle' | null }>({ isOpen: false, id: null, action: null });

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/newsletter');
      if (!res.ok) throw new Error('Failed to fetch subscribers');
      setSubscribers(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const handleUpdateStatus = async (id: number, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch(`/api/newsletter/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchSubscribers();
    setConfirmDialog({ isOpen: false, id: null, action: null });
  };

  const handleRemove = async (id: number) => {
    await fetch(`/api/newsletter/${id}`, { method: 'DELETE' });
    fetchSubscribers();
    setConfirmDialog({ isOpen: false, id: null, action: null });
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900 dark:text-white">Newsletter Subscribers ({subscribers.length})</h2>
      <Card className="overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase">
            <tr>
              <th className="p-4">Email</th>
              <th className="p-4">Status</th>
              <th className="p-4">Subscribed At</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {subscribers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="p-4 font-medium">{s.email}</td>
                <td className="p-4"><Badge variant={s.status === 'active' ? 'emerald' : 'rose'}>{s.status}</Badge></td>
                <td className="p-4 text-slate-500">{new Date(s.subscribedAt).toLocaleDateString()}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => setConfirmDialog({ isOpen: true, id: s.id, action: 'toggle' })} className="text-blue-600 hover:text-blue-800 font-bold">Toggle Status</button>
                  <button onClick={() => setConfirmDialog({ isOpen: true, id: s.id, action: 'remove' })} className="text-rose-600 hover:text-rose-800 font-bold"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={`Confirm ${confirmDialog.action === 'remove' ? 'Removal' : 'Status Change'}`}
        message={`Are you sure you want to ${confirmDialog.action === 'remove' ? 'remove' : 'toggle status of'} this subscriber?`}
        onConfirm={() => {
            if (confirmDialog.action === 'remove') handleRemove(confirmDialog.id!);
            else handleUpdateStatus(confirmDialog.id!, subscribers.find(s => s.id === confirmDialog.id)!.status);
        }}
        onCancel={() => setConfirmDialog({ isOpen: false, id: null, action: null })}
      />
    </div>
  );
};
