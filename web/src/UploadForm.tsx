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

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const media = JSON.parse(xhr.responseText); // ✅ получаем объект с сервера
        setFile(null);
        setPreview(null);
        setProgress(0);
        onUploaded(media); // ✅ передаём объект, а не File
      } else {
        alert("Ошибка загрузки");
      }
    };

    xhr.onerror = () => alert("Ошибка сети");

    xhr.send(fd);
  };

  return (
    <form onSubmit={submit} className="space-y-2">
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
      />

      {preview && (
        <img src={preview} className="max-w-[200px] rounded" alt="preview" />
      )}

      {progress > 0 && (
        <div className="w-full bg-gray-700 h-2 rounded">
          <div
            className="bg-green-500 h-2 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <button className="bg-blue-600 px-4 py-2 rounded">Загрузить</button>
    </form>
  );
}
