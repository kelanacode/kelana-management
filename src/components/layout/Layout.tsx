import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAppStore } from '../../stores/appStore';
import { ReminderPopupAlert } from '../reminders/ReminderPopupAlert';
import { TeamChatPopup } from '../chat/TeamChatPopup';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { settings, isMobileSidebarOpen, setMobileSidebarOpen } = useAppStore();

  // Apply dark mode class to root <html> and <body>
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <div className={`min-h-screen ${settings.theme === 'dark' ? 'dark bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex h-[100dvh] overflow-hidden">
        {/* Latar gelap saat menu dibuka di ponsel */}
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileSidebarOpen(false)} aria-hidden="true" />
        )}
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
      {/* Global Event Reminder Pop-up */}
      <ReminderPopupAlert />
      {/* Floating Team Chat Pop-up (Kanan Bawah) */}
      <TeamChatPopup />
    </div>
  );
};
