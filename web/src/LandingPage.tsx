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
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

interface LandingPageProps {
  onLogin: (token: string) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleLogin = (token: string) => {
    onLogin(token);
  };

  return (
    <div className="min-h-screen w-full gradient-bg flex flex-col items-center overflow-x-hidden">

      {/* NAV - Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 w-full glass-strong border-b border-border-color backdrop-blur-xl">
        <div className="w-full max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300 group-hover:scale-105">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-bold text-gradient tracking-tight">
                Distort Studio
              </span>
              <p className="text-xs text-text-muted -mt-1">Платформа для творцов</p>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-text-secondary hover:text-text-primary transition-colors font-medium">
              Возможности
            </a>
            <a href="#for-whom" className="text-text-secondary hover:text-text-primary transition-colors font-medium">
              Для кого
            </a>
            <div className="h-6 w-px bg-border-color" />
            <button
              onClick={() => setShowRegister(false)}
              className="text-text-secondary hover:text-text-primary transition-colors font-medium"
            >
              Войти
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="btn btn-primary px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-violet-500/25"
            >
              Начать бесплатно
              <ArrowRightIcon className="w-5 h-5 ml-1" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
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
        <div className="fixed top-20 left-0 right-0 z-50 glass-strong border-b border-border-color md:hidden animate-fade-in">
          <div className="px-6 py-6 flex flex-col gap-4">
            <a href="#features" className="text-text-secondary hover:text-text-primary font-medium py-2">
              Возможности
            </a>
            <a href="#for-whom" className="text-text-secondary hover:text-text-primary font-medium py-2">
              Для кого
            </a>
            <div className="h-px bg-border-color my-2" />
            <button
              onClick={() => setShowRegister(false)}
              className="btn btn-secondary w-full justify-center"
            >
              Войти
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="btn btn-primary w-full justify-center"
            >
              Начать бесплатно
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="w-full max-w-[1400px] px-6 pt-32 pb-20">

        {/* HERO SECTION - Premium Design */}
        <section className="grid lg:grid-cols-2 gap-16 items-center min-h-[75vh]">

          {/* Left Column - Content */}
          <div className="space-y-8 animate-fade-in-up">
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium backdrop-blur-sm">
              <SparklesIcon className="w-4 h-4" />
              GitHub для творцов
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                Платформа для
                <br />
                <span className="text-gradient">цифрового творчества</span>
              </h1>
              <p className="text-lg text-text-secondary max-w-xl leading-relaxed">
                Управляйте проектами, коллаборациями и версиями в одном месте. 
                Профессиональные инструменты для современных создателей.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowRegister(true)}
                className="btn btn-primary px-8 py-3.5 rounded-xl font-semibold text-base shadow-xl shadow-violet-500/25 hover:shadow-violet-500/40"
              >
                Начать бесплатно
                <ArrowRightIcon className="w-5 h-5" />
              </button>

              <button className="btn btn-secondary px-8 py-3.5 rounded-xl font-semibold text-base border-border-color">
                Смотреть демо
              </button>
            </div>

            {/* Trust indicators */}
            <div className="pt-8 flex items-center gap-6 text-sm text-text-muted">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Бесплатно для старта</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Без кредитной карты</span>
              </div>
            </div>
          </div>

          {/* Right Column - Auth Form */}
          <div className="animate-scale-in">
            <div className="card p-8 bg-card/50 backdrop-blur-xl border-border-color shadow-2xl">
              {!showRegister ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Вход в аккаунт</h3>
                    <p className="text-text-secondary">Добро пожаловать обратно!</p>
                  </div>
                  <LoginForm onLogin={handleLogin} />
                  <p className="text-text-secondary mt-6 text-center">
                    Нет аккаунта?{" "}
                    <button
                      onClick={() => setShowRegister(true)}
                      className="text-accent-secondary font-semibold hover:text-accent-primary transition-colors"
                    >
                      Зарегистрироваться
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-white mb-2">Создать аккаунт</h3>
                    <p className="text-text-secondary">Присоединяйтесь к сообществу творцов</p>
                  </div>
                  <RegisterForm />
                  <p className="text-text-secondary mt-6 text-center">
                    Уже есть аккаунт?{" "}
                    <button
                      onClick={() => setShowRegister(false)}
                      className="text-accent-secondary font-semibold hover:text-accent-primary transition-colors"
                    >
                      Войти
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>

        </section>

        {/* STATS SECTION */}
        <section className="py-16 border-y border-border-color my-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <div key={i} className="group">
                <div className="text-4xl lg:text-5xl font-bold text-gradient mb-2 group-hover:scale-110 transition-transform">
                  {s.value}
                </div>
                <div className="text-text-secondary font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section id="features" className="py-20">
          <div className="text-center mb-16">
            <span className="text-accent-secondary font-semibold text-sm uppercase tracking-wider">
              Возможности
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
              Всё для вашей работы
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              Профессиональные инструменты в единой платформе
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="card group cursor-pointer hover:shadow-2xl hover:shadow-violet-500/10"
              >
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <f.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FOR WHOM SECTION */}
        <section id="for-whom" className="py-20">
          <div className="text-center mb-16">
            <span className="text-accent-secondary font-semibold text-sm uppercase tracking-wider">
              Для кого
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mt-3 mb-4">
              Создано для творцов
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {creativeFields.map((c, i) => (
              <div key={i} className="card group hover:border-accent-primary/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                  <c.icon className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="text-white font-semibold mb-1">{c.name}</h3>
                <p className="text-text-secondary text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}  