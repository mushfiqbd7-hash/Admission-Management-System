// src/components/settings/AuditLogPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { format } from 'date-fns';

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
  user_name: string;
  user_email: string;
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = new URLSearchParams({ page: String(page), limit: '50' });
  if (action) params.set('action', action);
  if (entityType) params.set('entity_type', entityType);
  if (dateFrom) params.set('date_from', dateFrom);
  if (dateTo) params.set('date_to', dateTo);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, action, entityType, dateFrom, dateTo],
    queryFn: async () => {
      const res = await api.get(`/audit-log?${params}`);
      return res.data as { data: AuditEntry[]; total: number; page: number };
    },
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 50);

  const clearFilters = () => {
    setAction('');
    setEntityType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  return (
    <div className="p-4 sm:p-6">
      <h2 className="mb-4 text-xl font-extrabold text-slate-900">Audit Log</h2>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1); }}
          placeholder="Filter by action..."
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <input
          value={entityType}
          onChange={e => { setEntityType(e.target.value); setPage(1); }}
          placeholder="Filter by entity type..."
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
          className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
        <button
          onClick={clearFilters}
          className="h-10 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-200"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
                      </td>
                    ))}
                  </tr>
                ))
              : data?.data.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {format(new Date(entry.created_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {entry.user_name ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {entry.entity_type}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{entry.ip_address ?? '-'}</td>
                  </tr>
                ))}
          </tbody>
        </table>

        {!isLoading && (data?.data.length ?? 0) === 0 && (
          <div className="py-16 text-center text-slate-400">No audit log entries found.</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages} - {data?.total} total entries
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
