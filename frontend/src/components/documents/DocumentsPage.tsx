// src/components/documents/DocumentsPage.tsx
import { useCallback, useRef, useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
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

import { api, sharedDocsApi } from '@/api/client';
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
    bg: 'var(--accent-light)',
    color: 'var(--btn-subtle-color)',
    border: 'var(--status-processing-border)',
  },
  'University Documents': {
    bg: 'var(--status-pre-bg)',
    color: 'var(--status-pre-text)',
    border: 'var(--status-pre-border)',
  },
  'Visa Documents': {
    bg: 'var(--status-pending-bg)',
    color: 'var(--status-pending-text)',
    border: 'var(--status-pending-border)',
  },
  'Financial Documents': {
    bg: 'var(--status-approved-bg)',
    color: 'var(--status-approved-text)',
    border: 'var(--status-approved-border)',
  },
  Templates: {
    bg: 'var(--status-admitted-bg)',
    color: 'var(--status-admitted-text)',
    border: 'var(--status-admitted-border)',
  },
  Notices: {
    bg: 'var(--status-rejected-bg)',
    color: 'var(--status-rejected-text)',
    border: 'var(--status-rejected-border)',
  },
  Others: {
    bg: 'var(--ui-surface-subtle)',
    color: 'var(--ui-text-body)',
    border: 'var(--ui-border)',
  },
};

function formatSize(bytes: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-CA');
}

function getMimeLabel(mime: string): string {
  if (!mime) return '-';
  if (mime === 'application/pdf') return 'PDF';
  if (mime.startsWith('image/')) return mime.split('/')[1]?.toUpperCase() || 'IMAGE';
  if (mime.includes('word')) return 'DOCX';
  if (mime.includes('excel') || mime.includes('spreadsheet')) return 'XLSX';
  if (mime.includes('text')) return 'TXT';
  return mime.split('/')[1]?.toUpperCase() || mime;
}

function safeFileName(name: string): string {
  return name?.trim() || 'document';
}

function FileIcon({ mime }: { mime: string }) {
  if (mime?.startsWith('image/')) {
    return <FileImage size={18} className="docs-file-icon docs-file-icon-image" />;
  }

  if (mime === 'application/pdf') {
    return <FileText size={18} className="docs-file-icon docs-file-icon-pdf" />;
  }

  return <File size={18} className="docs-file-icon docs-file-icon-default" />;
}

function CategoryBadge({ category }: { category: string }) {
  const c = CAT_COLORS[category] || CAT_COLORS.Others;

  const style: CSSProperties = {
    borderColor: c.border,
    background: c.bg,
    color: c.color,
  };

  return (
    <span className="docs-category-badge" style={style} title={category || 'Others'}>
      {category || 'Others'}
    </span>
  );
}

function TypeBadge({ mime }: { mime: string }) {
  return <span className="docs-type-badge">{getMimeLabel(mime)}</span>;
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
    mutationFn: (fd: FormData) => sharedDocsApi.upload(fd),
    onSuccess: () => {
      toast.success('Document uploaded', {
        description: 'The file has been added to the document library.',
      });
      onSuccess();
      onClose();
    },
    onError: () =>
      toast.error('Upload failed', {
        description: 'Please check the file and try again.',
      }),
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
    <div className="docs-modal-overlay">
      <div className="docs-upload-modal">
        <div className="docs-modal-header">
          <div className="docs-modal-title-wrap">
            <div className="docs-modal-icon">
              <Upload size={18} />
            </div>

            <div>
              <div className="docs-modal-title">Upload Document</div>
              <div className="docs-modal-subtitle">
                Add a shared admission document to the library.
              </div>
            </div>
          </div>

          <button onClick={onClose} className="docs-modal-close" type="button">
            <X size={16} />
          </button>
        </div>

        <div className="docs-modal-body">
          <div className="docs-field">
            <label className="docs-label">
              Document Title <span className="docs-required">*</span>
            </label>

            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Physical Exam Form"
              className={`docs-input ${errors.title ? 'docs-input-error' : ''}`}
            />

            {errors.title && <div className="docs-error-text">{errors.title}</div>}
          </div>

          <div className="docs-field">
            <label className="docs-label">
              Category <span className="docs-required">*</span>
            </label>

            <div className="docs-select-wrap">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setErrors((prev) => ({ ...prev, category: '' }));
                }}
                className={`docs-input docs-select ${errors.category ? 'docs-input-error' : ''} ${
                  category ? '' : 'docs-select-placeholder'
                }`}
              >
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <ChevronDown size={15} className="docs-select-chevron" />
            </div>

            {errors.category && <div className="docs-error-text">{errors.category}</div>}
          </div>

          <div className="docs-field">
            <label className="docs-label">
              Description <span className="docs-optional">optional</span>
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of this document..."
              className="docs-input docs-textarea"
            />
          </div>

          <div className="docs-field">
            <label className="docs-label">
              File <span className="docs-required">*</span>
            </label>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`docs-dropzone ${dragging ? 'docs-dropzone-dragging' : ''} ${
                file ? 'docs-dropzone-selected' : ''
              } ${errors.file ? 'docs-dropzone-error' : ''}`}
            >
              <input
                ref={fileRef}
                type="file"
                className="docs-hidden-input"
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
                <div className="docs-selected-file">
                  <div className="docs-selected-file-icon">
                    <FileIcon mime={file.type} />
                  </div>

                  <div className="docs-selected-file-info">
                    <div className="docs-selected-file-name">{file.name}</div>
                    <div className="docs-selected-file-size">{formatSize(file.size)}</div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="docs-remove-file-btn"
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="docs-drop-empty">
                  <div className="docs-drop-icon">
                    <Upload size={24} />
                  </div>

                  <div className="docs-drop-title">
                    Drop file here or <span>browse</span>
                  </div>

                  <div className="docs-drop-subtitle">
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TXT
                  </div>
                </div>
              )}
            </div>

            {errors.file && <div className="docs-error-text">{errors.file}</div>}
          </div>
        </div>

        <div className="docs-modal-footer">
          <button onClick={onClose} className="docs-secondary-btn" type="button">
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={uploadMutation.isPending}
            className="docs-primary-btn"
            type="button"
          >
            {uploadMutation.isPending ? (
              <>
                <span className="docs-spinner" />
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
      sharedDocsApi.list().then((r) => r.data?.documents ?? r.data ?? []),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    placeholderData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sharedDocsApi.delete(id),
    onSuccess: () => {
      toast.success('Document deleted', {
        description: 'The file has been removed from the document library.',
      });
      qc.invalidateQueries({ queryKey: ['shared-documents'] });
      setDeleteId(null);
      setDeleteName('');
    },
    onError: () =>
      toast.error('Failed to delete document', {
        description: 'Please try again.',
      }),
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

      const blob = new Blob([res.data], {
        type: String(doc.mime_type || res.headers['content-type'] || 'application/octet-stream'),
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = safeFileName(doc.file_name);

      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      toast.success('Download started', {
        description: doc.file_name,
      });
    } catch {
      toast.error('Download failed', {
        description: 'Please try again.',
      });
    }
  };

  const handleView = async (doc: SharedDocument) => {
    let viewer: Window | null = null;

    try {
      viewer = window.open('', '_blank');

      if (viewer) {
        viewer.document.title = 'Loading document...';
        viewer.document.body.innerHTML =
          '<p style="font-family: system-ui, sans-serif; padding: 24px; color: var(--ui-text-strong);">Loading document...</p>';
      }

      const res = await api.get(`/shared-documents/${doc.id}/file`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: String(doc.mime_type || res.headers['content-type'] || 'application/octet-stream'),
      });

      const url = URL.createObjectURL(blob);

      if (viewer) viewer.location.href = url;
      else window.open(url, '_blank');

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      if (viewer) viewer.close();

      toast.error('Could not open file', {
        description: 'Please try downloading instead.',
      });
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCatFilter('');
  };

  const hasFilters = Boolean(search || catFilter);

  return (
    <div className="docs-page">
      <style>{documentsPageCss}</style>

      <div className="docs-toolbar">
        <div className="docs-search-box">
          <Search size={15} className="docs-search-icon" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category, uploader, or type..."
            className="docs-search-input"
          />

          {search && (
            <button onClick={() => setSearch('')} className="docs-clear-search" type="button">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="docs-category-box">
          <Filter size={14} className="docs-filter-icon" />

          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className={`docs-category-select ${catFilter ? '' : 'docs-select-placeholder'}`}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <ChevronDown size={14} className="docs-category-chevron" />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="docs-clear-filter-btn" type="button">
            <X size={14} />
            Clear
          </button>
        )}

        <div className="docs-count-pill">
          {filtered.length} {filtered.length === 1 ? 'Document' : 'Documents'}
          {hasFilters && docs.length !== filtered.length ? ` of ${docs.length}` : ''}
        </div>

        {canManage && (
          <button onClick={() => setShowUpload(true)} className="docs-upload-btn" type="button">
            <Upload size={15} />
            Upload
          </button>
        )}
      </div>

      <div className="docs-content-card">
        {isLoading ? (
          <div className="docs-skeleton-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="docs-skeleton-row">
                <div className="docs-skeleton-icon" />
                <div className="docs-skeleton-content">
                  <div className="docs-skeleton-line docs-skeleton-line-short" />
                  <div className="docs-skeleton-line docs-skeleton-line-long" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="docs-empty">
            <div className="docs-empty-icon">
              <FolderOpen size={34} />
            </div>

            <div className="docs-empty-title">
              {hasFilters ? 'No documents match your filters' : 'No documents yet'}
            </div>

            <div className="docs-empty-subtitle">
              {hasFilters
                ? 'Try adjusting your search or category filter.'
                : canManage
                ? 'Upload the first shared document for admission processing.'
                : 'No shared admission documents have been uploaded yet.'}
            </div>

            <div className="docs-empty-actions">
              {hasFilters && (
                <button onClick={clearFilters} className="docs-secondary-btn" type="button">
                  Clear filters
                </button>
              )}

              {!hasFilters && canManage && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="docs-primary-btn"
                  type="button"
                >
                  <Upload size={15} />
                  Upload First Document
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="docs-table-wrap">
            <table className="docs-table">
              <thead>
                <tr>
                  {[
                    ['Document', '31%'],
                    ['Category', '15%'],
                    ['Type', '8%'],
                    ['Size', '9%'],
                    ['Uploaded By', '16%'],
                    ['Date', '10%'],
                    ['Actions', '11%'],
                  ].map(([label, width]) => (
                    <th key={label} style={{ width }}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td className="docs-first-td">
                      <div className="docs-document-cell">
                        <div className="docs-doc-icon-box">
                          <FileIcon mime={doc.mime_type} />
                        </div>

                        <div className="docs-doc-info">
                          <div className="docs-doc-title" title={doc.title}>
                            {doc.title}
                          </div>

                          {doc.description && (
                            <div className="docs-doc-description" title={doc.description}>
                              {doc.description}
                            </div>
                          )}

                          <div className="docs-doc-file-name" title={doc.file_name}>
                            {doc.file_name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <CategoryBadge category={doc.category} />
                    </td>

                    <td>
                      <TypeBadge mime={doc.mime_type} />
                    </td>

                    <td>
                      <span className="docs-size-text">{formatSize(doc.file_size)}</span>
                    </td>

                    <td>
                      <div className="docs-uploaded-name" title={doc.uploaded_by_name || '-'}>
                        {doc.uploaded_by_name || '-'}
                      </div>

                      {doc.uploaded_by_role && (
                        <div className="docs-uploaded-role">{doc.uploaded_by_role}</div>
                      )}
                    </td>

                    <td>
                      <span className="docs-date-text">{formatDate(doc.created_at)}</span>
                    </td>

                    <td className="docs-last-td">
                      <div className="docs-actions">
                        <button
                          onClick={() => handleView(doc)}
                          className="docs-icon-btn docs-view-btn"
                          title="View document"
                          type="button"
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          onClick={() => handleDownload(doc)}
                          className="docs-icon-btn docs-download-btn"
                          title="Download document"
                          type="button"
                        >
                          <Download size={14} />
                        </button>

                        {canManage && (
                          <button
                            onClick={() => {
                              setDeleteId(doc.id);
                              setDeleteName(doc.title);
                            }}
                            className="docs-icon-btn docs-delete-btn"
                            title="Delete document"
                            type="button"
                          >
                            <Trash2 size={14} />
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
        <div className="docs-modal-overlay">
          <div className="docs-delete-modal">
            <div className="docs-delete-header">
              <div className="docs-delete-icon">
                <Trash2 size={20} />
              </div>

              <div>
                <div className="docs-delete-title">Delete Document</div>
                <div className="docs-delete-subtitle">This action cannot be undone.</div>
              </div>
            </div>

            <p className="docs-delete-text">
              Are you sure you want to delete <strong>"{deleteName}"</strong>? This will
              permanently remove the file from the document library.
            </p>

            <div className="docs-delete-actions">
              <button
                onClick={() => {
                  setDeleteId(null);
                  setDeleteName('');
                }}
                className="docs-secondary-btn"
                type="button"
              >
                Cancel
              </button>

              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="docs-danger-btn"
                type="button"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const documentsPageCss = `
.docs-page {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 22px 18px;
  background:
    radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%),
    linear-gradient(180deg, var(--ui-surface-subtle) 0%, var(--surface-muted) 100%);
}

.docs-toolbar {
  flex-shrink: 0;
  border-radius: 22px;
  border: 1px solid var(--ui-border);
  background: var(--surface-soft);
  box-shadow: 0 18px 42px rgba(15,23,42,0.055);
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 210px auto auto auto;
  gap: 10px;
  align-items: center;
}

.docs-search-box,
.docs-category-box,
.docs-select-wrap {
  position: relative;
  min-width: 0;
}

.docs-search-icon,
.docs-filter-icon {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ui-text-subtle);
  pointer-events: none;
}

.docs-filter-icon {
  left: 12px;
}

.docs-search-input,
.docs-category-select,
.docs-input {
  width: 100%;
  height: 42px;
  border-radius: 14px;
  border: 1px solid var(--ui-border-strong);
  background: var(--surface);
  outline: none;
  font-size: 13px;
  font-weight: 700;
  color: var(--ui-text-strong);
  font-family: inherit;
  box-sizing: border-box;
}

.docs-search-input {
  padding: 0 38px;
}

.docs-category-select {
  padding: 0 34px;
  appearance: none;
  cursor: pointer;
  font-weight: 800;
}

.docs-select-placeholder {
  color: var(--ui-text-subtle);
}

.docs-category-chevron,
.docs-select-chevron {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--ui-text-subtle);
  pointer-events: none;
}

.docs-select-chevron {
  right: 14px;
}

.docs-clear-search {
  position: absolute;
  right: 11px;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  background: transparent;
  color: var(--ui-text-subtle);
  cursor: pointer;
  display: inline-flex;
  padding: 0;
}

.docs-clear-filter-btn,
.docs-count-pill,
.docs-upload-btn {
  height: 42px;
  border-radius: 14px;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.docs-clear-filter-btn {
  padding: 0 12px;
  border: 1px solid var(--status-rejected-border);
  background: var(--status-rejected-bg);
  color: var(--btn-danger-soft-color);
  font-size: 12.5px;
  font-weight: 900;
  cursor: pointer;
  gap: 6px;
}

.docs-count-pill {
  padding: 0 13px;
  border: 1px solid var(--ui-border-strong);
  background: var(--ui-surface-subtle);
  color: var(--ui-text-body);
  font-size: 12.5px;
  font-weight: 900;
}

.docs-upload-btn {
  padding: 0 14px;
  border: 1px solid var(--btn-primary-border);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
  gap: 7px;
  box-shadow: var(--btn-primary-shadow);
}

.docs-content-card {
  flex: 0 1 auto;
  min-height: 0;
  max-height: calc(100vh - 220px);
  overflow: auto;
  border-radius: 24px;
  border: 1px solid var(--ui-border);
  background: var(--surface);
  box-shadow: 0 18px 42px rgba(15,23,42,0.055);
}

.docs-table-wrap {
  overflow-x: auto;
  overflow-y: auto;
  padding: 0 12px 12px;
}

.docs-table {
  width: 100%;
  min-width: 1080px;
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0 10px;
}

.docs-table th {
  padding: 12px;
  border-top: 1px solid var(--ui-border);
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-surface-subtle);
  text-align: left;
  font-size: 10.5px;
  font-weight: 950;
  color: var(--ui-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-table td {
  padding: 13px 12px;
  background: var(--surface);
  border-top: 1px solid var(--ui-border-soft);
  border-bottom: 1px solid var(--ui-border-soft);
  vertical-align: middle;
  overflow: hidden;
}

.docs-table tbody tr {
  background: var(--surface);
  box-shadow: 0 8px 20px rgba(15,23,42,0.04);
}

.docs-first-td {
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
  border-left: 1px solid var(--ui-border-soft);
}

.docs-last-td {
  border-top-right-radius: 18px;
  border-bottom-right-radius: 18px;
  border-right: 1px solid var(--ui-border-soft);
}

.docs-document-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.docs-doc-icon-box {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  border: 1px solid var(--ui-border);
  background: var(--ui-surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.docs-file-icon-image {
  color: #7c3aed;
}

.docs-file-icon-pdf {
  color: var(--status-rejected-text);
}

.docs-file-icon-default {
  color: var(--btn-subtle-color);
}

.docs-doc-info {
  min-width: 0;
}

.docs-doc-title {
  font-size: 13px;
  font-weight: 950;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-doc-description,
.docs-doc-file-name {
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-doc-description {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--ui-text-subtle);
}

.docs-doc-file-name {
  font-size: 11px;
  font-weight: 750;
  color: var(--ui-text-subtle);
  font-family: Inter, sans-serif;
}

.docs-category-badge,
.docs-type-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--ui-border);
  font-size: 11.5px;
  font-weight: 900;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-type-badge {
  height: 25px;
  padding: 0 8px;
  background: var(--ui-surface-subtle);
  color: var(--ui-text-body);
}

.docs-size-text {
  font-size: 12px;
  font-weight: 800;
  color: var(--ui-text-muted);
  white-space: nowrap;
}

.docs-uploaded-name {
  font-size: 12px;
  font-weight: 900;
  color: var(--ui-text-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-uploaded-role {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ui-text-subtle);
  text-transform: capitalize;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-date-text {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--ui-text-muted);
  font-family: Inter, sans-serif;
  white-space: nowrap;
}

.docs-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  flex-wrap: nowrap;
}

.docs-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.docs-icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(15,23,42,0.08);
}

.docs-view-btn {
  border: 1px solid var(--btn-subtle-border);
  background: var(--btn-subtle-bg);
  color: var(--btn-subtle-color);
}

.docs-download-btn {
  border: 1px solid var(--btn-success-soft-border);
  background: var(--btn-success-soft-bg);
  color: var(--btn-success-soft-color);
}

.docs-delete-btn {
  border: 1px solid var(--btn-danger-soft-border);
  background: var(--btn-danger-soft-bg);
  color: var(--btn-danger-soft-color);
}

.docs-skeleton-wrap {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.docs-skeleton-row {
  height: 66px;
  border-radius: 18px;
  border: 1px solid var(--ui-border);
  background: var(--surface);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
}

.docs-skeleton-icon {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  background: var(--ui-border);
}

.docs-skeleton-content {
  flex: 1;
}

.docs-skeleton-line {
  height: 12px;
  border-radius: 999px;
  background: var(--ui-border);
}

.docs-skeleton-line-short {
  width: 28%;
}

.docs-skeleton-line-long {
  width: 42%;
  margin-top: 8px;
}

.docs-empty {
  height: 100%;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
}

.docs-empty-icon {
  width: 76px;
  height: 76px;
  border-radius: 24px;
  border: 1px solid var(--status-processing-border);
  background: var(--accent-light);
  color: var(--btn-subtle-color);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.docs-empty-title {
  font-size: 17px;
  font-weight: 950;
  color: var(--text-primary);
}

.docs-empty-subtitle {
  margin-top: 7px;
  max-width: 420px;
  font-size: 13px;
  font-weight: 700;
  color: var(--ui-text-subtle);
  line-height: 1.6;
}

.docs-empty-actions {
  margin-top: 18px;
  display: flex;
  gap: 10px;
}

.docs-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15,23,42,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  backdrop-filter: blur(6px);
}

.docs-upload-modal {
  width: 560px;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 24px;
  border: 1px solid var(--ui-border);
  background: var(--surface);
  box-shadow: 0 28px 80px rgba(15,23,42,0.24);
}

.docs-modal-header {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 20px 22px;
  border-bottom: 1px solid var(--ui-border-soft);
  background: var(--ui-surface-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.docs-modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}

.docs-modal-icon {
  width: 44px;
  height: 44px;
  border-radius: 15px;
  border: 1px solid var(--status-processing-border);
  background: var(--accent-light);
  color: var(--btn-subtle-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.docs-modal-title {
  font-size: 16px;
  font-weight: 950;
  color: var(--text-primary);
  letter-spacing: -0.035em;
}

.docs-modal-subtitle {
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ui-text-subtle);
}

.docs-modal-close {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid var(--ui-border);
  background: var(--surface);
  color: var(--ui-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.docs-modal-body {
  padding: 22px;
}

.docs-field {
  margin-bottom: 16px;
}

.docs-label {
  display: block;
  margin-bottom: 7px;
  font-size: 12.5px;
  font-weight: 900;
  color: var(--ui-text-body);
}

.docs-required {
  color: var(--btn-danger-soft-color);
}

.docs-optional {
  margin-left: 5px;
  color: var(--ui-text-subtle);
  font-weight: 650;
}

.docs-input {
  height: 44px;
  border-radius: 14px;
  border: 1px solid var(--ui-border-strong);
  padding: 0 14px;
  font-size: 13.5px;
  font-weight: 700;
}

.docs-input-error {
  border-color: #fca5a5;
}

.docs-select {
  appearance: none;
  cursor: pointer;
  padding-right: 38px;
}

.docs-textarea {
  height: 84px;
  resize: none;
  padding-top: 12px;
  line-height: 1.55;
}

.docs-error-text {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 800;
  color: var(--btn-danger-soft-color);
}

.docs-dropzone {
  border: 2px dashed var(--ui-border-strong);
  border-radius: 18px;
  padding: 24px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--ui-surface-subtle);
}

.docs-dropzone-dragging {
  border-color: var(--btn-subtle-border);
  background: var(--accent-light);
}

.docs-dropzone-selected {
  border-color: var(--status-approved-border);
  background: var(--status-approved-bg);
}

.docs-dropzone-error {
  border-color: #fca5a5;
}

.docs-hidden-input {
  display: none;
}

.docs-selected-file {
  display: flex;
  align-items: center;
  gap: 12px;
}

.docs-selected-file-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid var(--status-approved-border);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.docs-selected-file-info {
  min-width: 0;
  flex: 1;
  text-align: left;
}

.docs-selected-file-name {
  font-size: 13px;
  font-weight: 950;
  color: #15803d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.docs-selected-file-size {
  margin-top: 3px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ui-text-muted);
}

.docs-remove-file-btn {
  height: 30px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid var(--status-rejected-border);
  background: var(--status-rejected-bg);
  color: var(--btn-danger-soft-color);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
  font-family: inherit;
}

.docs-drop-empty {
  text-align: center;
}

.docs-drop-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 10px;
  border-radius: 16px;
  background: var(--surface);
  border: 1px solid var(--ui-border);
  color: var(--ui-text-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.docs-drop-title {
  font-size: 13.5px;
  font-weight: 900;
  color: var(--ui-text-body);
}

.docs-drop-title span {
  color: var(--btn-subtle-color);
}

.docs-drop-subtitle {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ui-text-subtle);
}

.docs-modal-footer {
  position: sticky;
  bottom: 0;
  padding: 16px 22px;
  border-top: 1px solid var(--ui-border-soft);
  background: var(--ui-surface-soft);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.docs-secondary-btn,
.docs-primary-btn,
.docs-danger-btn {
  height: 42px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
}

.docs-secondary-btn {
  border: 1px solid var(--ui-border-strong);
  background: var(--surface);
  color: var(--ui-text-body);
}

.docs-primary-btn {
  border: 1px solid var(--btn-primary-border);
  background: var(--btn-primary-bg);
  color: var(--btn-primary-color);
  font-weight: 950;
  box-shadow: var(--btn-primary-shadow);
}

.docs-danger-btn {
  border: 1px solid var(--btn-danger-border);
  background: var(--btn-danger-bg);
  color: var(--btn-danger-color);
  font-weight: 950;
  box-shadow: 0 12px 24px rgba(220,38,38,0.22);
}

.docs-primary-btn:disabled,
.docs-danger-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.docs-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: var(--btn-primary-color);
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.7s linear infinite;
}

.docs-delete-modal {
  width: 420px;
  max-width: 100%;
  border-radius: 24px;
  border: 1px solid var(--ui-border);
  background: var(--surface);
  padding: 24px;
  box-shadow: 0 28px 80px rgba(15,23,42,0.24);
}

.docs-delete-header {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 16px;
}

.docs-delete-icon {
  width: 46px;
  height: 46px;
  border-radius: 16px;
  border: 1px solid var(--status-rejected-border);
  background: var(--status-rejected-bg);
  color: var(--btn-danger-soft-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.docs-delete-title {
  font-size: 17px;
  font-weight: 950;
  color: var(--text-primary);
}

.docs-delete-subtitle {
  margin-top: 3px;
  font-size: 12.5px;
  font-weight: 750;
  color: var(--ui-text-subtle);
}

.docs-delete-text {
  margin: 0 0 22px;
  font-size: 13.5px;
  font-weight: 650;
  color: var(--ui-text-body);
  line-height: 1.7;
}

.docs-delete-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

@media (max-width: 1100px) {
  .docs-toolbar {
    grid-template-columns: 1fr 200px auto;
  }

  .docs-count-pill,
  .docs-clear-filter-btn,
  .docs-upload-btn {
    min-width: max-content;
  }
}

@media (max-width: 760px) {
  .docs-page {
    padding: 12px;
  }

  .docs-toolbar {
    grid-template-columns: 1fr;
  }

  .docs-content-card {
    max-height: calc(100vh - 260px);
  }

  .docs-modal-footer,
  .docs-delete-actions {
    flex-direction: column-reverse;
  }

  .docs-secondary-btn,
  .docs-primary-btn,
  .docs-danger-btn {
    width: 100%;
  }
}
`;
