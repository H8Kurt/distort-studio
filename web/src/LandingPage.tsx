import { useState } from "react";
import {
  SparklesIcon,
  FolderIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowRightIcon,
  PlayCircleIcon,
  CodeBracketIcon,
  PhotoIcon,
  MusicalNoteIcon,
  FilmIcon,
} from "@heroicons/react/24/solid";
import {
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface LandingPageProps {
  onLogin: (token: string, refreshToken?: string) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: FolderIcon,
      title: "Управление проектами",
      description:
        "Организуйте все свои творческие проекты в одном месте. Версионирование, история изменений.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: ClockIcon,
      title: "Учёт времени",
      description:
        "Автоматическое отслеживание времени работы над проектами.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: UserGroupIcon,
      title: "Коллаборации",
      description:
        "Работайте в команде и приглашайте участников.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: PlayCircleIcon,
      title: "Лаунчер приложений",
      description:
        "Запускайте инструменты прямо из платформы.",
      color: "from-orange-500 to-red-500",
    },
  ];

  const creativeFields = [
    { icon: PhotoIcon, name: "Художникам", desc: "Digital art, иллюстрация" },
    { icon: MusicalNoteIcon, name: "Музыкантам", desc: "Продакшн, звук" },
    { icon: FilmIcon, name: "Видеографам", desc: "Монтаж, VFX" },
    { icon: CodeBracketIcon, name: "Разработчикам", desc: "Creative coding" },
  ];

  const stats = [
    { value: "10K+", label: "Творцов" },
    { value: "50K+", label: "Проектов" },
    { value: "1M+", label: "Часов" },
    { value: "99.9%", label: "Uptime" },
  ];

  const handleLogin = (token: string, rt?: string) => {
    onLogin(token, rt);
  };

  return (
    <div className="min-h-screen w-full gradient-bg flex flex-col items-center overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full flex justify-center glass-strong border-b border-gray-800/50">
        <div className="w-full max-w-[1800px] px-6 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">
              Distort Studio
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-300 hover:text-white">
              Возможности
            </a>
            <a href="#for-whom" className="text-gray-300 hover:text-white">
              Для кого
            </a>

            <button
              onClick={() => setShowRegister(false)}
              className="btn btn-secondary"
            >
              Войти
            </button>

            <button
              onClick={() => setShowRegister(true)}
              className="btn btn-primary"
            >
              Начать бесплатно
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed top-16 left-0 right-0 z-50 glass-strong border-b border-gray-800/50 md:hidden">
          <div className="px-6 py-4 flex flex-col gap-3">
            <a href="#features">Возможности</a>
            <a href="#for-whom">Для кого</a>

            <button
              onClick={() => setShowRegister(false)}
              className="btn btn-secondary"
            >
              Войти
            </button>

            <button
              onClick={() => setShowRegister(true)}
              className="btn btn-primary"
            >
              Начать
            </button>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="w-full max-w-[1800px] px-6 pt-24">

        {/* HERO */}
        <section className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
              <SparklesIcon className="w-4 h-4" />
              GitHub для творцов
            </div>

            <h1 className="text-5xl font-bold text-white leading-tight">
              Платформа для
              <br />
              <span className="text-gradient">цифрового творчества</span>
            </h1>

            <p className="text-gray-400 text-lg max-w-lg">
              Управляйте проектами, коллаборациями и версиями в одном месте.
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowRegister(true)}
                className="btn btn-primary"
              >
                Начать
                <ArrowRightIcon className="w-5 h-5" />
              </button>

              <button className="btn btn-secondary">
                Демо
              </button>
            </div>
          </div>

          {/* FORM */}
          <div className="card">
            {!showRegister ? (
              <>
                <h3 className="text-xl text-white mb-4">Вход</h3>
                <LoginForm onLogin={handleLogin} />
                <p className="text-gray-400 mt-4 text-sm">
                  Нет аккаунта?{" "}
                  <button
                    onClick={() => setShowRegister(true)}
                    className="text-purple-400"
                  >
                    регистрация
                  </button>
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl text-white mb-4">Регистрация</h3>
                <RegisterForm />
                <p className="text-gray-400 mt-4 text-sm">
                  Уже есть аккаунт?{" "}
                  <button
                    onClick={() => setShowRegister(false)}
                    className="text-purple-400"
                  >
                    вход
                  </button>
                </p>
              </>
            )}
          </div>

        </section>

        {/* STATS */}
        <section className="py-16 border-y border-gray-800/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-4xl font-bold text-gradient">
                  {s.value}
                </div>
                <div className="text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white">
              Возможности
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                onMouseEnter={() => setActiveFeature(i)}
                className="card cursor-pointer"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}
                >
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOR WHOM */}
        <section id="for-whom" className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white">
              Для кого
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {creativeFields.map((c, i) => (
              <div key={i} className="card">
                <c.icon className="w-6 h-6 text-purple-400 mb-2" />
                <h3 className="text-white">{c.name}</h3>
                <p className="text-gray-400 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}  