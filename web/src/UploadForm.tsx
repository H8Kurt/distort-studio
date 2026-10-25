import { useRef, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import { api } from "./lib/api";
import type { MediaFile } from "./types";

interface UploadFormProps {
  projectId: number;
  onUploaded?: (media: MediaFile) => void;
}

export default function UploadForm({ projectId, onUploaded }: UploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    setProgress(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const media = await api.postForm<MediaFile>(`/api/projects/${projectId}/media`, form);
      onUploaded?.(media);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setProgress(false);
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        className="btn btn-secondary"
        onClick={() => inputRef.current?.click()}
        disabled={progress}
      >
        <ArrowUpTrayIcon style={{ width: 16, height: 16 }} />
        {progress ? "Загрузка…" : "Загрузить файл"}
      </button>
      {error && (
        <div className="badge badge-warning" style={{ marginTop: 8 }}>
          {error}
        </div>
      )}
    </div>
  );
}
