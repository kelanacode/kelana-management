import React, { useState } from 'react';
import { X, MessageSquare, Check, Trash2, Send, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { NoteComment } from '../../types';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface CommentsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  comments: NoteComment[];
  selectedText?: string;
  onAddComment: (content: string, selectedText?: string) => void;
  onResolveComment: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  isOpen,
  onClose,
  comments,
  selectedText,
  onAddComment,
  onResolveComment,
  onDeleteComment,
}) => {
  const [newComment, setNewComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onAddComment(newComment.trim(), selectedText);
    setNewComment('');
  };

  const activeComments = comments.filter(c => !c.resolved);
  const resolvedComments = comments.filter(c => c.resolved);

  return (
    <div className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col h-full animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/40">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-primary-600" />
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">Komentar Dokumen</h3>
          <span className="text-xs bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold px-2 py-0.5 rounded-full">
            {activeComments.length}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={16} />
        </button>
      </div>

      {/* Add comment box */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
        {selectedText && (
          <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/30 border-l-2 border-amber-400 text-xs text-amber-800 dark:text-amber-300 rounded-r truncate italic">
            "{selectedText}"
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Tulis komentar atau saran koreksi..."
            rows={2}
            className="input text-xs resize-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50"
            >
              <Send size={12} /> Kirim Komentar
            </button>
          </div>
        </form>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">Belum ada komentar pada dokumen ini</p>
            <p className="text-[11px] text-gray-400 mt-1">Sorot teks atau tulis komentar langsung di atas</p>
          </div>
        ) : (
          <>
            {activeComments.map(c => (
              <div
                key={c.id}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xs space-y-2"
              >
                {c.selectedText && (
                  <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded border-l-2 border-primary-500 truncate italic">
                    "{c.selectedText}"
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {c.authorAvatar}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900 dark:text-white leading-none">{c.author}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {format(parseISO(c.createdAt), "d MMM, HH:mm", { locale: idLocale })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onResolveComment(c.id)}
                      className="p-1 rounded text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      title="Tandai Selesai / Resolve"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={() => onDeleteComment(c.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Hapus Komentar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {c.content}
                </p>
              </div>
            ))}

            {resolvedComments.length > 0 && (
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Selesai ({resolvedComments.length})
                </p>
                {resolvedComments.map(c => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 opacity-70 text-xs flex items-center justify-between"
                  >
                    <div className="truncate flex-1 mr-2">
                      <span className="font-semibold text-gray-600 dark:text-gray-300">{c.author}: </span>
                      <span className="text-gray-500 truncate">{c.content}</span>
                    </div>
                    <button
                      onClick={() => onResolveComment(c.id)}
                      className="text-[10px] text-primary-600 hover:underline flex-shrink-0"
                    >
                      Buka Lagi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
