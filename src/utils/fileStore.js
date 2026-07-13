// ── In-memory file store ────────────────────────────────────────────────────
// Redux holds only a file's metadata (name, size, key) — never the bytes. The
// real File object lives here, keyed by the same `fileKey` the metadata carries.
//
// This is deliberately session-scoped: File objects aren't serialisable and a
// few PDFs would blow past the localStorage quota the store persists into. So
// after a page reload the metadata survives and the preview does not — which is
// exactly how it will behave against a real backend anyway, where "view" is a
// download call rather than a blob we happen to be holding.

const files = new Map();
const urls = new Map();

let seq = 0;
export const newFileKey = () => `f-${Date.now().toString(36)}-${(seq += 1)}`;

// Stash a File / Blob and return the key to persist alongside its metadata.
export const putFile = (file) => {
    const key = newFileKey();
    files.set(key, file);
    return key;
};

export const hasFile = (key) => Boolean(key) && files.has(key);

// Object URLs are cached per key so repeated previews don't leak a new blob URL
// on every click.
export const fileUrl = (key) => {
    if (!hasFile(key)) return null;
    if (!urls.has(key)) urls.set(key, URL.createObjectURL(files.get(key)));
    return urls.get(key);
};

// Open in a new tab. Returns false when the blob is gone (e.g. after a reload)
// so the caller can show an honest message instead of a broken tab.
export const openFile = (key) => {
    const url = fileUrl(key);
    if (!url) return false;
    window.open(url, '_blank', 'noopener');
    return true;
};

export const downloadFile = (key, fileName) => {
    const url = fileUrl(key);
    if (!url) return false;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    a.click();
    return true;
};

export const dropFile = (key) => {
    const url = urls.get(key);
    if (url) URL.revokeObjectURL(url);
    urls.delete(key);
    files.delete(key);
};

// "1.2 MB" / "418 KB" — used everywhere a file row is rendered.
export const fmtSize = (bytes) => {
    const b = Number(bytes) || 0;
    if (b <= 0) return '—';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

// Coarse file-kind for the little coloured file badge.
export const fileKind = (name = '') => {
    const ext = String(name).split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return { label: 'PDF', color: '#DC2626', bg: '#FEF2F2' };
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return { label: 'IMG', color: '#0EA5E9', bg: '#E0F2FE' };
    if (['doc', 'docx'].includes(ext)) return { label: 'DOC', color: '#2563EB', bg: '#EFF6FF' };
    if (['xls', 'xlsx', 'csv'].includes(ext)) return { label: 'XLS', color: '#16A34A', bg: '#DCFCE7' };
    return { label: (ext || 'FILE').slice(0, 4).toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
};
