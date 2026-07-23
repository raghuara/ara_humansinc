import http from '../Api/http';

// ── API file downloads ────────────────────────────────────────────────────────
// These endpoints stream a raw file, not JSON, so the request must ask axios for
// a Blob. The shared apiErrorMessage helper can't read a Blob body, so when one
// of these fails the error itself arrives as a Blob — `blobErrorMessage` reads
// the JSON out of it so the caller can still show a real message.

const filenameFromDisposition = (cd) => {
    if (!cd) return '';
    // RFC 5987 `filename*=UTF-8''name` first, then a plain `filename="name"`.
    const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(cd);
    if (star) return decodeURIComponent(star[1].replace(/["']/g, '').trim());
    const plain = /filename="?([^";]+)"?/i.exec(cd);
    return plain ? plain[1].trim() : '';
};

// Fetch a file as a Blob, along with the server-suggested filename (if any).
export const fetchFileBlob = async (url, params) => {
    const res = await http.get(url, { params, responseType: 'blob' });
    return { blob: res.data, name: filenameFromDisposition(res.headers?.['content-disposition']) };
};

// Turn a failed blob request's error into a readable message. On error the
// response body is a Blob (usually JSON), so it's read as text and parsed.
export const blobErrorMessage = async (err, fallback = 'Could not download the file.') => {
    const data = err?.response?.data;
    if (data instanceof Blob) {
        try {
            const text = await data.text();
            const json = JSON.parse(text);
            return json?.message || json?.error?.message || fallback;
        } catch { /* not JSON — fall through */ }
    }
    if (err?.response?.status === 404) return 'That file is no longer available.';
    if (err?.request && !err?.response) return 'Cannot reach the server. Check your connection and try again.';
    return fallback;
};

// Save a Blob to disk via a synthetic <a download>. Downloads don't need popup
// permission, so this works reliably after an await.
export const saveBlob = (blob, filename) => {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

// Point an already-open tab at a Blob. The caller must open the tab
// synchronously inside the click handler (before any await) so the popup
// blocker allows it; this only sets its location once the file has loaded.
export const showBlobInWindow = (win, blob) => {
    if (!win) return false;
    const objectUrl = URL.createObjectURL(blob);
    win.location.href = objectUrl;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return true;
};
