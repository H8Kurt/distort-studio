import React, { useState } from 'react';
import { UserIcon, PencilIcon, SparklesIcon, ClockIcon } from "@heroicons/react/24/solid";
import Avatar from '../components/ui/Avatar';
import ProfileEditForm from '../ProfileEditForm';
import type { User } from '../types/index.js';

interface ProfilePageProps {
  token: string | null;
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  token,
  currentUser,
  setCurrentUser
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser || !token) return;
    const res = await fetch(`http://localhost:4000/api/users/${currentUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    const updated = await res.json();
    setCurrentUser(updated);
    setIsEditingProfile(false);
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Ваш профиль</h2>

      {isEditingProfile ? (
        <ProfileEditForm
          user={currentUser}
          onSave={updateProfile}
          onCancel={() => setIsEditingProfile(false)}
        />
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-purple-400" />
              Информация о профиле
            </h3>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-primary"
            >
              <PencilIcon className="w-4 h-4" />
              Редактировать
            </button>
          </div>

          <div className="flex items-center gap-6 mb-6">
            <Avatar username={currentUser.username} size="lg" url={currentUser.avatarUrl} />
            <div>
              <h4 className="text-2xl font-bold text-white">{currentUser.username}</h4>
              <p className="text-gray-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <SparklesIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Rebel Rank</span>
              </div>
              <p className="text-3xl font-bold text-white">{currentUser.rebelRank || 1}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <ClockIcon className="w-5 h-5" />
                <span className="text-sm font-medium">В проекте</span>
              </div>
              <p className="text-lg text-white">
                {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('ru-RU') : '—'}
              </p>
            </div>
          </div>

          {currentUser.bio && (
            <div className="mt-6 pt-6 border-t border-gray-700/50">
              <h5 className="text-sm font-medium text-gray-300 mb-2">О себе</h5>
              <p className="text-gray-400">{currentUser.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
