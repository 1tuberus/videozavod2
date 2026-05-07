
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { VideoTabIcon, CameraIcon, MusicIcon, TextIcon } from './icons';
import { GenerationTask } from '../types';

interface NavigationProps {
  activeTask: GenerationTask;
  onTaskChange: (task: GenerationTask) => void;
}

const Navigation: React.FC<NavigationProps> = ({ activeTask, onTaskChange }) => {
  const tabs = [
    { id: GenerationTask.VIDEO, label: 'Видео', icon: <VideoTabIcon className="w-4 h-4" /> },
    { id: GenerationTask.PHOTO, label: 'Фото', icon: <CameraIcon className="w-4 h-4" /> },
    { id: GenerationTask.MUSIC, label: 'Музыка', icon: <MusicIcon className="w-4 h-4" /> },
    { id: GenerationTask.TEXT, label: 'Текст', icon: <TextIcon className="w-4 h-4" /> },
  ];

  return (
    <nav className="flex justify-center items-center py-4 bg-black border-b border-white/5">
      <div className="flex gap-8">
        {tabs.map((tab) => {
          const isActive = activeTask === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTaskChange(tab.id)}
              className={`flex items-center gap-2 px-1 py-2 text-sm font-medium transition-all relative
                ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
              `}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <div className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-indigo-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
