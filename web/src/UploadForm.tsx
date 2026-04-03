import { useState } from "react";

interface UploadFormProps {
  projectId: number;
  onUploaded: (media: {
    filename: string;
    originalName: string;
    url: string;
    thumbUrl?: string;
    type: string;
  }) => void;
}

export default function UploadForm({ projectId, onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const token = localStorage.getItem("token");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert("Выберите файл");

    const fd = new FormData();
    fd.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `http://localhost:4000/api/projects/${projectId}/media`,
      true
    );

    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }

    setUploading(true);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const media = JSON.parse(xhr.responseText);
        setFile(null);
        setPreview(null);
        setProgress(0);
        onUploaded(media);
      } else {
        alert("Ошибка загрузки");
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      alert("Ошибка сети");
    };

    xhr.send(fd);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="flex-1 relative">
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFile(f || null);
              if (f?.type.startsWith("image/")) {
                setPreview(URL.createObjectURL(f));
              } else {
                setPreview(null);
              }
            }}
            className="hidden"
            accept="image/*,audio/*,video/*,.psd,.ai,.fig"
          />
          <div className="btn btn-secondary w-full cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {file ? file.name : "Выбрать файл"}
          </div>
        </label>
        
        <button 
          type="submit" 
          disabled={!file || uploading}
          className="btn btn-primary min-w-[140px]"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Загрузка...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Загрузить
            </>
          )}
        </button>
      </div>

      {preview && (
        <div className="relative rounded-xl overflow-hidden border border-gray-700/50 max-w-xs">
          <img src={preview} className="w-full h-auto" alt="preview" />
        </div>
      )}

      {progress > 0 && (
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      )}
    </form>
  );
}
