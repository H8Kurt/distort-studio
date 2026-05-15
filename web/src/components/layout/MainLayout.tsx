import React from 'react';
import { SparklesIcon, ArrowLeftOnRectangleIcon, ShoppingCartIcon, PhotoIcon } from "@heroicons/react/24/solid";
import Avatar from '../ui/Avatar';
import ThemeSwitcher from './ThemeSwitcher';
import type { User } from '../../types/index.js';

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser: User | null;
  logout: () => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentUser, logout }) => {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Premium Header */}
      <header className="sticky top-0 z-50 glass-strong border-b border-border-color backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            
            {/* Logo Section */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition-all duration-300">
                  <SparklesIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gradient tracking-tight">Distort Studio</h1>
                  <p className="text-xs text-text-muted -mt-0.5">{currentUser?.username}</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="hidden lg:flex items-center gap-2 ml-8">
                <a href="/" className="btn btn-sm btn-secondary rounded-lg">Проекты</a>
                <a href="/sessions" className="btn btn-sm btn-secondary rounded-lg">Сессии</a>
                <a href="/marketplace" className="btn btn-sm btn-secondary rounded-lg flex items-center gap-2">
                  <ShoppingCartIcon className="w-4 h-4" />
                  Магазин
                </a>
                <a href="/gallery" className="btn btn-sm btn-secondary rounded-lg flex items-center gap-2">
                  <PhotoIcon className="w-4 h-4" />
                  Галерея
                </a>
              </nav>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <ThemeSwitcher />
              
              <a href="/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity px-3 py-2 rounded-xl hover:bg-bg-hover">
                <Avatar username={currentUser?.username || ""} url={currentUser?.avatarUrl} />
                <span className="text-sm text-text-secondary font-medium hidden lg:inline">{currentUser?.username}</span>
              </a>
              
              <button
                onClick={logout}
                className="btn btn-danger btn-sm rounded-lg"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
