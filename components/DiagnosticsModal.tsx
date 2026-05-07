
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ActivityIcon, ArrowPathIcon } from './icons';
import { testVertexConnection } from '../services/geminiService';
import { VertexConnectionConfig } from '../types';

interface LogEntry {
  id: number;
  message: string;
  type: 'info' | 'error' | 'success';
  timestamp: string;
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: VertexConnectionConfig;
  externalLogs?: LogEntry[]; // Logs passed from the main app execution
}

const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose, config, externalLogs }) => {
  const [internalLogs, setInternalLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoRunRef = useRef(false);

  // Toggle between viewing the "Test Connection" logs and "Actual Generation" logs
  const [viewMode, setViewMode] = useState<'connection' | 'generation'>('generation');

  useEffect(() => {
    // If we receive external logs (e.g. from a failed generation), default to showing them
    if (externalLogs && externalLogs.length > 0) {
        setViewMode('generation');
    } else {
        setViewMode('connection');
    }
  }, [externalLogs, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [internalLogs, viewMode]);

  // Auto-run tests ONLY if we are in connection mode and it's the first open
  useEffect(() => {
    if (isOpen && !hasAutoRunRef.current && (!externalLogs || externalLogs.length === 0)) {
        hasAutoRunRef.current = true;
        handleRunTest();
    }
  }, [isOpen]);

  const addInternalLog = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setInternalLogs(prev => [...prev, { id: Date.now(), message, type, timestamp }]);
  };

  const handleRunTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setViewMode('connection');
    setInternalLogs([]); // Clear previous logs
    addInternalLog(`Starting Diagnostics for ${config.project} (${config.location})...`, 'info');
    
    try {
        await testVertexConnection(config, (msg, type) => addInternalLog(msg, type));
    } catch (e) {
        addInternalLog('Unexpected test harness error.', 'error');
        console.error(e);
    } finally {
        setIsRunning(false);
    }
  };

  if (!isOpen) return null;

  const logsToDisplay = viewMode === 'generation' ? (externalLogs || []) : internalLogs;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[120] backdrop-blur-sm p-4">
      <div className="bg-[#0f0f13] border border-gray-700 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#16161e]">
          <div className="flex items-center gap-2 text-white font-mono">
            <ActivityIcon className="w-5 h-5 text-green-400" />
            <span className="font-bold">System Diagnostics</span>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800 bg-[#121216]">
            <button
                onClick={() => setViewMode('generation')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'generation' ? 'bg-[#1a1a24] text-white border-b-2 border-indigo-500' : 'text-gray-500 hover:bg-[#1a1a24]/50'}`}
            >
                Latest Generation Logs
            </button>
            <button
                onClick={() => setViewMode('connection')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${viewMode === 'connection' ? 'bg-[#1a1a24] text-white border-b-2 border-green-500' : 'text-gray-500 hover:bg-[#1a1a24]/50'}`}
            >
                Connection Test
            </button>
        </div>

        {/* Console Output */}
        <div 
          ref={scrollRef}
          className="flex-grow p-4 overflow-y-auto font-mono text-xs space-y-2 bg-black/50"
        >
          {logsToDisplay.length === 0 && (
             <div className="text-gray-500 italic text-center mt-10">
                {viewMode === 'generation' ? 'No logs captured from recent generation.' : 'Ready to run connection test.'}
             </div>
          )}
          
          {logsToDisplay.map((log) => (
            <div key={log.id} className="flex gap-3 animate-fade-in break-all">
              <span className="text-gray-600 select-none whitespace-nowrap">[{log.timestamp}]</span>
              <span className={`
                ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                ${log.type === 'success' ? 'text-green-400 font-bold' : ''}
                ${log.type === 'info' ? 'text-gray-300' : ''}
              `}>
                {log.message}
              </span>
            </div>
          ))}
          
          {isRunning && viewMode === 'connection' && (
            <div className="flex gap-2 items-center text-gray-500 animate-pulse">
               <span className="w-2 h-4 bg-gray-500 inline-block"></span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-[#16161e] flex justify-between items-center">
            <div className="text-xs text-gray-500">
                {logsToDisplay.length} log entries found.
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                >
                    Close
                </button>
                {viewMode === 'connection' && (
                    <button
                        onClick={handleRunTest}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-green-900/20"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                        {isRunning ? 'Testing...' : 'Run Connection Test'}
                    </button>
                )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default DiagnosticsModal;
