import { useRef, useState } from 'react';
import { FileUp, Image as ImageIcon, Video } from 'lucide-react';
import API from '../../services/api';

const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];

export default function MediaUploader({
  ownerType,
  ownerId,
  kind = 'photo',
  onUpload,
  onError,
  label,
  compact = false,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = (nextFile) => {
    if (!nextFile) return;
    const isImage = imageTypes.includes(nextFile.type);
    const isVideo = videoTypes.includes(nextFile.type);
    if (kind === 'photo' && !isImage) {
      setError('Choose a PNG, JPG, or WebP image.');
      setFile(null);
      setPreview('');
      return;
    }
    if (kind === 'video' && !isVideo) {
      setError('Choose an MP4, MOV, or WebM video.');
      setFile(null);
      setPreview('');
      return;
    }
    if (nextFile.size > 25 * 1024 * 1024) {
      setError('Media must be smaller than 25 MB.');
      setFile(null);
      setPreview('');
      return;
    }
    setError('');
    setFile(nextFile);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(nextFile));
  };

  const upload = async () => {
    if (!file) {
      setError('Choose a file before uploading.');
      return;
    }
    setUploading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('owner_type', ownerType);
    formData.append('owner_id', String(ownerId));
    formData.append('kind', kind);
    try {
      const response = await API.post('/trust/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onUpload?.(response.data);
      setFile(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Media upload failed.';
      setError(message);
      onError?.(requestError);
    } finally {
      setUploading(false);
    }
  };

  const isVideo = kind === 'video';
  const accept = isVideo ? 'video/mp4,video/quicktime,video/webm' : 'image/png,image/jpeg,image/webp';

  return (
    <div className={compact ? 'space-y-2' : 'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-3'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label || (isVideo ? 'Upload video' : 'Upload photo')}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400 dark:text-slate-500">{isVideo ? 'MP4, MOV, WebM' : 'PNG, JPG, WebP'} · max 25 MB</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          aria-label={label || (isVideo ? 'Choose video file' : 'Choose photo file')}
        >
          <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
          Choose
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => chooseFile(event.target.files?.[0] || null)}
        className="sr-only"
        aria-label={label || (isVideo ? 'Video file' : 'Photo file')}
      />
      {preview && (
        <div className="overflow-hidden rounded-lg bg-slate-950">
          {isVideo ? (
            <video src={preview} controls className="max-h-48 w-full object-contain" aria-label="Selected video preview" />
          ) : (
            <img src={preview} alt="Selected photo preview" className="max-h-48 w-full object-cover" />
          )}
        </div>
      )}
      {!preview && (
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 dark:text-slate-500">
          {isVideo ? <Video className="h-4 w-4" aria-hidden="true" /> : <ImageIcon className="h-4 w-4" aria-hidden="true" />}
          <span>No file selected</span>
        </div>
      )}
      {error && <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400" role="alert">{error}</p>}
      <button
        type="button"
        onClick={upload}
        disabled={!file || uploading}
        className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-3 py-2 text-[11px] font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {uploading ? 'Uploading...' : 'Upload evidence'}
      </button>
    </div>
  );
}
