import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, X, Send, Users, Minimize2, Maximize2,
  User, Check, ChevronLeft, Search, Circle
} from 'lucide-react';
import {
  useTeamChatStore,
  ChatMessage,
  isMessageForUser,
  getUnreadChatCountForUser
} from '../../stores/teamChatStore';
import { useAuthStore } from '../../stores/authStore';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export const TeamChatPopup: React.FC = () => {
  const {
    isOpen,
    activeChatTarget,
    messages,
    toggleChat,
    closeChat,
    setActiveChatTarget,
    sendMessage,
    markChatAsReadForUser,
  } = useTeamChatStore();

  const { session, users } = useAuthStore();
  const currentUser = session?.user;
  const currentUserId = currentUser?.id || 'user-andi';

  // Hitung jumlah chat masuk yang belum dibaca khusus untuk user yang sedang login
  const unreadCount = getUnreadChatCountForUser(messages, currentUserId);

  const [inputMessage, setInputMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'contacts'>('chat');
  const [contactSearch, setContactSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Daftar kontak rekan kerja (selain diri sendiri)
  const contacts = users.filter((u) => u.id !== currentUserId);

  // Tentukan nama partner chat saat ini
  const activePartner = activeChatTarget === 'all'
    ? null
    : users.find((u) => u.id === activeChatTarget);

  // Filter pesan sesuai channel yang sedang dibuka
  // 1. Jika activeChatTarget === 'all': pesan umum
  // 2. Jika activeChatTarget === userId: pesan antara currentUser dan userId tersebut
  const displayedMessages = messages.filter((msg) => {
    if (activeChatTarget === 'all') {
      return !msg.recipientId || msg.recipientId === 'all';
    } else {
      // Personal chat (Direct Message)
      const isSentByMeToPartner = msg.senderId === currentUserId && msg.recipientId === activeChatTarget;
      const isSentByPartnerToMe = msg.senderId === activeChatTarget && msg.recipientId === currentUserId;
      return isSentByMeToPartner || isSentByPartnerToMe;
    }
  });

  // Auto-scroll ke bawah saat ada pesan baru atau saat chat dibuka, dan tandai sudah dibaca untuk akun ini
  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      markChatAsReadForUser(currentUserId, activeChatTarget);
    }
  }, [isOpen, isMinimized, displayedMessages.length, activeChatTarget, activeTab, currentUserId]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    sendMessage({
      senderId: currentUserId,
      senderName: currentUser?.name || 'Saya',
      senderAvatar: currentUser?.avatar || (currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AW'),
      senderColor: '#7c3aed',
      senderRole: currentUser?.role || 'Staff',
      content: inputMessage,
      recipientId: activeChatTarget,
      recipientName: activePartner?.name,
    });

    setInputMessage('');
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end pointer-events-auto">
      {/* Floating Chat Window */}
      {isOpen && (
        <div
          className={`mb-3 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-5 ${
            isMinimized ? 'h-14' : 'h-[520px]'
          }`}
        >
          {/* Header Pop-up Chat */}
          <div className="p-3 bg-gradient-to-r from-primary-600 via-primary-700 to-indigo-700 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              {activeTab === 'contacts' ? (
                <button
                  onClick={() => setActiveTab('chat')}
                  className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer mr-1"
                  title="Kembali ke Percakapan"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : null}

              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                  {activeChatTarget === 'all' ? (
                    <Users size={16} />
                  ) : (
                    activePartner?.avatar || '👤'
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-primary-700 rounded-full"></span>
              </div>

              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-xs leading-none truncate">
                    {activeTab === 'contacts'
                      ? 'Pilih Kontak Chat'
                      : activeChatTarget === 'all'
                      ? 'Diskusi Tim Kelana'
                      : activePartner?.name || 'Personal Chat'}
                  </h4>
                  {activeChatTarget !== 'all' && activeTab === 'chat' && (
                    <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-medium">
                      Personal
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-primary-200 leading-none mt-1 truncate">
                  {activeTab === 'contacts'
                    ? 'Klik untuk mulai pesan langsung'
                    : activeChatTarget === 'all'
                    ? 'Semua Divisi • Saluran Umum'
                    : `${activePartner?.position || 'Staff'} • ${activePartner?.division || 'Divisi'}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Tombol Ganti Penerima (Semua Tim vs Personal) */}
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'chat' ? 'contacts' : 'chat')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1 ${
                  activeTab === 'contacts'
                    ? 'bg-white text-primary-800'
                    : 'hover:bg-white/20 text-white'
                }`}
                title="Pilih Chat ke Tim atau Personal"
              >
                <User size={13} />
                <span className="text-[10px]">Kontak</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title={isMinimized ? 'Perbesar' : 'Kecilkan'}
              >
                {isMinimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button
                type="button"
                onClick={closeChat}
                className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Tutup Chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body Konten Chat (Jika tidak diminimalkan) */}
          {!isMinimized && (
            <>
              {/* TAB 1: PILIH TUJUAN CHAT (SEMUA TIM ATAU PERSONAL) */}
              {activeTab === 'contacts' ? (
                <div className="flex-1 flex flex-col p-3 bg-white dark:bg-gray-900 overflow-hidden text-xs">
                  {/* Pencarian Rekan Kerja */}
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-2">
                    <Search size={14} className="text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari rekan kerja / divisi..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs w-full text-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-1">
                    {/* Opsi 1: Saluran Seluruh Tim (Umum) */}
                    <button
                      onClick={() => {
                        setActiveChatTarget('all');
                        setActiveTab('chat');
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left ${
                        activeChatTarget === 'all'
                          ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-xs">
                          <Users size={15} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">Saluran Seluruh Tim (#tim-umum)</p>
                          <p className="text-[10px] text-gray-400">Pesan publik terbaca oleh semua anggota kantor</p>
                        </div>
                      </div>
                      {activeChatTarget === 'all' && (
                        <Check size={14} className="text-primary-600 font-bold" />
                      )}
                    </button>

                    <div className="pt-2 pb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Chat Personal (Direct Message)
                    </div>

                    {/* Opsi 2: Daftar Kontak Karyawan / Personal */}
                    {contacts
                      .filter(
                        (c) =>
                          c.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
                          c.division.toLowerCase().includes(contactSearch.toLowerCase())
                      )
                      .map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => {
                            setActiveChatTarget(contact.id);
                            setActiveTab('chat');
                          }}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer text-left ${
                            activeChatTarget === contact.id
                              ? 'bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: contact.color || '#2563eb' }}
                            >
                              {contact.avatar}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-white truncate">
                                {contact.name}
                              </p>
                              <p className="text-[10px] text-gray-400 truncate">
                                {contact.position} • {contact.division}
                              </p>
                            </div>
                          </div>
                          {activeChatTarget === contact.id && (
                            <Check size={14} className="text-primary-600 font-bold flex-shrink-0" />
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                /* TAB 2: TAMPILAN PERCAKAPAN CHAT */
                <>
                  {/* Banner Info Target Chat */}
                  <div className="px-3 py-1.5 bg-gray-100/80 dark:bg-gray-800/70 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 dark:text-gray-400 truncate">
                      {activeChatTarget === 'all' ? (
                        <span>📢 Mengirim ke: <strong>Seluruh Tim</strong></span>
                      ) : (
                        <span>🔒 Chat Personal dengan: <strong>{activePartner?.name}</strong></span>
                      )}
                    </span>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className="text-primary-600 hover:text-primary-700 font-bold cursor-pointer text-[10px] ml-2 flex-shrink-0"
                    >
                      Ganti
                    </button>
                  </div>

                  {/* Message List */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-950/40 text-xs">
                    {displayedMessages.length === 0 ? (
                      <div className="text-center py-10 space-y-2 text-gray-400">
                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mx-auto flex items-center justify-center">
                          <MessageSquare size={18} />
                        </div>
                        <p className="font-medium text-gray-600 dark:text-gray-300">Belum ada percakapan</p>
                        <p className="text-[10px]">
                          {activeChatTarget === 'all'
                            ? 'Mulai obrolan pertama dengan seluruh tim!'
                            : `Kirim pesan pribadi pertama Anda kepada ${activePartner?.name || 'rekan kerja'}.`}
                        </p>
                      </div>
                    ) : (
                      displayedMessages.map((msg) => {
                        const isMe = msg.senderId === currentUserId;

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}
                          >
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 shadow-xs"
                              style={{ backgroundColor: msg.senderColor || '#7c3aed' }}
                            >
                              {msg.senderAvatar}
                            </div>

                            <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`flex items-center gap-1.5 mb-0.5 px-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <span className="font-semibold text-[11px] text-gray-700 dark:text-gray-300">
                                  {isMe ? 'Saya' : msg.senderName.split(' ')[0]}
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  {format(parseISO(msg.timestamp), 'HH:mm', { locale: idLocale })}
                                </span>
                              </div>

                              <div
                                className={`px-3 py-2 rounded-2xl leading-relaxed text-xs shadow-xs break-words ${
                                  isMe
                                    ? 'bg-primary-600 text-white rounded-tr-xs'
                                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700/80 rounded-tl-xs'
                                }`}
                              >
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Bar */}
                  <form
                    onSubmit={handleSend}
                    className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder={
                        activeChatTarget === 'all'
                          ? 'Ketik pesan ke seluruh tim...'
                          : `Ketik pesan personal ke ${activePartner?.name?.split(' ')[0] || 'rekan'}...`
                      }
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      className="input text-xs py-2 px-3 flex-1 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim()}
                      className="w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 text-white flex items-center justify-center transition-all shadow-sm cursor-pointer flex-shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Floating Toggle Button (Pojok Kanan Bawah) */}
      <div className="relative">
        <button
          onClick={toggleChat}
          className="relative group w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 via-primary-700 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-2 border-white dark:border-gray-800"
          title="Buka Chat Tim & Personal Ruang Kelana"
        >
          {isOpen ? (
            <X size={24} className="transition-transform group-hover:rotate-90 duration-200" />
          ) : (
            <MessageSquare size={24} />
          )}

          {/* Indikator Notifikasi Menyala (Berdenyut) Jika Ada Chat Masuk */}
          {unreadCount > 0 && !isOpen && (
            <>
              {/* Efek Ping Glow Berdenyut */}
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-rose-500 rounded-full animate-ping opacity-75"></span>
              {/* Badge Counter */}
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-600 border-2 border-white dark:border-gray-900 text-[11px] font-black text-white flex items-center justify-center shadow-lg">
                {unreadCount}
              </span>
            </>
          )}
        </button>

        {/* Floating Tooltip jika ada pesan baru dan chat tertutup */}
        {unreadCount > 0 && !isOpen && (
          <div
            onClick={toggleChat}
            className="absolute right-16 top-2 cursor-pointer bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-[11px] font-semibold py-1.5 px-3 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 whitespace-nowrap animate-bounce flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>{unreadCount} pesan masuk</span>
          </div>
        )}
      </div>
    </div>
  );
};
