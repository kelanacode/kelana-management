import React, { useState } from 'react';
import {
  Users, Activity, MessageSquare, AtSign, Send,
  CheckCircle2, Clock, TrendingUp, UserPlus
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useAuthStore } from '../stores/authStore';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const Team: React.FC = () => {
  const { members, activities, settings } = useAppStore();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ id: string; memberId: string; content: string; timestamp: string }[]>([]);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const sessionUser = useAuthStore((s) => s.session?.user);
  const currentUser = settings.currentUser ?? {
    id: sessionUser?.id ?? 'me',
    name: sessionUser?.name ?? 'Saya',
    avatar: sessionUser?.avatar ?? '?',
    color: sessionUser?.color ?? '#7c3aed',
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      memberId: currentUser.id,
      content: message,
      timestamp: new Date().toISOString(),
    };
    setMessages([...messages, newMsg]);
    setMessage('');
  };

  const roleColors: Record<string, string> = {
    'Frontend Developer': 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
    'Product Designer': 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
    'Backend Developer': 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400',
    'Project Manager': 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Members + Activity */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col overflow-hidden">
        {/* Members */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-primary-600" /> Anggota Tim
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {members.filter((m) => m.online).length}/{members.length} online
            </span>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.avatar}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${member.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${roleColors[member.role] ?? 'text-gray-500 bg-gray-100'}`}>
                    {member.role}
                  </span>
                </div>
                {member.online && (
                  <span className="text-xs text-green-500 font-medium flex-shrink-0">Online</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="flex-1 overflow-y-auto p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-500" /> Aktivitas Tim
          </h3>
          <div className="space-y-4">
            {activities.map((activity) => {
              const member = memberMap[activity.memberId];
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: member?.color ?? '#6b7280' }}
                  >
                    {member?.avatar ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
                      <span className="font-medium">{member?.name}</span>{' '}
                      <span className="text-gray-500">{activity.action}</span>{' '}
                      <span className="font-medium text-primary-600 dark:text-primary-400">{activity.target}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {format(parseISO(activity.timestamp), "d MMM, HH:mm", { locale: idLocale })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Team Chat */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((m) => (
                <div key={m.id} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: m.color }}>
                  {m.avatar}
                </div>
              ))}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white"># tim-umum</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Saluran diskusi tim Ruang Kelana</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const member = memberMap[msg.memberId] ?? currentUser;
            const isMe = msg.memberId === currentUser.id;

            // Process mentions
            const processContent = (content: string) => {
              return content.replace(/@(\w+)/g, '<span class="text-primary-600 dark:text-primary-400 font-medium">@$1</span>');
            };

            return (
              <div key={msg.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.avatar}
                </div>
                <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{member.name.split(' ')[0]}</span>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(msg.timestamp), "HH:mm", { locale: idLocale })}
                    </span>
                  </div>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm'
                    }`}
                    dangerouslySetInnerHTML={{ __html: processContent(msg.content) }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.avatar}
            </div>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 border border-gray-200 dark:border-gray-700 focus-within:border-primary-400 dark:focus-within:border-primary-600 transition-colors">
              <AtSign size={14} className="text-gray-400 flex-shrink-0" />
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Tulis pesan... (gunakan @ untuk mention)"
                className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Tekan Enter untuk mengirim • Gunakan @nama untuk mention
          </p>
        </div>
      </div>
    </div>
  );
};
