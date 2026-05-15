import React from 'react';
import { SparklesIcon, ArrowLeftOnRectangleIcon } from "@heroicons/react/24/solid";
import Avatar from '../ui/Avatar';
import ThemeSwitcher from './ThemeSwitcher';
import type { User } from '../../types';

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  logout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentUser, logout }) => {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Верхняя панель */}
      <header className="sticky top-0 z-50 glass-strong border-b border-gray-800/50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gradient">Distort Studio</h1>
                  <p className="text-xs text-gray-400">Добро пожаловать, {currentUser?.username}</p>
                </div>
              </div>

              {/* Навигация в навбаре */}
              <nav className="hidden md:flex items-center gap-2 ml-8">
                <a href="/" className="btn btn-sm btn-secondary">Проекты</a>
                <a href="/sessions" className="btn btn-sm btn-secondary">Сессии</a>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              <a href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Avatar username={currentUser?.username || ""} url={currentUser?.avatarUrl} />
                <span className="text-sm text-gray-300 hidden lg:inline">{currentUser?.username}</span>
              </a>
              <button
                onClick={logout}
                className="btn btn-danger"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
