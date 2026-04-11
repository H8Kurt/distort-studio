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
  onLogin: (token: string) => void;
}

export default function LandingPage({ onLogin }: LandingPageProps) {
  const [showRegister, setShowRegister] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: FolderIcon,
      title: "Управление проектами",
      description: "Организуйте все свои творческие проекты в одном месте. Версионирование, ветвление и история изменений.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: ClockIcon,
      title: "Учёт времени",
      description: "Автоматическое отслеживание времени работы над проектами. Аналитика продуктивности.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: UserGroupIcon,
      title: "Коллаборации",
      description: "Приглашайте коллег, распределяйте роли и работайте вместе в реальном времени.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: PlayCircleIcon,
      title: "Лаунчер приложений",
      description: "Запускайте любимые творческие приложения прямо из платформы. Интеграция с вашим workflow.",
      color: "from-orange-500 to-red-500",
    },
  ];

  const creativeFields = [
    { icon: PhotoIcon, name: "Художникам", desc: "Digital art, иллюстрация, концепт" },
    { icon: MusicalNoteIcon, name: "Музыкантам", desc: "Продакшн, сведение, саунд-дизайн" },
    { icon: FilmIcon, name: "Видеографам", desc: "Монтаж, VFX, анимация" },
    { icon: CodeBracketIcon, name: "Разработчикам", desc: "Креативный код, генеративное искусство" },
  ];

  const stats = [
    { value: "10K+", label: "Творцов" },
    { value: "50K+", label: "Проектов" },
    { value: "1M+", label: "Часов работы" },
    { value: "99.9%", label: "Uptime" },
  ];

  const handleLogin = (token: string) => {
    onLogin(token);
  };

  return (
    <div className="min-h-screen gradient-bg overflow-x-hidden">
      {/* Навигация */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-gradient">Distort Studio</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors">Возможности</a>
              <a href="#for-whom" className="text-gray-300 hover:text-white transition-colors">Для кого</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors">Тарифы</a>
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

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-300"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-strong border-t border-gray-800/50 animate-fade-in">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-300 hover:text-white">Возможности</a>
              <a href="#for-whom" className="block text-gray-300 hover:text-white">Для кого</a>
              <a href="#pricing" className="block text-gray-300 hover:text-white">Тарифы</a>
              <div className="pt-3 border-t border-gray-700/50 flex flex-col gap-2">
                <button
                  onClick={() => { setShowRegister(false); setMobileMenuOpen(false); }}
                  className="btn btn-secondary w-full"
                >
                  Войти
                </button>
                <button
                  onClick={() => { setShowRegister(true); setMobileMenuOpen(false); }}
                  className="btn btn-primary w-full"
                >
                  Начать бесплатно
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-sm">
                <SparklesIcon className="w-4 h-4" />
                <span>GitHub для творческих людей</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-white">Платформа для</span>
                <br />
                <span className="text-gradient">цифровых творцов</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-lg">
                Управляйте проектами, отслеживайте время, работайте в команде и запускайте приложения — всё в одном месте.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowRegister(true)}
                  className="btn btn-primary text-lg px-8 py-4"
                >
                  Начать бесплатно
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
                <button className="btn btn-secondary text-lg px-8 py-4 group">
                  <PlayCircleIcon className="w-5 h-5 group-hover:text-purple-400 transition-colors" />
                  Смотреть демо
                </button>
              </div>

              <div className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-green-500 to-emerald-500", "from-orange-500 to-red-500"][i - 1]
                      } flex items-center justify-center text-white font-bold border-2 border-gray-900`}
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-gray-400">
                  <span className="text-white font-semibold">10,000+</span> творцов уже с нами
                </div>
              </div>
            </div>

            {/* Right: Auth Form or Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl rounded-full" />
              
              {!showRegister ? (
                <div className="relative card animate-fade-in">
                  <h3 className="text-2xl font-bold text-white mb-2">С возвращением!</h3>
                  <p className="text-gray-400 mb-6">Войдите для продолжения работы</p>
                  <LoginForm onLogin={handleLogin} />
                  <div className="mt-6 text-center">
                    <p className="text-gray-400">
                      Нет аккаунта?{" "}
                      <button
                        onClick={() => setShowRegister(true)}
                        className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/50"
                      >
                        Зарегистрироваться
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative card animate-fade-in">
                  <h3 className="text-2xl font-bold text-white mb-2">Создать аккаунт</h3>
                  <p className="text-gray-400 mb-6">Присоединяйтесь к сообществу творцов</p>
                  <RegisterForm />
                  <div className="mt-6 text-center">
                    <p className="text-gray-400">
                      Уже есть аккаунт?{" "}
                      <button
                        onClick={() => setShowRegister(false)}
                        className="text-purple-400 hover:text-purple-300 underline decoration-purple-500/50"
                      >
                        Войти
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl sm:text-5xl font-bold text-gradient mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Всё необходимое для творчества
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Мощные инструменты для управления проектами и совместной работы
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  activeFeature === index
                    ? "bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/50 shadow-lg shadow-purple-500/20"
                    : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10"
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section id="for-whom" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Создано для творцов
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Независимо от вашей специализации, у нас есть инструменты для вас
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creativeFields.map((field, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <field.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">{field.name}</h3>
                <p className="text-gray-400 text-sm">{field.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Как это работает
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Три простых шага к организованному творчеству
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Создайте проект", desc: "Импортируйте файлы или начните с нуля" },
              { step: "02", title: "Пригласите команду", desc: "Добавьте коллабораторов с нужными ролями" },
              { step: "03", title: "Творите", desc: "Работайте, отслеживайте прогресс и выпускайте релизы" },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-8xl font-bold text-gray-800/50 absolute -top-4 -left-4 select-none">
                  {item.step}
                </div>
                <div className="relative card h-full">
                  <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronDownIcon className="w-8 h-8 text-purple-500 rotate-[-90deg]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative card overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10" />
            <div className="relative text-center py-12">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Готовы начать?
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                Присоединяйтесь к тысячам творцов, которые уже используют Distort Studio для своих проектов
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => setShowRegister(true)}
                  className="btn btn-primary text-lg px-8 py-4"
                >
                  Создать бесплатный аккаунт
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
                <a
                  href="#features"
                  className="btn btn-secondary text-lg px-8 py-4"
                >
                  Узнать больше
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gradient">Distort Studio</span>
              </div>
              <p className="text-gray-400 max-w-md">
                Платформа для цифровых творцов. Управляйте проектами, collaborate с командой и запускайте приложения в одном месте.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Продукт</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Возможности</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Тарифы</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Компания</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">О нас</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Блог</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Контакты</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © 2025 Distort Studio. Все права защищены.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
