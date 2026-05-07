
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { VideoTabIcon, CameraIcon, MusicIcon, TextIcon } from './icons';
import { GenerationTask, RoutingMode } from '../types';
import { routing } from '../services/hubClient';

interface NavigationProps {
  activeTask: GenerationTask;
  onTaskChange: (task: GenerationTask) => void;
}

const ROUTING_OPTS: { id: RoutingMode; label: string; dot: string; hint: string }[] = [
  { id: 'auto',          label: 'AUTO',          dot: 'bg-violet-400',  hint: 'Vertex → KIE fallback' },
  { id: 'force_vertex',  label: 'FORCE VERTEX',  dot: 'bg-emerald-400', hint: 'Только Google Vertex' },
  { id: 'force_kie',     label: 'FORCE KIE',     dot: 'bg-amber-400',   hint: 'Только KIE' },
];

const RoutingSwitch: React.FC = () => {
  const [mode, setMode] = useState<RoutingMode>(routing.get());
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const select = (m: RoutingMode) => { routing.set(m); setMode(m); setOpen(false); };
  const cur = ROUTING_OPTS.find(o => o.id === mode)!;
  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Маршрутизация провайдера"
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
      >
        <span className={`w-2 h-2 rounded-full ${cur.dot}`}></span>
        <span className="tabular-nums">{cur.label}</span>
        <span className="text-gray-500">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-zinc-900 border border-white/10 shadow-xl z-50 overflow-hidden">
          {ROUTING_OPTS.map(o => (
            <button
              key={o.id}
              onClick={() => select(o.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-all
                ${mode === o.id ? 'bg-violet-500/10 text-white' : 'text-gray-300 hover:bg-white/5'}`}
            >
              <span className={`w-2 h-2 rounded-full ${o.dot} flex-shrink-0`}></span>
              <span className="flex-1">
                <span className="block font-medium">{o.label}</span>
                <span className="block text-[11px] text-gray-500">{o.hint}</span>
              </span>
              {mode === o.id && <span className="text-violet-400 text-xs">●</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Navigation: React.FC<NavigationProps> = ({ activeTask, onTaskChange }) => {
  const tabs = [
    { id: GenerationTask.VIDEO, label: 'Видео', icon: <VideoTabIcon className="w-4 h-4" /> },
    { id: GenerationTask.PHOTO, label: 'Фото', icon: <CameraIcon className="w-4 h-4" /> },
    { id: GenerationTask.MUSIC, label: 'Музыка', icon: <MusicIcon className="w-4 h-4" /> },
    { id: GenerationTask.TEXT, label: 'Текст', icon: <TextIcon className="w-4 h-4" /> },
    { id: GenerationTask.CONNECTIONS, label: 'Connections', icon: <span className="w-4 h-4 inline-block leading-none">⚡</span> },
  ];

  return (
    <nav className="relative flex justify-center items-center py-4 bg-black border-b border-white/5">
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
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <RoutingSwitch />
      </div>
    </nav>
  );
};

export default Navigation;
