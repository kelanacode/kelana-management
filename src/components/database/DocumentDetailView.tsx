import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { PageBreak } from '../notes/PageBreakExtension';

import {
  DatabaseDocument, DocumentCategory, NoteComment
} from '../../types';
import { useDatabaseStore } from '../../stores/databaseStore';
import {
  FileText, ExternalLink, Copy, Download, Edit3, Check,
  Trash2, Plus, Calendar, User, Building, ShieldCheck, Tag, X,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3,
  Highlighter, CheckSquare,
  Undo2, Redo2, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, MessageSquare, RemoveFormatting,
  Indent, Outdent, ZoomIn, ZoomOut, Sparkles,
  PenTool, Paintbrush, Calculator, Network,
  Tag as ChipIcon, Layers, FileDown, Eye, ChevronDown,
  Minus, FileText as PaperIcon, FilePlus, Printer
} from 'lucide-react';

import { SignatureModal } from '../notes/SignatureModal';
import { CanvasDrawingModal } from '../notes/CanvasDrawingModal';
import { SymbolPickerModal } from '../notes/SymbolPickerModal';
import { EquationModal } from '../notes/EquationModal';
import { DiagramModal } from '../notes/DiagramModal';
import { SmartChipsModal } from '../notes/SmartChipsModal';
import { BuildingBlocksModal } from '../notes/BuildingBlocksModal';
import { CommentsSidebar } from '../notes/CommentsSidebar';
import { TableGridPicker } from '../notes/TableGridPicker';
import { printDocumentCanvas } from '../../utils/printHelper';

// Custom TextStyle extension with fontSize attribute
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },
});

const FONT_FAMILIES = [
  { label: 'Inter (Default)', value: 'Inter, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Merriweather', value: 'Merriweather, serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Dancing Script', value: '"Dancing Script", cursive' },
];

const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

const TEXT_COLORS = [
  '#000000', '#475569', '#dc2626', '#ea580c', '#d97706',
  '#16a34a', '#0284c7', '#2563eb', '#7c3aed', '#db2777'
];

const HIGHLIGHT_COLORS = [
  { name: 'Kuning', color: '#fef08a' },
  { name: 'Hijau Muda', color: '#bbf7d0' },
  { name: 'Biru Muda', color: '#bae6fd' },
  { name: 'Merah Muda', color: '#fbcfe8' },
  { name: 'Ungu Muda', color: '#ddd6fe' },
  { name: 'Oranye Muda', color: '#fed7aa' },
];

export type PaperSize = 'A4' | 'F4';

export const PAPER_CONFIG: Record<PaperSize, { name: string; desc: string; width: string; minHeight: string }> = {
  A4: {
    name: 'A4',
    desc: '210 × 297 mm',
    width: '794px',
    minHeight: '1123px',
  },
  F4: {
    name: 'F4 / Folio',
    desc: '215 × 330 mm',
    width: '812px',
    minHeight: '1248px',
  },
};

const CATEGORY_COLORS: Record<DocumentCategory, { bg: string; text: string; border: string }> = {
  SOP: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  Proposal: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  Kontrak: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  Laporan: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  Kebijakan: { bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  Lainnya: { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
};

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
  Review: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300',
  Disetujui: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300',
  Berlaku: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300',
  Arsip: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300',
};

interface DocumentDetailViewProps {
  document: DatabaseDocument;
  onUpdate: (updates: Partial<DatabaseDocument>) => void;
  onDelete: () => void;
}

export const DocumentDetailView: React.FC<DocumentDetailViewProps> = ({
  document: doc,
  onUpdate,
  onDelete,
}) => {
  const { addCommentToDocument, resolveComment, deleteComment } = useDatabaseStore();

  const [copied, setCopied] = useState(false);
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);

  // Metadata form state
  const [title, setTitle] = useState(doc.title);
  const [category, setCategory] = useState<DocumentCategory>(doc.category);
  const [status, setStatus] = useState(doc.status);
  const [version, setVersion] = useState(doc.version);
  const [department, setDepartment] = useState(doc.department);
  const [author, setAuthor] = useState(doc.author);
  const [gdocsUrl, setGdocsUrl] = useState(doc.gdocsUrl || '');
  const [showEmbeddedGDocs, setShowEmbeddedGDocs] = useState(true); // Default tampilkan Live GDocs View
  const [showGDocsLinkModal, setShowGDocsLinkModal] = useState(false);

  // Helper konversi URL Google Docs ke format embed iframe preview
  const getEmbeddableGDocsUrl = (rawUrl?: string): string => {
    if (!rawUrl) return '';
    let url = rawUrl.trim();
    if (url.includes('docs.google.com/document')) {
      if (url.includes('/edit')) {
        url = url.split('/edit')[0] + '/preview?embedded=true';
      } else if (!url.includes('/preview')) {
        url = url.replace(/\/$/, '') + '/preview?embedded=true';
      } else if (!url.includes('embedded=true')) {
        url = url + (url.includes('?') ? '&embedded=true' : '?embedded=true');
      }
    }
    return url;
  };

  // Ribbon state
  const [zoom, setZoom] = useState<number>(100);
  const [paperSize, setPaperSize] = useState<PaperSize>(doc.paperSize || 'A4');
  const [currentFontSize, setCurrentFontSize] = useState<string>('11');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>('Inter, sans-serif');
  const [currentLineSpacing, setCurrentLineSpacing] = useState<string>('1.15');

  // Dropdown toggles
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightColorPicker, setShowHighlightColorPicker] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);

  // Modal toggles
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);

  // Extended insert modals
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [showEquationModal, setShowEquationModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [showSmartChipsModal, setShowSmartChipsModal] = useState(false);
  const [showBuildingBlocksModal, setShowBuildingBlocksModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setSelectionVersion] = useState(0);

  // Sync state when doc changes
  useEffect(() => {
    setTitle(doc.title);
    setCategory(doc.category);
    setStatus(doc.status);
    setVersion(doc.version);
    setDepartment(doc.department);
    setAuthor(doc.author);
    setGdocsUrl(doc.gdocsUrl || '');
    if (doc.paperSize) {
      setPaperSize(doc.paperSize);
    }
  }, [doc.id]);

  // Setup TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Mulai menulis draf dokumen resmi, SOP, atau proposal di sini...',
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Highlight.configure({ multicolor: true }),
      CustomTextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline cursor-pointer',
        },
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl max-w-full my-4 shadow-md border border-gray-200 dark:border-gray-700',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      PageBreak.configure({ pageHeight: 960 }),
    ],
    content: doc.content || '',
    onSelectionUpdate: () => {
      setSelectionVersion((v) => v + 1);
    },
    onTransaction: () => {
      setSelectionVersion((v) => v + 1);
    },
    onUpdate: ({ editor }) => {
      onUpdate({ content: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror tiptap-editor focus:outline-none min-h-[820px]',
      },
    },
  });

  // Re-sync editor content when switching document
  useEffect(() => {
    if (editor && doc) {
      if (editor.getHTML() !== doc.content) {
        editor.commands.setContent(doc.content ?? '');
      }
    }
  }, [doc.id]);

  const handlePaperSizeChange = (size: PaperSize) => {
    setPaperSize(size);
    onUpdate({ paperSize: size });
  };

  // Font Size helpers
  const setFontSize = (sizePt: string) => {
    setCurrentFontSize(sizePt);
    if (!editor) return;
    (editor.chain().focus() as any).setMark('textStyle', { fontSize: `${sizePt}pt` }).run();
  };

  const changeFontSizeStep = (delta: number) => {
    const current = parseInt(currentFontSize) || 11;
    const next = Math.max(6, Math.min(96, current + delta));
    setFontSize(String(next));
  };

  // Font Family helper
  const handleFontFamilyChange = (fontVal: string) => {
    setCurrentFontFamily(fontVal);
    if (!editor) return;
    editor.chain().focus().setFontFamily(fontVal).run();
  };

  // Link handler
  const handleInsertLink = () => {
    if (!editor) return;
    if (linkUrl.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl('');
    setShowLinkModal(false);
  };

  // Image Upload handler
  const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (src) {
        editor.chain().focus().setImage({ src }).run();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowImageModal(false);
  };

  const handleInsertImageUrl = () => {
    if (imageUrl.trim() && editor) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setImageUrl('');
    setShowImageModal(false);
  };

  // Table row & column action helpers
  const handleInsertTableRowAfter = () => {
    if (!editor) return;
    if (editor.isActive('table') || editor.can().addRowAfter()) {
      editor.chain().focus().addRowAfter().run();
    } else {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const handleInsertTableRowBefore = () => {
    if (!editor) return;
    editor.chain().focus().addRowBefore().run();
  };

  const handleInsertTableColAfter = () => {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  };

  const handleInsertTableColBefore = () => {
    if (!editor) return;
    editor.chain().focus().addColumnBefore().run();
  };

  const handleDeleteTableRow = () => {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
  };

  const handleDeleteTableCol = () => {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
  };

  const handleDeleteEntireTable = () => {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
  };

  const getSelectedText = () => {
    if (!editor) return '';
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, ' ');
  };

  const handleCopyForGDocs = async () => {
    try {
      const currentHtml = editor ? editor.getHTML() : doc.content;
      const fullHtml = `
        <div style="font-family: Arial, sans-serif; color: #111827; max-width: 800px; margin: 0 auto; line-height: 1.6;">
          <h1 style="color: #1e3a8a; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">${doc.emoji} ${doc.title}</h1>
          <p style="color: #4b5563; font-size: 13px;">
            <strong>Kategori:</strong> ${doc.category} | <strong>Departemen:</strong> ${doc.department} | <strong>Versi:</strong> ${doc.version} | <strong>Status:</strong> ${doc.status}
          </p>
          <hr style="border: 0; border-top: 1px solid #cbd5e1; margin: 20px 0;" />
          ${currentHtml}
        </div>
      `;

      if (navigator.clipboard && (window as any).ClipboardItem) {
        const blob = new Blob([fullHtml], { type: 'text/html' });
        const textBlob = new Blob([doc.title + '\n\n' + currentHtml.replace(/<[^>]+>/g, '')], { type: 'text/plain' });
        const item = new (window as any).ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        });
        await navigator.clipboard.write([item]);
      } else {
        await navigator.clipboard.writeText(fullHtml);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy document:', e);
    }
  };

  const handleDownloadDoc = () => {
    const currentHtml = editor ? editor.getHTML() : doc.content;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${doc.title}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:2rem auto;padding:2rem;background:#ffffff;color:#111827;line-height:1.6;}table{border-collapse:collapse;width:100%;margin:1.5rem 0;}th,td{border:1px solid #334155;padding:8px 12px;}th{background:#f1f5f9;font-weight:bold;}.callout-box{border-left:4px solid #2563eb;background:#eff6ff;padding:12px;margin:1rem 0;border-radius:4px;}</style></head><body><h1>${doc.emoji} ${doc.title}</h1><p><strong>Kategori:</strong> ${doc.category} | <strong>Departemen:</strong> ${doc.department} | <strong>Versi:</strong> ${doc.version} | <strong>Status:</strong> ${doc.status}</p><hr/>${currentHtml}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}_GDocs.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveMetadata = () => {
    onUpdate({
      title,
      category,
      status,
      version,
      department,
      author,
      gdocsUrl,
      updatedAt: new Date().toISOString(),
    });
    setShowMetadataEditor(false);
  };

  const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.Lainnya;

  // Active state indicators
  const isBold = editor?.isActive('bold');
  const isItalic = editor?.isActive('italic');
  const isUnderline = editor?.isActive('underline');
  const isStrike = editor?.isActive('strike');
  const isH1 = editor?.isActive('heading', { level: 1 });
  const isH2 = editor?.isActive('heading', { level: 2 });
  const isH3 = editor?.isActive('heading', { level: 3 });
  const isBullet = editor?.isActive('bulletList');
  const isOrdered = editor?.isActive('orderedList');
  const isTaskList = editor?.isActive('taskList');
  const isTable = editor?.isActive('table');
  const isLink = editor?.isActive('link');

  const comments = doc.comments || [];
  const unresolvedCommentsCount = comments.filter((c) => !c.resolved).length;

  // Calculate word & character count
  const textContent = editor?.state.doc.textContent || '';
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  // Page count
  const countPageBreaks = () => {
    let count = 0;
    editor?.state.doc.descendants((node) => {
      if (node.type.name === 'pageBreak') count++;
    });
    return count;
  };
  const pageCount = editor ? 1 + countPageBreaks() : 1;
  const basePageHeight = paperSize === 'A4' ? 1123 : 1248;
  const paperMinHeight = `${pageCount * basePageHeight + (pageCount - 1) * 48}px`;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-100/70 dark:bg-gray-950/90">
      {/* =========================================================================
          TOP DOCUMENT HEADER & METADATA BAR
          ========================================================================= */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-2.5 flex items-center justify-between flex-wrap gap-3 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{doc.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  onUpdate({ title: e.target.value });
                }}
                className="font-bold text-gray-900 dark:text-white text-base bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-700 focus:border-primary-500 focus:outline-none transition-colors max-w-sm sm:max-w-md"
                placeholder="Judul Dokumen..."
              />
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                {doc.category}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[doc.status] || ''}`}>
                {doc.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Departemen: {doc.department} • Versi: {doc.version} • Penulis: {doc.author}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMetadataEditor(!showMetadataEditor)}
            className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs ${showMetadataEditor ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 border-primary-300' : ''}`}
            title="Edit informasi detail dokumen (Kategori, Status, Versi, PIC)"
          >
            <Edit3 size={13} />
            <span>Detail Info</span>
          </button>

          <button
            type="button"
            onClick={() => printDocumentCanvas(doc.title || 'Dokumen')}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Cetak Dokumen Resmi (Ctrl+P)"
          >
            <Printer size={13} />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            onClick={handleCopyForGDocs}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Salin isi dokumen ini untuk di-paste langsung ke Google Docs"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'Tersalin untuk GDocs!' : 'Salin untuk GDocs'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadDoc}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Unduh berkas dokumen HTML"
          >
            <Download size={13} />
            <span>Unduh</span>
          </button>

          {/* Tombol Pengaturan Link Google Docs */}
          <button
            type="button"
            onClick={() => setShowGDocsLinkModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer shadow-xs"
            title="Kelola tautan integrasi Google Docs"
          >
            <FileText size={14} className="text-blue-600" />
            <span>Google Docs</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </button>

          {/* Tombol Tampilkan Live Google Docs Langsung di Ruang Kelana */}
          {doc.gdocsUrl && (
            <button
              type="button"
              onClick={() => setShowEmbeddedGDocs(!showEmbeddedGDocs)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer shadow-xs ${
                showEmbeddedGDocs
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50'
              }`}
              title="Tampilkan Google Docs langsung di dalam Ruang Kelana"
            >
              <Eye size={13} />
              <span>{showEmbeddedGDocs ? 'Tutup Live Docs' : 'Buka Live Docs'}</span>
            </button>
          )}

          {doc.gdocsUrl && (
            <a
              href={doc.gdocsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 cursor-pointer shadow-xs"
              title="Buka dokumen terkait di tab baru Google Docs"
            >
              <ExternalLink size={13} />
              <span>Tab Baru</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            className={`btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs ${showCommentsSidebar ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 border-primary-300' : ''}`}
            title="Buka sidebar komentar dokumen"
          >
            <MessageSquare size={13} />
            <span>Komentar</span>
            {unresolvedCommentsCount > 0 && (
              <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                {unresolvedCommentsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Hapus dokumen ini"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* METADATA QUICK DRAWER / FORM */}
      {showMetadataEditor && (
        <div className="bg-gray-50 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 px-6 py-3 transition-all animate-fadeIn z-15">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Pengaturan Informasi Dokumen Resmi
              </h4>
              <button
                onClick={() => setShowMetadataEditor(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Kategori Dokumen:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                  className="input text-xs"
                >
                  <option value="SOP">📋 SOP (Standar Operasional)</option>
                  <option value="Proposal">📑 Proposal Bisnis / Proyek</option>
                  <option value="Kontrak">📜 Kontrak / Perjanjian Kerja</option>
                  <option value="Laporan">📊 Laporan Kerja & Evaluasi</option>
                  <option value="Kebijakan">🛡️ Kebijakan Perusahaan</option>
                  <option value="Lainnya">📄 Dokumen Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Status Dokumen:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="input text-xs"
                >
                  <option value="Draft">Draft</option>
                  <option value="Review">Review</option>
                  <option value="Disetujui">Disetujui</option>
                  <option value="Berlaku">Berlaku Resmi</option>
                  <option value="Arsip">Arsip</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Versi Dokumen:</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="input text-xs"
                  placeholder="Contoh: v1.0, v2.1"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Departemen / Divisi:</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input text-xs"
                  placeholder="Contoh: Operasional, IT, HR"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Penulis (Author):</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="input text-xs"
                  placeholder="Nama pembuat atau penanggung jawab"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1">Tautan Dokumen Google Docs:</label>
                <input
                  type="url"
                  value={gdocsUrl}
                  onChange={(e) => setGdocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMetadataEditor(false)}
                className="btn-secondary text-xs py-1 px-3"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveMetadata}
                className="btn-primary text-xs py-1 px-4 flex items-center gap-1.5"
              >
                <Check size={13} />
                <span>Simpan Perubahan Info</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAMPILAN FULL-HEIGHT GOOGLE DOCS VIEW LANGSUNG (LIVE GDOCS EMBED) */}
      {showEmbeddedGDocs && doc.gdocsUrl ? (
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
              <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" />
                Live Google Docs View (Tampilan Khusus Dokumen GDocs)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 hidden md:inline">
                Dokumen resmi tersimpan langsung ke Google Docs
              </span>
              <button
                type="button"
                onClick={() => setShowEmbeddedGDocs(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 flex items-center gap-1 font-semibold"
                title="Beralih ke editor dokumen kanvas internal"
              >
                <Edit3 size={12} /> Beralih ke Editor Kanvas
              </button>
              <a
                href={doc.gdocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 dark:text-blue-300 font-semibold hover:underline flex items-center gap-1"
              >
                <ExternalLink size={12} /> Buka Tab Baru
              </a>
            </div>
          </div>

          <div className="flex-1 w-full h-full bg-gray-50 dark:bg-gray-900">
            <iframe
              src={getEmbeddableGDocsUrl(doc.gdocsUrl)}
              title="Google Docs Live Full View"
              className="w-full h-full border-0"
              allow="clipboard-read; clipboard-write; fullscreen"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Modal Tempel Link Google Docs */}
      {showGDocsLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                Integrasi Tautan Google Docs
              </h3>
              <button onClick={() => setShowGDocsLinkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tempel link berkas Google Docs dari akun Google Anda untuk menghubungkan dokumen ini secara langsung ke dalam Ruang Kelana:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  URL Dokumen Google Docs:
                </label>
                <input
                  type="url"
                  value={gdocsUrl}
                  onChange={(e) => setGdocsUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  💡 Tips Integrasi Berkas Google Docs:
                </p>
                <p>
                  1. Buka Google Docs Anda, klik tombol <strong>Bagikan (Share)</strong> di pojok kanan atas.
                </p>
                <p>
                  2. Atur akses menjadi <em>"Siapa saja yang memiliki link"</em> (atau pastikan akun Anda sedang login di peramban).
                </p>
                <p>
                  3. Salin link dan tempel ke kotak di atas, lalu klik <strong>Simpan Tautan</strong>.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGDocsLinkModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdate({ gdocsUrl });
                    setShowEmbeddedGDocs(true);
                    setShowGDocsLinkModal(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <Check size={13} /> Simpan Tautan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL GOOGLE DOCS / WORD RIBBON TOOLBAR
          ========================================================================= */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-1.5 flex items-center gap-1 flex-wrap z-10 select-none shadow-xs">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onClick={() => printDocumentCanvas(doc.title || 'Dokumen')}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer mr-0.5"
            title="Cetak Dokumen (Ctrl+P)"
          >
            <Printer size={15} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().undo().run(); }}
            disabled={!editor?.can().undo()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Urungkan / Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().redo().run(); }}
            disabled={!editor?.can().redo()}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Ulangi / Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setZoom((prev) => Math.max(50, prev - 10))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Perkecil Zoom"
          >
            <ZoomOut size={14} />
          </button>
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            title="Skala Zoom Halaman"
          >
            <option value={50}>50%</option>
            <option value={75}>75%</option>
            <option value={90}>90%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
            <option value={200}>200%</option>
          </select>
          <button
            onClick={() => setZoom((prev) => Math.min(200, prev + 10))}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Perbesar Zoom"
          >
            <ZoomIn size={14} />
          </button>
        </div>

        {/* Paper Size Selector (A4 & F4) */}
        <div className="flex items-center gap-1 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <PaperIcon size={14} className="text-gray-500" />
          <select
            value={paperSize}
            onChange={(e) => handlePaperSizeChange(e.target.value as PaperSize)}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            title="Ukuran Kertas Dokumen"
          >
            <option value="A4">A4 (210×297 mm)</option>
            <option value="F4">F4 / Folio (215×330 mm)</option>
          </select>
        </div>

        {/* Paragraph Style Dropdown */}
        <div className="px-1.5 border-r border-gray-200 dark:border-gray-700">
          <select
            value={
              isH1 ? 'h1' : isH2 ? 'h2' : isH3 ? 'h3' : 'p'
            }
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'p') editor?.chain().focus().setParagraph().run();
              else if (val === 'h1') editor?.chain().focus().toggleHeading({ level: 1 }).run();
              else if (val === 'h2') editor?.chain().focus().toggleHeading({ level: 2 }).run();
              else if (val === 'h3') editor?.chain().focus().toggleHeading({ level: 3 }).run();
            }}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            title="Gaya Teks"
          >
            <option value="p">Teks Normal</option>
            <option value="h1">Judul 1 (Heading 1)</option>
            <option value="h2">Judul 2 (Heading 2)</option>
            <option value="h3">Judul 3 (Heading 3)</option>
          </select>
        </div>

        {/* Font Family Dropdown */}
        <div className="px-1.5 border-r border-gray-200 dark:border-gray-700">
          <select
            value={currentFontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 font-medium text-gray-700 dark:text-gray-300 outline-none max-w-[130px] cursor-pointer"
            title="Pilih Font Dokumen"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Font Size Dropdown & Stepper */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onMouseDown={(e) => { e.preventDefault(); changeFontSizeStep(-1); }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            title="Perkecil Ukuran Font"
          >
            <Minus size={12} />
          </button>
          <select
            value={currentFontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 font-semibold text-gray-700 dark:text-gray-300 outline-none w-14 text-center cursor-pointer"
            title="Ukuran Font (pt)"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onMouseDown={(e) => { e.preventDefault(); changeFontSizeStep(1); }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer"
            title="Perbesar Ukuran Font"
          >
            <Plus size={12} />
          </button>
        </div>

        {/* Basic Text Formatting: B, I, U, S */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBold().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isBold ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Tebalkan / Bold (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleItalic().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isItalic ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Miringkan / Italic (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleUnderline().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isUnderline ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Garis Bawah / Underline (Ctrl+U)"
          >
            <UnderlineIcon size={15} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleStrike().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isStrike ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Coret Teks / Strikethrough"
          >
            <Strikethrough size={15} />
          </button>
        </div>

        {/* Text Color & Highlight Picker */}
        <div className="flex items-center gap-1 px-1.5 border-r border-gray-200 dark:border-gray-700 relative">
          <div className="relative">
            <button
              onClick={() => { setShowTextColorPicker(!showTextColorPicker); setShowHighlightColorPicker(false); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 text-gray-700 dark:text-gray-300 cursor-pointer"
              title="Warna Teks"
            >
              <span className="font-bold border-b-2 border-primary-600 px-0.5 text-xs">A</span>
              <ChevronDown size={10} />
            </button>
            {showTextColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 grid grid-cols-5 gap-1.5 w-40">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor?.chain().focus().setColor(c).run();
                      setShowTextColorPicker(false);
                    }}
                    style={{ backgroundColor: c }}
                    className="w-6 h-6 rounded-md hover:scale-110 transition-transform cursor-pointer border border-gray-300 dark:border-gray-600"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => { setShowHighlightColorPicker(!showHighlightColorPicker); setShowTextColorPicker(false); }}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 text-gray-700 dark:text-gray-300 cursor-pointer"
              title="Warna Sorotan (Highlight)"
            >
              <Highlighter size={14} className="text-amber-500" />
              <ChevronDown size={10} />
            </button>
            {showHighlightColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 grid grid-cols-3 gap-1.5 w-48">
                {HIGHLIGHT_COLORS.map((hc) => (
                  <button
                    key={hc.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor?.chain().focus().setHighlight({ color: hc.color }).run();
                      setShowHighlightColorPicker(false);
                    }}
                    style={{ backgroundColor: hc.color }}
                    className="h-7 rounded-md hover:scale-105 transition-transform text-[10px] font-semibold text-gray-800 flex items-center justify-center cursor-pointer border border-gray-200"
                  >
                    {hc.name}
                  </button>
                ))}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().unsetHighlight().run();
                    setShowHighlightColorPicker(false);
                  }}
                  className="col-span-3 text-[11px] text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded text-center cursor-pointer"
                >
                  Hapus Sorotan
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Link, Image & Comments */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowLinkModal(true)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isLink ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Sisipkan Link (Ctrl+K)"
          >
            <LinkIcon size={14} />
          </button>
          <button
            onClick={() => setShowImageModal(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Sisipkan Gambar (Upload / URL)"
          >
            <ImageIcon size={14} />
          </button>
        </div>

        {/* Text Alignment & Line Spacing */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('left').run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'left' }) ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Rata Kiri"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('center').run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'center' }) ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Rata Tengah"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('right').run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'right' }) ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Rata Kanan"
          >
            <AlignRight size={14} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().setTextAlign('justify').run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Rata Kanan Kiri (Justify)"
          >
            <AlignJustify size={14} />
          </button>

          {/* Line Spacing */}
          <div className="relative">
            <button
              onClick={() => setShowLineSpacingMenu(!showLineSpacingMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer"
              title="Jarak Antar Baris & Spasi Paragraf"
            >
              <span>{currentLineSpacing}x</span>
              <ChevronDown size={10} className="ml-0.5" />
            </button>
            {showLineSpacingMenu && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 w-36 text-xs">
                {['1.0', '1.15', '1.5', '2.0'].map((spacing) => (
                  <button
                    key={spacing}
                    onClick={() => {
                      setCurrentLineSpacing(spacing);
                      setShowLineSpacingMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-primary-50 dark:hover:bg-primary-950/40 cursor-pointer flex items-center justify-between ${currentLineSpacing === spacing ? 'font-bold text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <span>Spasi {spacing}</span>
                    {currentLineSpacing === spacing && <Check size={12} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lists & Tasks */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleTaskList().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isTaskList ? 'bg-primary-100 text-primary-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Daftar Ceklist / To-do list"
          >
            <CheckSquare size={14} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleBulletList().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isBullet ? 'bg-primary-100 text-primary-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Daftar Berbutir (Bullet List)"
          >
            <List size={14} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().toggleOrderedList().run(); }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isOrdered ? 'bg-primary-100 text-primary-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            title="Daftar Bernomor (Numbered List)"
          >
            <ListOrdered size={14} />
          </button>
        </div>

        {/* Indent / Outdent & Clear Format */}
        <div className="flex items-center gap-0.5 px-1.5 border-r border-gray-200 dark:border-gray-700">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (editor?.can().sinkListItem('listItem')) editor.chain().focus().sinkListItem('listItem').run();
              else if (editor?.can().sinkListItem('taskItem')) editor.chain().focus().sinkListItem('taskItem').run();
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Tambah Inden (Tab)"
          >
            <Indent size={14} />
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              if (editor?.can().liftListItem('listItem')) editor.chain().focus().liftListItem('listItem').run();
              else if (editor?.can().liftListItem('taskItem')) editor.chain().focus().liftListItem('taskItem').run();
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
            title="Kurangi Inden (Shift+Tab)"
          >
            <Outdent size={14} />
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().unsetAllMarks().clearNodes().run(); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500 cursor-pointer"
            title="Hapus Pemformatan"
          >
            <RemoveFormatting size={14} />
          </button>
        </div>

        {/* Google Docs Table Icon & Interactive Grid Picker Matrix */}
        <div className="flex items-center gap-1 px-1.5 border-r border-gray-200 dark:border-gray-700 relative">
          <div className="relative">
            <button
              onClick={() => { setShowTablePicker(!showTablePicker); setShowInsertMenu(false); }}
              className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${isTable || showTablePicker ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              title="Sisipkan Tabel (Google Docs Grid)"
            >
              <TableIcon size={15} />
              <ChevronDown size={10} />
            </button>
            {showTablePicker && (
              <TableGridPicker
                isOpen={showTablePicker}
                onClose={() => setShowTablePicker(false)}
                onSelectGrid={(rows, cols) => {
                  editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                  setShowTablePicker(false);
                }}
                isInTable={editor?.isActive('table') ?? false}
                onInsertRowAfter={handleInsertTableRowAfter}
                onInsertRowBefore={handleInsertTableRowBefore}
                onInsertColAfter={handleInsertTableColAfter}
                onInsertColBefore={handleInsertTableColBefore}
                onDeleteRow={handleDeleteTableRow}
                onDeleteCol={handleDeleteTableCol}
                onDeleteTable={handleDeleteEntireTable}
              />
            )}
          </div>

          {/* Quick Insert Row Button */}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertTableRowAfter();
            }}
            className="px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-[11px] font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center gap-1 cursor-pointer"
            title="Tambah Baris Baru pada Tabel"
          >
            <Plus size={11} />
            <span>Baris</span>
          </button>
        </div>

        {/* Menu Sisipkan (+ Sisipkan) Mega Dropdown */}
        <div className="relative px-1.5">
          <button
            onClick={() => { setShowInsertMenu(!showInsertMenu); setShowTablePicker(false); }}
            className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-950/40 dark:to-blue-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 font-semibold cursor-pointer"
            title="Menu Sisipkan Elemen Dokumen"
          >
            <Plus size={13} className="text-primary-600" />
            <span>Sisipkan</span>
            <ChevronDown size={11} />
          </button>

          {showInsertMenu && (
            <div className="absolute top-full right-0 sm:left-0 mt-1 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 w-64 text-xs">
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Menu Sisipkan ala Google Docs & Word
              </div>

              <button
                onClick={() => { setShowInsertMenu(false); setShowTablePicker(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <TableIcon size={15} className="text-blue-500" />
                <div>
                  <p className="font-semibold">Tabel</p>
                  <p className="text-[10px] text-gray-400">Pilih baris dan kolom kisi visual</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowImageModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <ImageIcon size={15} className="text-emerald-500" />
                <div>
                  <p className="font-semibold">Gambar</p>
                  <p className="text-[10px] text-gray-400">Upload dari komputer atau tautan URL</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowBuildingBlocksModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <Layers size={15} className="text-amber-500" />
                <div>
                  <p className="font-semibold">Elemen Penyusun</p>
                  <p className="text-[10px] text-gray-400">Template ringkasan rapat, proposal, pelacak</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowSmartChipsModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <ChipIcon size={15} className="text-indigo-500" />
                <div>
                  <p className="font-semibold">Chip Pintar (Smart Chips)</p>
                  <p className="text-[10px] text-gray-400">Tag anggota tim, tanggal, berkas, status</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowSignatureModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <PenTool size={15} className="text-rose-500" />
                <div>
                  <p className="font-semibold">Tanda Tangan Elektronik</p>
                  <p className="text-[10px] text-gray-400">Gambar tanda tangan atau ketik digital resmi</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowLinkModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <LinkIcon size={15} className="text-cyan-500" />
                <div>
                  <p className="font-semibold">Tautan / Link</p>
                  <p className="text-[10px] text-gray-400">Sisipkan hyperlink dokumen atau web</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowCanvasModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <Paintbrush size={15} className="text-fuchsia-500" />
                <div>
                  <p className="font-semibold">Kanvas Gambar Bebas</p>
                  <p className="text-[10px] text-gray-400">Papan sketsa coretan bebas dan ilustrasi</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowDiagramModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <Network size={15} className="text-emerald-600" />
                <div>
                  <p className="font-semibold">Diagram & Bagan</p>
                  <p className="text-[10px] text-gray-400">Flowchart alur proses, diagram batang, matriks</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowSymbolModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <Sparkles size={15} className="text-yellow-500" />
                <div>
                  <p className="font-semibold">Simbol & Karakter Khusus</p>
                  <p className="text-[10px] text-gray-400">Karakter Yunani, mata uang, panah, tipografi</p>
                </div>
              </button>

              <button
                onClick={() => { setShowInsertMenu(false); setShowEquationModal(true); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2.5 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <Calculator size={15} className="text-purple-600" />
                <div>
                  <p className="font-semibold">Persamaan Matematika</p>
                  <p className="text-[10px] text-gray-400">Rumus ilmiah, integral, matriks, teorema</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CONTEXTUAL TABLE FLOATING ACTION TOOLBAR
          ========================================================================= */}
      {isTable && (
        <div className="bg-primary-50 dark:bg-primary-950/70 border-b border-primary-200 dark:border-primary-800 px-6 py-1.5 flex items-center gap-2 flex-wrap text-xs text-primary-900 dark:text-primary-200 animate-fadeIn z-10">
          <span className="font-bold flex items-center gap-1 mr-2 text-primary-700 dark:text-primary-300">
            <TableIcon size={14} /> Pengaturan Tabel:
          </span>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addRowBefore().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 bg-white dark:bg-gray-800 cursor-pointer"
          >
            + Baris Atas
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addRowAfter().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 bg-white dark:bg-gray-800 cursor-pointer"
          >
            + Baris Bawah
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addColumnBefore().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 bg-white dark:bg-gray-800 cursor-pointer"
          >
            + Kolom Kiri
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().addColumnAfter().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 bg-white dark:bg-gray-800 cursor-pointer"
          >
            + Kolom Kanan
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().deleteRow().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            Hapus Baris
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().deleteColumn().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
          >
            Hapus Kolom
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor?.chain().focus().deleteTable().run(); }}
            className="btn-secondary text-[11px] py-1 px-2.5 text-red-700 hover:bg-red-100 dark:hover:bg-red-950 font-bold cursor-pointer"
          >
            Hapus Tabel
          </button>
        </div>
      )}

      {/* =========================================================================
          CENTER DOCUMENT PAPER CANVAS VIEW (A4 / F4)
          ========================================================================= */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-[#f0f4f9] dark:bg-[#0e131b]"
          onClick={() => {
            setShowTextColorPicker(false);
            setShowHighlightColorPicker(false);
            setShowInsertMenu(false);
            setShowLineSpacingMenu(false);
            setShowTablePicker(false);
          }}
        >
          <div
            className="transition-transform duration-150 origin-top flex flex-col items-center"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* The Document Paper Sheet (Authentic Google Docs Paginated Canvas) */}
            <div
              className="doc-page-canvas my-3 transition-all duration-150"
              data-papersize={paperSize}
              style={{
                width: PAPER_CONFIG[paperSize].width,
                minHeight: paperMinHeight,
                padding: '72px 72px 96px 72px',
                lineHeight: currentLineSpacing,
                fontFamily: currentFontFamily,
              }}
            >
              <EditorContent editor={editor} className="tiptap-editor-wrapper flex-1 flex flex-col" />
            </div>
          </div>
        </div>

        {/* Sidebar Komentar Kolaborasi */}
        <CommentsSidebar
          isOpen={showCommentsSidebar}
          onClose={() => setShowCommentsSidebar(false)}
          comments={comments}
          selectedText={getSelectedText()}
          onAddComment={(text, quoted) => addCommentToDocument(doc.id, text, quoted)}
          onResolveComment={(cid) => resolveComment(doc.id, cid)}
          onDeleteComment={(cid) => deleteComment(doc.id, cid)}
        />
      </div>

      {/* =========================================================================
          DOCUMENT STATUS & METRICS FOOTER BAR
          ========================================================================= */}
      <div className="h-8 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 select-none z-20">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            {wordCount} Kata
          </span>
          <span>•</span>
          <span>{charCount} Karakter</span>
          <span>•</span>
          <span className="bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded text-[10px] font-bold">
            {pageCount} Halaman • Kertas: {paperSize} ({PAPER_CONFIG[paperSize].desc})
          </span>
          <span>•</span>
          <span>Spasi: {currentLineSpacing}x</span>
        </div>

        <div className="flex items-center gap-4">
          <span>Skala: {zoom}%</span>
          <span>•</span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <Check size={11} /> Tersimpan Otomatis
          </span>
        </div>
      </div>

      {/* =========================================================================
          MODALS: LINK, IMAGE, & EXTENDED INSERT MODALS
          ========================================================================= */}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Sisipkan Tautan (Hyperlink)</h3>
              <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">URL Tujuan:</label>
              <input
                type="url"
                placeholder="https://contoh.com atau https://docs.google.com/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                className="input text-xs"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowLinkModal(false)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
              <button onClick={handleInsertLink} className="btn-primary text-xs py-1.5 px-4">Terapkan Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal (Local Upload & URL) */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">Sisipkan Gambar</h3>
              <button onClick={() => setShowImageModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLocalImageUpload}
              accept="image/*"
              className="hidden"
            />

            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-4 border-2 border-dashed border-primary-300 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-xl text-center cursor-pointer transition-colors"
              >
                <FileDown size={24} className="mx-auto mb-1 text-primary-600" />
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Upload dari Komputer Anda</p>
                <p className="text-[11px] text-gray-400">Pilih file PNG, JPG, GIF, WebP</p>
              </button>

              <div className="relative text-center my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
                <span className="relative bg-white dark:bg-gray-900 px-2 text-[10px] text-gray-400 uppercase">Atau tautan URL</span>
              </div>

              <div>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInsertImageUrl()}
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowImageModal(false)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
              <button onClick={handleInsertImageUrl} disabled={!imageUrl.trim()} className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
                Sisipkan Gambar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals for Insert menu */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onInsert={(html) => editor?.chain().focus().insertContent(html).run()}
      />

      <CanvasDrawingModal
        isOpen={showCanvasModal}
        onClose={() => setShowCanvasModal(false)}
        onInsert={(html) => editor?.chain().focus().insertContent(html).run()}
      />

      <SymbolPickerModal
        isOpen={showSymbolModal}
        onClose={() => setShowSymbolModal(false)}
        onInsert={(symbol) => editor?.chain().focus().insertContent(symbol).run()}
      />

      <EquationModal
        isOpen={showEquationModal}
        onClose={() => setShowEquationModal(false)}
        onInsert={(html) => editor?.chain().focus().insertContent(html).run()}
      />

      <DiagramModal
        isOpen={showDiagramModal}
        onClose={() => setShowDiagramModal(false)}
        onInsert={(html) => editor?.chain().focus().insertContent(html).run()}
      />

      <SmartChipsModal
        isOpen={showSmartChipsModal}
        onClose={() => setShowSmartChipsModal(false)}
        onInsert={(html) => editor?.chain().focus().insertContent(html).run()}
      />

      <BuildingBlocksModal
        isOpen={showBuildingBlocksModal}
        onClose={() => setShowBuildingBlocksModal(false)}
        onInsert={(html) => editor?.chain().focus().insertContent(html).run()}
      />
        </>
      )}
    </div>
  );
};