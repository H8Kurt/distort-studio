import { useState } from "react";

export default function UploadForm({ onUploaded }: { onUploaded?: (media:any)=>void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const token = localStorage.getItem('token');

  const onSelect = (f: File | null) => {
    setFile(f);
    if (!f) { setPreview(null); return; }
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Выберите файл');
    const fd = new FormData();
    fd.append('file', file);
    // если привязываешь к проекту: fd.append('projectId', '1');

    // XMLHttpRequest чтобы получить прогресс
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'http://localhost:4000/api/upload/file', true);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded/ev.total)*100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const res = JSON.parse(xhr.responseText);
        setProgress(0);
        setFile(null);
        setPreview(null);
        onUploaded && onUploaded(res.media);
      } else {
        alert('Upload failed: ' + xhr.responseText);
      }
    };

    xhr.onerror = () => alert('Network error');
    xhr.send(fd);
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <input type="file" accept="image/*,audio/*" onChange={(e)=>onSelect(e.target.files?.[0]||null)} />
      {preview && <img src={preview} style={{maxWidth:200}} alt="preview" />}
      {progress>0 && <div className="w-full bg-gray-700 h-2 rounded"><div style={{width:`${progress}%`}} className="bg-green-500 h-2 rounded"></div></div>}
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Загрузить</button>
    </form>
  );
}
