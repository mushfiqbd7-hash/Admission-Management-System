// src/components/documents/DocumentsPage.tsx
import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronDown,
  Download,
  Eye,
  File,
  FileImage,
  FileText,
  Filter,
  FolderOpen,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

import { api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

interface SharedDocument {
  id: string;
  title: string;
  category: string;
  description?: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  uploaded_by_name: string;
  uploaded_by_role: string;
  created_at: string;
}

const CATEGORIES = [
  'Admission Forms',
  'University Documents',
  'Visa Documents',
  'Financial Documents',
  'Templates',
  'Notices',
  'Others',
];

const CAT_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'Admission Forms': {
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  },
  'University Documents': {
    bg: '#f5f3ff',
    color: '#7c3aed',
    border: '#ddd6fe',
  },
  'Visa Documents': {
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  'Financial Documents': {
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
  },
  Templates: {
    bg: '#f0fdfa',
    color: '#0f766e',
    border: '#99f6e4',
  },
  Notices: {
    bg: '#fff1f2',
    color: '#be123c',
    border: '#fecdd3',
  },
  Others: {
    bg: '#f8fafc',
    color: '#475569',
    border: '#e2e8f0',
  },
};

const documentsApi = {
  list: () => api.get('/shared-documents'),
  upload: (data: FormData) =>
    api.post('/shared-documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/shared-documents/${id}`),
};

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-CA');
}

function getMimeLabel(mime: string): string {
  if (!mime) return '—';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() || 'IMAGE';
  if (mime.includes('word')) return 'DOCX';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'XLSX';
  if (mime.includes('text')) return 'TXT';
  return mime.split('/')[1]?.toUpperCase() || mime;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime?.startsWith('image/')) {
    return <FileImage size={18} style={{ color: '#7c3aed' }} />;
  }

  if (mime === 'application/pdf') {
    return <FileText size={18} style={{ color: '#dc2626' }} />;
  }

  return <File size={18} style={{ color: '#2563eb' }} />;
}

function CategoryBadge({ category }: { category: string }) {
  const c = CAT_COLORS[category] || CAT_COLORS.Others;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 26,
        padding: '0 9px',
        borderRadius: 999,
        border: `1px solid ${c.border}`,
        background: c.bg,
        color: c.color,
        fontSize: 11.5,
        fontWeight: 900,
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={category || 'Others'}
    >
      {category || 'Others'}
    </span>
  );
}

function TypeBadge({ mime }: { mime: string }) {
  return <span style={typeBadgeStyle}>{getMimeLabel(mime)}</span>;
}

function UploadModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: (fd: FormData) => documentsApi.upload(fd),
    onSuccess: () => {
      toast.success('Document uploaded successfully');
      onSuccess();
      onClose();
    },
    onError: () => toast.error('Upload failed. Please try again.'),
  });

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!title.trim()) nextErrors.title = 'Document title is required';
    if (!category) nextErrors.category = 'Category is required';
    if (!file) nextErrors.file = 'Please select a file';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const fd = new FormData();

    fd.append('title', title.trim());
    fd.append('category', category);
    fd.append('description', description.trim());
    fd.append('file', file!);

    uploadMutation.mutate(fd);
  };

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile) {
      setFile(droppedFile);
      setErrors((prev) => ({ ...prev, file: '' }));
    }
  }, []);

  return (
    <div style={modalOverlayStyle}>
      <div style={uploadModalStyle}>
        <div style={uploadModalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={uploadModalIconStyle}>
              <Upload size={18} />
            </div>

            <div>
              <div style={uploadModalTitleStyle}>Upload Document</div>
              <div style={uploadModalSubtitleStyle}>
                Add a shared admission document to the library.
              </div>
            </div>
          </div>

          <button onClick={onClose} style={modalCloseBtnStyle}>
            <X size={16} />
          </button>
        </div>

        <div style={uploadModalBodyStyle}>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>
              Document Title <span style={requiredStyle}>*</span>
            </label>

            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Physical Exam Form"
              style={{
                ...inputStyle,
                borderColor: errors.title ? '#fca5a5' : '#dbe3ef',
              }}
            />

            {errors.title && <div style={errorTextStyle}>{errors.title}</div>}
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>
              Category <span style={requiredStyle}>*</span>
            </label>

            <div style={{ position: 'relative' }}>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setErrors((prev) => ({ ...prev, category: '' }));
                }}
                style={{
                  ...selectInputStyle,
                  borderColor: errors.category ? '#fca5a5' : '#dbe3ef',
                  color: category ? '#334155' : '#94a3b8',
                }}
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <ChevronDown size={15} style={selectChevronStyle} />
            </div>

            {errors.category && <div style={errorTextStyle}>{errors.category}</div>}
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>
              Description <span style={optionalStyle}>optional</span>
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this document..."
              style={textareaStyle}
            />
          </div>

          <div style={fieldGroupStyle}>
            <label style={labelStyle}>
              File <span style={requiredStyle}>*</span>
            </label>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{
                ...dropZoneStyle,
                borderColor: errors.file
                  ? '#fca5a5'
                  : dragging
                  ? '#2563eb'
                  : file
                  ? '#86efac'
                  : '#cbd5e1',
                background: dragging ? '#eff6ff' : file ? '#f0fdf4' : '#f8fafc',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];

                  if (selectedFile) {
                    setFile(selectedFile);
                    setErrors((prev) => ({ ...prev, file: '' }));
                  }
                }}
              />

              {file ? (
                <div style={selectedFileStyle}>
                  <div style={filePreviewIconStyle}>
                    <FileIcon mime={file.type} />
                  </div>

                  <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <div style={selectedFileNameStyle}>{file.name}</div>
                    <div style={selectedFileMetaStyle}>{formatSize(file.size)}</div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    style={removeFileBtnStyle}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={dropIconStyle}>
                    <Upload size={24} />
                  </div>

                  <div style={dropTitleStyle}>
                    Drop file here or <span style={{ color: '#2563eb' }}>browse</span>
                  </div>

                  <div style={dropSubtitleStyle}>
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT
                  </div>
                </div>
              )}
            </div>

            {errors.file && <div style={errorTextStyle}>{errors.file}</div>}
          </div>
        </div>

        <div style={uploadModalFooterStyle}>
          <button onClick={onClose} style={secondaryBtnStyle}>
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending}
            style={{
              ...primaryBtnStyle,
              opacity: uploadMutation.isPending ? 0.7 : 1,
              cursor: uploadMutation.isPending ? 'not-allowed' : 'pointer',
            }}
          >
            {uploadMutation.isPending ? (
              <>
                <span style={spinnerStyle} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={15} />
                Upload Document
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const { data, isLoading } = useQuery<SharedDocument[]>({
    queryKey: ['shared-documents'],
    queryFn: () =>
      documentsApi.list().then((r) => r.data?.documents ?? r.data ?? []),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted');
      qc.invalidateQueries({ queryKey: ['shared-documents'] });
      setDeleteId(null);
      setDeleteName('');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const docs: SharedDocument[] = data || [];

  const filtered = docs.filter((doc) => {
    const q = search.trim().toLowerCase();

    const matchSearch =
      !q ||
      doc.title?.toLowerCase().includes(q) ||
      doc.category?.toLowerCase().includes(q) ||
      doc.file_name?.toLowerCase().includes(q) ||
      doc.uploaded_by_name?.toLowerCase().includes(q) ||
      getMimeLabel(doc.mime_type).toLowerCase().includes(q);

    const matchCategory = !catFilter || doc.category === catFilter;

    return matchSearch && matchCategory;
  });

  const handleDownload = async (doc: SharedDocument) => {
    try {
      const res = await api.get(`/shared-documents/${doc.id}/file`, {
        responseType: 'blob',
      });

      const url = URL.createObjectURL(
        new Blob([res.data], {
          type: String(doc.mime_type || res.headers['content-type'] || 'application/octet-stream'),
        })
      );

      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      toast.success(`Downloading ${doc.file_name}`);
    } catch {
      toast.error('Download failed. Please try again.');
    }
  };

  const handleView = async (doc: SharedDocument) => {
    try {
      const res = await api.get(`/shared-documents/${doc.id}/file`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: String(doc.mime_type || res.headers['content-type'] || 'application/octet-stream'),
      });

      const url = URL.createObjectURL(blob);

      window.open(url, '_blank');

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error('Could not open file. Please try downloading instead.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCatFilter('');
  };

  const hasFilters = Boolean(search || catFilter);

  return (
    <div style={pageStyle}>
      <div style={toolbarCardStyle}>
        <div style={searchBoxStyle}>
          <Search size={15} style={searchIconStyle} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, uploader, or type..."
            style={searchInputStyle}
          />

          {search && (
            <button onClick={() => setSearch('')} style={clearSearchBtnStyle}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={categoryBoxStyle}>
          <Filter size={14} style={filterIconStyle} />

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            style={{
              ...categorySelectStyle,
              color: catFilter ? '#334155' : '#94a3b8',
            }}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <ChevronDown size={14} style={categoryChevronStyle} />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} style={clearFilterBtnStyle}>
            <X size={14} />
            Clear
          </button>
        )}

        <div style={countPillStyle}>
          {filtered.length} {filtered.length === 1 ? 'Document' : 'Documents'}
          {hasFilters && docs.length !== filtered.length ? ` of ${docs.length}` : ''}
        </div>

        {canManage && (
          <button onClick={() => setShowUpload(true)} style={uploadBtnStyle}>
            <Upload size={15} />
            Upload
          </button>
        )}
      </div>

      <div style={contentCardStyle}>
        {isLoading ? (
          <div style={skeletonWrapStyle}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={skeletonRowStyle}>
                <div style={skeletonIconStyle} />
                <div style={{ flex: 1 }}>
                  <div style={{ ...skeletonLineStyle, width: '28%' }} />
                  <div style={{ ...skeletonLineStyle, width: '42%', marginTop: 8 }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={emptyIconStyle}>
              <FolderOpen size={34} style={{ color: '#2563eb' }} />
            </div>

            <div style={emptyTitleStyle}>
              {hasFilters ? 'No documents match your filters' : 'No documents yet'}
            </div>

            <div style={emptySubtitleStyle}>
              {hasFilters
                ? 'Try adjusting your search or category filter.'
                : canManage
                ? 'Upload the first shared document for admission processing.'
                : 'No shared admission documents have been uploaded yet.'}
            </div>

            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              {hasFilters && (
                <button onClick={clearFilters} style={secondaryBtnStyle}>
                  Clear filters
                </button>
              )}

              {!hasFilters && canManage && (
                <button onClick={() => setShowUpload(true)} style={primaryBtnStyle}>
                  <Upload size={15} />
                  Upload First Document
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    ['Document', '27%'],
                    ['Category', '14%'],
                    ['Type', '8%'],
                    ['Size', '9%'],
                    ['Uploaded By', '15%'],
                    ['Date', '10%'],
                    ['Actions', '17%'],
                  ].map(([label, width]) => (
                    <th key={label as string} style={{ ...thStyle, width: width as string }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} style={rowStyle}>
                    <td style={firstTdStyle}>
                      <div style={documentCellStyle}>
                        <div style={docIconBoxStyle}>
                          <FileIcon mime={doc.mime_type} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={docTitleStyle}>{doc.title}</div>

                          {doc.description && (
                            <div style={docDescriptionStyle}>{doc.description}</div>
                          )}

                          <div style={docFileNameStyle}>{doc.file_name}</div>
                        </div>
                      </div>
                    </td>

                    <td style={bodyTdStyle}>
                      <CategoryBadge category={doc.category} />
                    </td>

                    <td style={bodyTdStyle}>
                      <TypeBadge mime={doc.mime_type} />
                    </td>

                    <td style={bodyTdStyle}>
                      <span style={sizeTextStyle}>{formatSize(doc.file_size)}</span>
                    </td>

                    <td style={bodyTdStyle}>
                      <div style={uploadedNameStyle}>{doc.uploaded_by_name || '—'}</div>

                      {doc.uploaded_by_role && (
                        <div style={uploadedRoleStyle}>{doc.uploaded_by_role}</div>
                      )}
                    </td>

                    <td style={bodyTdStyle}>
                      <span style={dateTextStyle}>{formatDate(doc.created_at)}</span>
                    </td>

                    <td style={lastTdStyle}>
                      <div style={actionsWrapStyle}>
                        <button onClick={() => handleView(doc)} style={viewBtnStyle}>
                          <Eye size={13} />
                          View
                        </button>

                        <button onClick={() => handleDownload(doc)} style={downloadBtnStyle}>
                          <Download size={13} />
                          Download
                        </button>

                        {canManage && (
                          <button
                            onClick={() => {
                              setDeleteId(doc.id);
                              setDeleteName(doc.title);
                            }}
                            title="Delete document"
                            style={deleteIconBtnStyle}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['shared-documents'] })}
        />
      )}

      {deleteId && (
        <div style={modalOverlayStyle}>
          <div style={deleteModalStyle}>
            <div style={deleteHeaderStyle}>
              <div style={deleteModalIconStyle}>
                <Trash2 size={20} />
              </div>

              <div>
                <div style={deleteModalTitleStyle}>Delete Document</div>
                <div style={deleteModalSubtitleStyle}>This action cannot be undone.</div>
              </div>
            </div>

            <p style={deleteModalTextStyle}>
              Are you sure you want to delete <strong>"{deleteName}"</strong>? This will
              permanently remove the file from the document library.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteId(null)} style={secondaryBtnStyle}>
                Cancel
              </button>

              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                style={{
                  ...dangerBtnStyle,
                  opacity: deleteMutation.isPending ? 0.65 : 1,
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {canManage && docs.length === 0 && !isLoading && (
        <div style={setupNoticeStyle}>
          <AlertCircle size={16} style={{ color: '#b45309', flexShrink: 0, marginTop: 2 }} />

          <div style={setupNoticeTextStyle}>
            <strong>Backend setup required:</strong> Create the{' '}
            <code>/api/shared-documents</code> endpoint to enable document storage. The
            interface is ready.
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const pageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  padding: '16px 22px 18px',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%)',
};

const toolbarCardStyle: CSSProperties = {
  flexShrink: 0,
  borderRadius: 22,
  border: '1px solid #e2e8f0',
  background: 'rgba(255,255,255,0.95)',
  boxShadow: '0 18px 42px rgba(15,23,42,0.055)',
  padding: 14,
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 1fr) 210px auto auto auto',
  gap: 10,
  alignItems: 'center',
};

const searchBoxStyle: CSSProperties = {
  position: 'relative',
  minWidth: 0,
};

const searchIconStyle: CSSProperties = {
  position: 'absolute',
  left: 13,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  pointerEvents: 'none',
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  padding: '0 38px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const clearSearchBtnStyle: CSSProperties = {
  position: 'absolute',
  right: 11,
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'inline-flex',
  padding: 0,
};

const categoryBoxStyle: CSSProperties = {
  position: 'relative',
};

const filterIconStyle: CSSProperties = {
  position: 'absolute',
  left: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  pointerEvents: 'none',
};

const categorySelectStyle: CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  padding: '0 34px 0 34px',
  outline: 'none',
  appearance: 'none',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 800,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const categoryChevronStyle: CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  pointerEvents: 'none',
};

const clearFilterBtnStyle: CSSProperties = {
  height: 42,
  padding: '0 12px',
  borderRadius: 14,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 12.5,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  whiteSpace: 'nowrap',
};

const countPillStyle: CSSProperties = {
  height: 42,
  padding: '0 13px',
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 12.5,
  fontWeight: 900,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
};

const uploadBtnStyle: CSSProperties = {
  height: 42,
  padding: '0 14px',
  borderRadius: 14,
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  whiteSpace: 'nowrap',
  boxShadow: '0 14px 28px rgba(37,99,235,0.24)',
};

const contentCardStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  boxShadow: '0 18px 42px rgba(15,23,42,0.055)',
  display: 'flex',
  flexDirection: 'column',
};

const tableWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  padding: '0 12px 12px',
};

const tableStyle: CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'separate',
  borderSpacing: '0 10px',
};

const thStyle: CSSProperties = {
  padding: '12px 12px',
  borderTop: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  background: '#f8fafc',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 950,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const rowStyle: CSSProperties = {
  background: '#ffffff',
  boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
};

const bodyTdStyle: CSSProperties = {
  padding: '13px 12px',
  background: '#ffffff',
  borderTop: '1px solid #e8edf4',
  borderBottom: '1px solid #e8edf4',
  verticalAlign: 'middle',
  overflow: 'hidden',
};

const firstTdStyle: CSSProperties = {
  ...bodyTdStyle,
  borderTopLeftRadius: 18,
  borderBottomLeftRadius: 18,
  borderLeft: '1px solid #e8edf4',
};

const lastTdStyle: CSSProperties = {
  ...bodyTdStyle,
  borderTopRightRadius: 18,
  borderBottomRightRadius: 18,
  borderRight: '1px solid #e8edf4',
};

const documentCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
};

const docIconBoxStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 13,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const docTitleStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 950,
  color: '#0f172a',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const docDescriptionStyle: CSSProperties = {
  marginTop: 1,
  fontSize: 11.5,
  fontWeight: 700,
  color: '#94a3b8',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const docFileNameStyle: CSSProperties = {
  marginTop: 1,
  fontSize: 11,
  fontWeight: 750,
  color: '#94a3b8',
  fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const typeBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 25,
  padding: '0 8px',
  borderRadius: 999,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#475569',
  fontSize: 11.5,
  fontWeight: 900,
  whiteSpace: 'nowrap',
};

const sizeTextStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: '#64748b',
  whiteSpace: 'nowrap',
};

const uploadedNameStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: '#334155',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const uploadedRoleStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  fontWeight: 700,
  color: '#94a3b8',
  textTransform: 'capitalize',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dateTextStyle: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 800,
  color: '#64748b',
  fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  whiteSpace: 'nowrap',
};

const actionsWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 5,
  flexWrap: 'nowrap',
  transform: 'translateX(-8px)',
};

const viewBtnStyle: CSSProperties = {
  height: 30,
  padding: '0 8px',
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 11.5,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap',
};

const downloadBtnStyle: CSSProperties = {
  height: 30,
  padding: '0 8px',
  borderRadius: 10,
  border: '1px solid #bbf7d0',
  background: '#f0fdf4',
  color: '#15803d',
  fontSize: 11.5,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  whiteSpace: 'nowrap',
};

const deleteIconBtnStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const skeletonWrapStyle: CSSProperties = {
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const skeletonRowStyle: CSSProperties = {
  height: 66,
  borderRadius: 18,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 16px',
};

const skeletonIconStyle: CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 13,
  background: '#e2e8f0',
};

const skeletonLineStyle: CSSProperties = {
  height: 12,
  borderRadius: 999,
  background: '#e2e8f0',
};

const emptyStateStyle: CSSProperties = {
  height: '100%',
  minHeight: 380,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 30,
  textAlign: 'center',
};

const emptyIconStyle: CSSProperties = {
  width: 76,
  height: 76,
  borderRadius: 24,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 16,
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: '#0f172a',
};

const emptySubtitleStyle: CSSProperties = {
  marginTop: 7,
  maxWidth: 420,
  fontSize: 13,
  fontWeight: 700,
  color: '#94a3b8',
  lineHeight: 1.6,
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  background: 'rgba(15,23,42,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
  backdropFilter: 'blur(6px)',
};

const uploadModalStyle: CSSProperties = {
  width: 560,
  maxWidth: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  boxShadow: '0 28px 80px rgba(15,23,42,0.24)',
};

const uploadModalHeaderStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 2,
  padding: '20px 22px',
  borderBottom: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const uploadModalIconStyle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 15,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#2563eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const uploadModalTitleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.035em',
};

const uploadModalSubtitleStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12.5,
  fontWeight: 700,
  color: '#94a3b8',
};

const modalCloseBtnStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const uploadModalBodyStyle: CSSProperties = {
  padding: 22,
};

const fieldGroupStyle: CSSProperties = {
  marginBottom: 16,
};

const labelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: 12.5,
  fontWeight: 900,
  color: '#475569',
};

const requiredStyle: CSSProperties = {
  color: '#ef4444',
};

const optionalStyle: CSSProperties = {
  marginLeft: 5,
  color: '#94a3b8',
  fontWeight: 650,
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 14px',
  outline: 'none',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectInputStyle: CSSProperties = {
  ...inputStyle,
  appearance: 'none',
  cursor: 'pointer',
  paddingRight: 38,
};

const selectChevronStyle: CSSProperties = {
  position: 'absolute',
  right: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  pointerEvents: 'none',
};

const textareaStyle: CSSProperties = {
  ...inputStyle,
  height: 84,
  resize: 'none',
  paddingTop: 12,
  lineHeight: 1.55,
};

const errorTextStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 12,
  fontWeight: 800,
  color: '#dc2626',
};

const dropZoneStyle: CSSProperties = {
  border: '2px dashed #cbd5e1',
  borderRadius: 18,
  padding: '24px 16px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};

const selectedFileStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const filePreviewIconStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  border: '1px solid #bbf7d0',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const selectedFileNameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 950,
  color: '#15803d',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const selectedFileMetaStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12,
  fontWeight: 700,
  color: '#64748b',
};

const removeFileBtnStyle: CSSProperties = {
  height: 30,
  padding: '0 10px',
  borderRadius: 10,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const dropIconStyle: CSSProperties = {
  width: 48,
  height: 48,
  margin: '0 auto 10px',
  borderRadius: 16,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  color: '#94a3b8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const dropTitleStyle: CSSProperties = {
  fontSize: 13.5,
  fontWeight: 900,
  color: '#475569',
};

const dropSubtitleStyle: CSSProperties = {
  marginTop: 5,
  fontSize: 12,
  fontWeight: 700,
  color: '#94a3b8',
};

const uploadModalFooterStyle: CSSProperties = {
  padding: '16px 22px',
  borderTop: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  gap: 10,
};

const secondaryBtnStyle: CSSProperties = {
  height: 42,
  flex: 1,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  color: '#475569',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const primaryBtnStyle: CSSProperties = {
  height: 42,
  flex: 1.4,
  borderRadius: 14,
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: '0 12px 24px rgba(37,99,235,0.22)',
};

const dangerBtnStyle: CSSProperties = {
  ...primaryBtnStyle,
  background: '#dc2626',
  boxShadow: '0 12px 24px rgba(220,38,38,0.22)',
};

const spinnerStyle: CSSProperties = {
  width: 14,
  height: 14,
  border: '2px solid rgba(255,255,255,0.35)',
  borderTopColor: '#ffffff',
  borderRadius: '50%',
  display: 'inline-block',
  animation: 'spin 0.7s linear infinite',
};

const deleteModalStyle: CSSProperties = {
  width: 420,
  maxWidth: '100%',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  padding: 24,
  boxShadow: '0 28px 80px rgba(15,23,42,0.24)',
};

const deleteHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 13,
  marginBottom: 16,
};

const deleteModalIconStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const deleteModalTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: '#0f172a',
};

const deleteModalSubtitleStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12.5,
  fontWeight: 750,
  color: '#94a3b8',
};

const deleteModalTextStyle: CSSProperties = {
  margin: '0 0 22px',
  fontSize: 13.5,
  fontWeight: 650,
  color: '#475569',
  lineHeight: 1.7,
};

const setupNoticeStyle: CSSProperties = {
  flexShrink: 0,
  padding: '13px 16px',
  borderRadius: 16,
  background: '#fffbeb',
  border: '1px solid #fde68a',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
};

const setupNoticeTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: '#92400e',
  lineHeight: 1.6,
};