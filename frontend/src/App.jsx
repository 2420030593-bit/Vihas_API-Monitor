import React, { useState } from 'react';
import ApiTester from './components/ApiTester';
import History from './components/History';
import Performance from './components/Performance';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('tester');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTestComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const navItems = [
    { id: 'tester', label: 'API Tester', icon: 'api' },
    { id: 'history', label: 'Test History', icon: 'history' },
    { id: 'performance', label: 'Performance', icon: 'insights' },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface dark">
      {/* Sidebar Navigation */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-black shadow-[4px_0_24px_rgba(0,0,0,0.5)] flex flex-col py-6 z-50">
        <div className="px-6 mb-10">
          <h1 className="text-2xl font-black text-sky-400 tracking-tighter font-headline">Kinetic</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium mt-1">API Monitor v1.0</p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? 'text-sky-400 font-bold bg-sky-400/5 scale-95'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span className="font-headline tracking-tight">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-6 mt-auto pt-6 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-lg">⚡</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold">API Monitor</p>
              <p className="text-[10px] text-on-surface-variant">Active</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Top App Bar */}
      <header className="fixed top-0 right-0 left-64 h-16 z-40 bg-[#060e20]/80 backdrop-blur-xl flex items-center justify-between px-8 border-b border-outline-variant/10">
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-16 min-h-screen bg-surface">
        {activeTab === 'tester' && <ApiTester onTestComplete={handleTestComplete} />}
        {activeTab === 'history' && <History key={refreshTrigger} />}
        {activeTab === 'performance' && <Performance key={refreshTrigger} />}
      </main>
    </div>
  );
}

export default App;
