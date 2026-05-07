
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { XMarkIcon, ServerIcon, CheckCircleIcon, ActivityIcon, SlidersHorizontalIcon, SparklesIcon, KeyIcon } from './icons';
import { VertexConnectionConfig } from '../types';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VertexConnectionConfig;
  onConfigChange: (newConfig: VertexConnectionConfig) => void;
  onRunDiagnostics: () => void;
}

const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({ 
  isOpen, 
  onClose,
  config,
  onConfigChange,
  onRunDiagnostics
}) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [hasChanged, setHasChanged] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleChange = (field: keyof VertexConnectionConfig, value: string) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    setHasChanged(true);
  };

  const setRecommended = () => {
      const recommended = {
          ...localConfig,
          project: localConfig.project || 'vertex-ai-runner-485313',
          location: 'us-central1'
      };
      setLocalConfig(recommended);
      setHasChanged(true);
      // Automatically save/notify parent if clicking recommended
      onConfigChange(recommended);
  };

  const handleSaveAndClose = () => {
    if (hasChanged) {
        onConfigChange(localConfig);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[110] backdrop-blur-xl p-4">
      <div className="bg-[#121218] border border-indigo-500/30 rounded-2xl w-full max-w-xl shadow-[0_0_80px_rgba(79,70,229,0.3)] flex flex-col overflow-hidden animate-fade-in-up">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-[#1a1a24] to-[#121218]">
          <div className="flex items-center gap-4 text-white">
            <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/20">
                <ServerIcon className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
                <h2 className="text-xl font-bold tracking-tight">Настройка Подключения</h2>
                <p className="text-xs text-indigo-300 font-medium mt-0.5">Vertex AI & Credential Configuration</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
            
            {/* Main Form */}
            <div className="space-y-5">
                 <div className="space-y-2">
                     <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Google Cloud Project ID</label>
                     <input 
                       type="text" 
                       value={localConfig.project}
                       onChange={(e) => handleChange('project', e.target.value)}
                       className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm transition-all"
                       placeholder="e.g. vertex-ai-runner-123"
                     />
                 </div>

                 <div className="space-y-2">
                     <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Vertex AI API Key</label>
                     <div className="relative">
                       <input 
                         type={showApiKey ? "text" : "password"}
                         value={localConfig.apiKey || ''}
                         onChange={(e) => handleChange('apiKey', e.target.value)}
                         className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl p-4 pr-12 text-white placeholder-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm transition-all"
                         placeholder="AQ.Ab8..."
                       />
                       <button
                         type="button"
                         onClick={() => setShowApiKey(!showApiKey)}
                         className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                       >
                         {showApiKey ? (
                           <ActivityIcon className="w-4 h-4" /> // Using Activity as placeholder for Hide/Show eye if missing
                         ) : (
                           <KeyIcon className="w-4 h-4" />
                         )}
                       </button>
                     </div>
                     <p className="text-[10px] text-gray-500 px-1">
                        Use the API key from your Google Cloud Console Credentials.
                     </p>
                 </div>

                 <div className="space-y-2">
                     <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Location (Model Region)</label>
                        {localConfig.location !== 'us-central1' && (
                             <span className="text-[10px] text-amber-400 font-medium bg-amber-400/10 px-2 py-0.5 rounded animate-pulse">
                                Warning: Veo requires us-central1
                             </span>
                        )}
                     </div>
                     <select 
                       value={localConfig.location}
                       onChange={(e) => handleChange('location', e.target.value)}
                       className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-sm appearance-none transition-all"
                     >
                        <option value="us-central1">us-central1 (Iowa) — REQUIRED FOR VEO</option>
                        <option value="us-west1">us-west1 (Oregon)</option>
                        <option value="europe-west4">europe-west4 (Netherlands)</option>
                        <option value="asia-southeast1">asia-southeast1 (Singapore)</option>
                     </select>
                 </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3 pt-2">
                <button 
                    onClick={setRecommended}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/20 transition-all hover:scale-[1.02]"
                >
                    <SparklesIcon className="w-3.5 h-3.5" />
                    Set Recommended (us-central1)
                </button>
                <button 
                    onClick={() => {
                        onConfigChange(localConfig);
                        onRunDiagnostics();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold border border-gray-600 transition-all hover:scale-[1.02]"
                >
                    <ActivityIcon className="w-3.5 h-3.5" />
                    Run Diagnostics Test
                </button>
            </div>

            {/* Status Info */}
            <div className="bg-[#16161e] rounded-xl p-4 border border-white/5">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-gray-300 font-medium leading-relaxed">
                            <span className="text-white font-bold">Credential Check:</span>
                        </p>
                        <p className="text-xs text-gray-500">
                             Ensure your API Key has <span className="text-indigo-300">Vertex AI User</span> role permissions.
                        </p>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#16161e] flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-6 py-3 text-gray-400 hover:text-white text-sm font-medium transition-colors"
           >
             Cancel
           </button>
           <button 
             onClick={handleSaveAndClose}
             className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transform active:scale-95"
           >
             Save Connection
           </button>
        </div>

      </div>
    </div>
  );
};

export default DeploymentGuideModal;
