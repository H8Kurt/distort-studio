import { useState } from "react";

const AVATARS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Zack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Kitty",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Coco",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Rocky",
];

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    
    try {
      const res = await fetch("http://localhost:4000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, avatarUrl: selectedAvatar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка регистрации");
      setMessage("Регистрация успешна! Теперь войдите.");
      setUsername("");
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 glass rounded-2xl border border-gray-800/50 shadow-2xl">
      <div className="text-center mb-8">
        <h3 className="text-3xl font-bold text-white mb-2">Создать аккаунт</h3>
        <p className="text-sm text-gray-400">Присоединяйтесь к сообществу творцов</p>
      </div>
      
      {/* Выбор аватара */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3 text-center">Выберите аватар</label>
        <div className="grid grid-cols-6 gap-2 mb-4">
          {AVATARS.map((avatar, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedAvatar(avatar)}
              className={`relative w-full aspect-square rounded-xl overflow-hidden transition-all duration-200 ${
                selectedAvatar === avatar
                  ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900 scale-105"
                  : "hover:scale-105 opacity-70 hover:opacity-100"
              }`}
            >
              <img src={avatar} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover bg-gray-800" />
            </button>
          ))}
        </div>
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-purple-500/50">
            <img src={selectedAvatar} alt="Selected avatar" className="w-full h-full object-cover bg-gray-800" />
          </div>
        </div>
      </div>
      
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Имя пользователя</label>
          <input
            className="input"
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
          <input
            className="input"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Пароль</label>
          <input
            className="input"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
            {error}
          </div>
        )}
        
        {message && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
            {message}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full py-4 text-lg font-semibold"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Создание аккаунта...
            </>
          ) : (
            "Зарегистрироваться"
          )}
        </button>
      </form>
    </div>
  );
}
