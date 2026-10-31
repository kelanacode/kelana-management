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
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { PageBreak } from '../components/notes/PageBreakExtension';

import {
  Plus, ChevronRight, ChevronDown, Trash2, FileText, Search,
  Bold, Italic, UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3,
  Highlighter, CheckSquare,
  Undo2, Redo2, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, MessageSquare, RemoveFormatting,
  Indent, Outdent, ZoomIn, ZoomOut, Sparkles,
  PenTool, Paintbrush, Calculator, Network,
  Tag as ChipIcon, Layers, FileDown, Eye, Check,
  Minus, FileText as PaperIcon, X, FilePlus, Printer
} from 'lucide-react';

import { useWikiStore } from '../stores/wikiStore';
import { WikiPage, NoteComment } from '../types';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

import { SignatureModal } from '../components/notes/SignatureModal';
import { CanvasDrawingModal } from '../components/notes/CanvasDrawingModal';
import { SymbolPickerModal } from '../components/notes/SymbolPickerModal';
import { EquationModal } from '../components/notes/EquationModal';
import { DiagramModal } from '../components/notes/DiagramModal';
import { SmartChipsModal } from '../components/notes/SmartChipsModal';
import { BuildingBlocksModal } from '../components/notes/BuildingBlocksModal';
import { CommentsSidebar } from '../components/notes/CommentsSidebar';
import { TableGridPicker } from '../components/notes/TableGridPicker';
import { printDocumentCanvas } from '../utils/printHelper';

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

// ---- Wiki Tree Node ----
const WikiTreeNode: React.FC<{
  page: WikiPage;
  allPages: WikiPage[];
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
}> = ({ page, allPages, level, selectedId, onSelect, onAddChild, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const children = allPages.filter((p) => p.parentId === page.id);

  return (
    <div>
      <div
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl cursor-pointer group transition-colors ${
          page.id === selectedId
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-bold shadow-xs'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }`}
        style={{ paddingLeft: `${10 + level * 14}px` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          {children.length > 0 ? (
            expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-2" />
          )}
        </button>
        <span className="mr-1 text-sm">{page.emoji}</span>
        <span onClick={() => onSelect(page.id)} className="flex-1 text-xs truncate">
          {page.title}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onAddChild(page.id)}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-primary-600"
            title="Tambah subhalaman"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={() => onDelete(page.id)}
            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500"
            title="Hapus halaman"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {expanded &&
        children.map((child) => (
          <WikiTreeNode
            key={child.id}
            page={child}
            allPages={allPages}
            level={level + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        ))}
    </div>
  );
};

export const Wiki: React.FC = () => {
  const {
    pages,
    selectedPageId,
    selectPage,
    addPage,
    updatePage,
    deletePage,
    addCommentToPage,
    resolveComment,
    deleteComment
  } = useWikiStore();

  const selectedPage = pages.find((p) => p.id === selectedPageId) || pages[0];

  // Search & Navigation
  const [searchWiki, setSearchWiki] = useState('');

  // Editor states
  const [, setSelectionVersion] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [paperSize, setPaperSize] = useState<PaperSize>('A4');
  const [currentFontSize, setCurrentFontSize] = useState('11');
  const [currentFontFamily, setCurrentFontFamily] = useState('Inter, sans-serif');
  const [lineSpacing, setLineSpacing] = useState('1.6');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [showSpacingMenu, setShowSpacingMenu] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);

  // Link & Image states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Insert Modals state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const [showSymbolModal, setShowSymbolModal] = useState(false);
  const [showEquationModal, setShowEquationModal] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [showSmartChipsModal, setShowSmartChipsModal] = useState(false);
  const [showBuildingBlocksModal, setShowBuildingBlocksModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Mulai menulis dokumen panduan wiki berstandar Google Docs...' }),
      CustomTextStyle,
      Color,
      FontFamily,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      PageBreak.configure({ pageHeight: 960 }),
    ],
    content: selectedPage?.content ?? '',
    onSelectionUpdate: () => {
      setSelectionVersion((v) => v + 1);
    },
    onTransaction: () => {
      setSelectionVersion((v) => v + 1);
    },
    onUpdate: ({ editor }) => {
      if (selectedPageId) {
        updatePage(selectedPageId, { content: editor.getHTML() });
      }
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror tiptap-editor focus:outline-none min-h-[820px]',
      },
    },
  });

  useEffect(() => {
    if (editor && selectedPage) {
      if (editor.getHTML() !== selectedPage.content) {
        editor.commands.setContent(selectedPage.content ?? '');
      }
      if (selectedPage.paperSize) {
        setPaperSize(selectedPage.paperSize);
      }
    }
  }, [selectedPageId]);

  const handlePaperSizeChange = (size: PaperSize) => {
    setPaperSize(size);
    if (selectedPageId) {
      updatePage(selectedPageId, { paperSize: size });
    }
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
    if (editor.isActive('table') || editor.can().addRowBefore()) {
      editor.chain().focus().addRowBefore().run();
    } else {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  const handleInsertTableColAfter = () => {
    if (!editor) return;
    if (editor.isActive('table') || editor.can().addColumnAfter()) {
      editor.chain().focus().addColumnAfter().run();
    }
  };

  const handleInsertTableColBefore = () => {
    if (!editor) return;
    if (editor.isActive('table') || editor.can().addColumnBefore()) {
      editor.chain().focus().addColumnBefore().run();
    }
  };

  const handleDeleteTableRow = () => {
    if (!editor) return;
    if (editor.isActive('table') || editor.can().deleteRow()) {
      editor.chain().focus().deleteRow().run();
    }
  };

  const handleDeleteTableCol = () => {
    if (!editor) return;
    if (editor.isActive('table') || editor.can().deleteColumn()) {
      editor.chain().focus().deleteColumn().run();
    }
  };

  const handleDeleteEntireTable = () => {
    if (!editor) return;
    if (editor.isActive('table') || editor.can().deleteTable()) {
      editor.chain().focus().deleteTable().run();
    }
  };

  const handleInsertHorizontalRule = () => {
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
  };

  // Word count & stats
  const textContent = editor?.getText() || '';
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;

  // Page count (count pageBreak nodes + 1)
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

  // Breadcrumb helper
  const getBreadcrumb = (pageId: string): WikiPage[] => {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return [];
    if (!page.parentId) return [page];
    return [...getBreadcrumb(page.parentId), page];
  };

  const breadcrumb = selectedPage ? getBreadcrumb(selectedPage.id) : [];

  // Filtered root pages
  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(searchWiki.toLowerCase())
  );
  const rootPages = searchWiki.trim()
    ? filteredPages
    : pages.filter((p) => !p.parentId);

  const handlePrint = () => {
    printDocumentCanvas(selectedPage?.title || 'Wiki');
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-100 dark:bg-gray-950">
      {/* Wiki Tree Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col z-10">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Basis Pengetahuan (Wiki)
            </h3>
            <button
              onClick={() => addPage('Halaman Baru')}
              className="p-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-primary-600 transition-colors"
              title="Tambah halaman baru"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchWiki}
              onChange={(e) => setSearchWiki(e.target.value)}
              placeholder="Cari artikel wiki..."
              className="input pl-7 text-xs py-1.5"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {rootPages.map((page) => (
            <WikiTreeNode
              key={page.id}
              page={page}
              allPages={pages}
              level={0}
              selectedId={selectedPage?.id || null}
              onSelect={selectPage}
              onAddChild={(parentId) => addPage('Subhalaman Baru', parentId)}
              onDelete={deletePage}
            />
          ))}
          {rootPages.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Tidak ada halaman yang cocok</p>
          )}
        </div>

        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => addPage('Halaman Baru')}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors cursor-pointer"
          >
            <Plus size={14} /> Halaman Baru
          </button>
        </div>
      </div>

      {/* Main Wiki Document Editor */}
      {selectedPage ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100/70 dark:bg-gray-950/90">
          {/* Header Bar with Breadcrumb, Title & Meta */}
          <div className="px-6 py-2.5 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              {breadcrumb.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i > 0 && <ChevronRight size={11} className="text-gray-400" />}
                  <button
                    onClick={() => selectPage(p.id)}
                    className={`hover:text-primary-600 transition-colors ${
                      p.id === selectedPage.id ? 'text-primary-600 dark:text-primary-400 font-bold' : ''
                    }`}
                  >
                    {p.emoji} {p.title}
                  </button>
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">
                Diperbarui: {format(parseISO(selectedPage.updatedAt), 'd MMM yyyy', { locale: idLocale })}
              </span>
              <button
                onClick={handlePrint}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                title="Cetak Dokumen Wiki (Ctrl+P)"
              >
                <Printer size={12} /> Cetak
              </button>
              <button
                onClick={() => addPage('Subhalaman Baru', selectedPage.id)}
                className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                title="Tambah subhalaman di bawah halaman ini"
              >
                <Plus size={12} /> Subhalaman
              </button>
              <button
                onClick={() => deletePage(selectedPage.id)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Hapus halaman wiki"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Title Editor Header */}
          <div className="px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
            <span className="text-2xl">{selectedPage.emoji}</span>
            <input
              value={selectedPage.title}
              onChange={(e) => updatePage(selectedPage.id, { title: e.target.value })}
              className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none flex-1 placeholder:text-gray-400"
              placeholder="Judul halaman wiki..."
            />
          </div>

          {/* =========================================================================
             WORD & GOOGLE DOCS STYLE RIBBON TOOLBAR (EXACTLY LIKE NOTES)
             ========================================================================= */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-1.5 flex items-center gap-1 flex-wrap text-xs shadow-xs z-20">
            {/* Undo & Redo */}
            <button
              onClick={handlePrint}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 mr-1"
              title="Cetak Halaman (Ctrl+P)"
            >
              <Printer size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().undo().run()}
              disabled={!editor?.can().undo()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 text-gray-700 dark:text-gray-300"
              title="Urungkan (Ctrl+Z)"
            >
              <Undo2 size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().redo().run()}
              disabled={!editor?.can().redo()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 text-gray-700 dark:text-gray-300"
              title="Ulangi (Ctrl+Y)"
            >
              <Redo2 size={14} />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Zoom Selector */}
            <div className="flex items-center gap-0.5 bg-gray-50 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                title="Perkecil Tampilan"
              >
                <ZoomOut size={13} />
              </button>
              <select
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="bg-transparent text-[11px] font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
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
                onClick={() => setZoom(Math.min(200, zoom + 10))}
                className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                title="Perbesar Tampilan"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {/* Pilihan Ukuran Kertas: A4 & F4 Saja */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase px-1">Kertas:</span>
              <button
                type="button"
                onClick={() => handlePaperSizeChange('A4')}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Ukuran Kertas Standar A4 (210 × 297 mm)"
              >
                A4
              </button>
              <button
                type="button"
                onClick={() => handlePaperSizeChange('F4')}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  paperSize === 'F4'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title="Ukuran Kertas Standar F4 / Folio (215 × 330 mm)"
              >
                F4 (Folio)
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Gaya Teks (Normal, H1, H2, H3) */}
            <select
              value={
                editor?.isActive('heading', { level: 1 })
                  ? 'h1'
                  : editor?.isActive('heading', { level: 2 })
                  ? 'h2'
                  : editor?.isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
              }
              onChange={(e) => {
                const val = e.target.value;
                if (!editor) return;
                if (val === 'p') editor.chain().focus().setParagraph().run();
                else if (val === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                else if (val === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                else if (val === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
              }}
              className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              title="Gaya Teks & Paragraf"
            >
              <option value="p">Teks Normal</option>
              <option value="h1">Judul 1 (H1)</option>
              <option value="h2">Judul 2 (H2)</option>
              <option value="h3">Judul 3 (H3)</option>
            </select>

            {/* Font Family Selector */}
            <select
              value={currentFontFamily}
              onChange={(e) => handleFontFamilyChange(e.target.value)}
              className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 outline-none cursor-pointer max-w-[120px] truncate"
              title="Pilihan Font"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Font Size Stepper & Dropdown */}
            <div className="flex items-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
              <button
                onClick={() => changeFontSizeStep(-1)}
                className="px-1.5 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-bold"
                title="Kecilkan Font"
              >
                -
              </button>
              <select
                value={currentFontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="bg-transparent text-xs font-semibold text-center outline-none cursor-pointer w-10"
                title="Ukuran Font"
              >
                {FONT_SIZES.map((sz) => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
              <button
                onClick={() => changeFontSizeStep(1)}
                className="px-1.5 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-xs font-bold"
                title="Besarkan Font"
              >
                +
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Bold, Italic, Underline, Strikethrough */}
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('bold')
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Tebalkan (Ctrl+B)"
            >
              <Bold size={15} />
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('italic')
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Miringkan (Ctrl+I)"
            >
              <Italic size={15} />
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('underline')
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Garis Bawah (Ctrl+U)"
            >
              <UnderlineIcon size={15} />
            </button>

            <button
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('strike')
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Coret Teks (Strikethrough)"
            >
              <Strikethrough size={15} />
            </button>

            {/* Warna Teks */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                }}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-0.5"
                title="Warna Teks"
              >
                <span className="font-bold border-b-2 border-red-500 text-xs">A</span>
                <ChevronDown size={10} />
              </button>

              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 grid grid-cols-5 gap-1.5 w-36">
                  {TEXT_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() => {
                        editor?.chain().focus().setColor(col).run();
                        setShowColorPicker(false);
                      }}
                      className="w-5 h-5 rounded-full border border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Warna Sorotan (Highlight) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                }}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center gap-0.5"
                title="Warna Sorotan Teks"
              >
                <Highlighter size={14} className="text-amber-500" />
                <ChevronDown size={10} />
              </button>

              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 z-50 grid grid-cols-3 gap-1.5 w-40">
                  {HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.color}
                      onClick={() => {
                        editor?.chain().focus().setHighlight({ color: h.color }).run();
                        setShowHighlightPicker(false);
                      }}
                      className="w-full h-6 rounded border border-gray-200 hover:scale-105 transition-transform text-[9px] font-semibold text-gray-800 flex items-center justify-center"
                      style={{ backgroundColor: h.color }}
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sisipkan Link */}
            <button
              onClick={() => {
                const prevUrl = editor?.getAttributes('link').href || '';
                setLinkUrl(prevUrl);
                setShowLinkModal(true);
              }}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('link')
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Sisipkan Tautan / Link"
            >
              <LinkIcon size={14} />
            </button>

            {/* Komentar Google Docs */}
            <button
              onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
              className={`p-1.5 rounded transition-colors relative ${
                showCommentsSidebar
                  ? 'bg-primary-100 text-primary-700 font-bold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Buka Komentar Dokumen (Google Docs Style)"
            >
              <MessageSquare size={14} />
              {(selectedPage.comments?.filter((c) => !c.resolved).length ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                  {selectedPage.comments?.filter((c) => !c.resolved).length}
                </span>
              )}
            </button>

            {/* Sisipkan Gambar */}
            <button
              onClick={() => setShowImageModal(true)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              title="Sisipkan Gambar"
            >
              <ImageIcon size={14} />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Perataan Teks (Alignment) */}
            <button
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              title="Rata Kiri"
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              title="Rata Tengah"
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              title="Rata Kanan"
            >
              <AlignRight size={14} />
            </button>
            <button
              onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
              className={`p-1.5 rounded ${editor?.isActive({ textAlign: 'justify' }) ? 'bg-gray-200 dark:bg-gray-700 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              title="Rata Kanan-Kiri (Justify)"
            >
              <AlignJustify size={14} />
            </button>

            {/* Jarak Antar Baris (Line Spacing) */}
            <div className="relative">
              <button
                onClick={() => setShowSpacingMenu(!showSpacingMenu)}
                className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 cursor-pointer"
                title="Jarak Antar Baris & Spasi Paragraf"
              >
                <span>Spasi: {lineSpacing}</span>
                <ChevronDown size={10} />
              </button>

              {showSpacingMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1.5 z-50 w-48 text-xs">
                  {['1.0', '1.15', '1.5', '1.6', '2.0'].map((sp) => (
                    <button
                      key={sp}
                      onClick={() => {
                        setLineSpacing(sp);
                        setShowSpacingMenu(false);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between cursor-pointer"
                    >
                      <span>Spasi {sp}</span>
                      {lineSpacing === sp && <Check size={12} className="text-primary-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Checklist */}
            <button
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('taskList') ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Ceklist (Daftar Tugas)"
            >
              <CheckSquare size={14} />
            </button>

            {/* Bullet List */}
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('bulletList') ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Daftar Berbutir (Bullet List)"
            >
              <List size={14} />
            </button>

            {/* Numbered List */}
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${
                editor?.isActive('orderedList') ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
              title="Daftar Bernomor (Numbered List)"
            >
              <ListOrdered size={14} />
            </button>

            {/* Kurangi Inden & Tambah Inden */}
            <button
              onClick={() => (editor?.chain().focus() as any).liftListItem?.('listItem')?.run?.()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              title="Kurangi Inden"
            >
              <Outdent size={14} />
            </button>
            <button
              onClick={() => (editor?.chain().focus() as any).sinkListItem?.('listItem')?.run?.()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              title="Tambah Inden"
            >
              <Indent size={14} />
            </button>

            {/* Hapus Format (Clear Formatting) */}
            <button
              onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              title="Hapus Semua Format"
            >
              <RemoveFormatting size={14} />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

            {/* Google Docs Table Icon & Interactive Grid Picker */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowTablePicker(!showTablePicker);
                  setShowInsertMenu(false);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  editor?.isActive('table') || showTablePicker
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300 dark:ring-blue-800'
                    : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700'
                }`}
                title="Tabel (Sisipkan Tabel bergaya Google Docs dengan Grid Picker)"
              >
                <TableIcon size={14} className={editor?.isActive('table') || showTablePicker ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />
                <span>Tabel</span>
                <ChevronDown size={11} className={editor?.isActive('table') || showTablePicker ? 'text-blue-100' : 'text-gray-400'} />
              </button>

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
            </div>

            {/* Quick Action: + Sisipkan Baris Langsung */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleInsertTableRowAfter();
              }}
              className="flex items-center gap-1 px-2 py-1 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              title="Sisipkan baris baru langsung ke bawah baris tabel saat ini"
            >
              <span>+ Baris</span>
            </button>

            {/* MENU SISIPKAN (Google Docs / Word INSERT MENU) */}
            <div className="relative">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowInsertMenu(!showInsertMenu);
                  setShowTablePicker(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:opacity-95 shadow-xs cursor-pointer"
                title="Buka Menu Sisipkan Lengkap (Word & Google Docs)"
              >
                <Sparkles size={13} />
                <span>+ Sisipkan</span>
                <ChevronDown size={11} />
              </button>

              {showInsertMenu && (
                <div
                  className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 w-64 text-xs animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Menu Sisipkan (Word &amp; GDocs)
                  </div>

                  {/* 1. Tabel */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowTablePicker(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <TableIcon size={15} className="text-blue-500" />
                    <div>
                      <div className="font-semibold">Tabel (Grid Picker)</div>
                      <div className="text-[10px] text-gray-400">Pilih baris × kolom dengan kisi visual</div>
                    </div>
                  </button>

                  {/* 1b. Sisipkan Baris di Bawah */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleInsertTableRowAfter();
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <TableIcon size={15} className="text-indigo-500" />
                    <div>
                      <div className="font-semibold">+ Sisipkan Baris di Bawah</div>
                      <div className="text-[10px] text-gray-400">Tambah baris baru tepat di bawah kursor</div>
                    </div>
                  </button>

                  {/* 1c. Sisipkan Baris di Atas */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleInsertTableRowBefore();
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <TableIcon size={15} className="text-indigo-400" />
                    <div>
                      <div className="font-semibold">+ Sisipkan Baris di Atas</div>
                      <div className="text-[10px] text-gray-400">Tambah baris baru tepat di atas kursor</div>
                    </div>
                  </button>

                  {/* 1d. Garis / Baris Pemisah Horizontal */}
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleInsertHorizontalRule();
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <Minus size={15} className="text-gray-500" />
                    <div>
                      <div className="font-semibold">Garis / Baris Pemisah Horizontal</div>
                      <div className="text-[10px] text-gray-400">Sisipkan garis pembatas horizontal (&lt;hr/&gt;)</div>
                    </div>
                  </button>

                  {/* 2. Gambar */}
                  <button
                    onClick={() => {
                      setShowImageModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <ImageIcon size={15} className="text-emerald-500" />
                    <div>
                      <div className="font-semibold">Gambar</div>
                      <div className="text-[10px] text-gray-400">Upload dari komputer atau masukkan link URL</div>
                    </div>
                  </button>

                  {/* 3. Elemen Penyusun */}
                  <button
                    onClick={() => {
                      setShowBuildingBlocksModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <Layers size={15} className="text-purple-500" />
                    <div>
                      <div className="font-semibold">Elemen Penyusun (Building Blocks)</div>
                      <div className="text-[10px] text-gray-400">Catatan rapat, brief proyek, kotak info</div>
                    </div>
                  </button>

                  {/* 4. Chip Pintar */}
                  <button
                    onClick={() => {
                      setShowSmartChipsModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <ChipIcon size={15} className="text-amber-500" />
                    <div>
                      <div className="font-semibold">Chip Pintar (Smart Chips)</div>
                      <div className="text-[10px] text-gray-400">Chip tanggal, @orang tim, status badge</div>
                    </div>
                  </button>

                  {/* 5. Tanda Tangan Elektronik */}
                  <button
                    onClick={() => {
                      setShowSignatureModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <PenTool size={15} className="text-rose-500" />
                    <div>
                      <div className="font-semibold">Tanda Tangan Elektronik</div>
                      <div className="text-[10px] text-gray-400">Gambar tanda tangan atau ketik e-signature</div>
                    </div>
                  </button>

                  {/* 6. Link */}
                  <button
                    onClick={() => {
                      setShowLinkModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <LinkIcon size={15} className="text-blue-500" />
                    <div>
                      <div className="font-semibold">Tautan Hyperlink</div>
                      <div className="text-[10px] text-gray-400">Tautkan ke web, dokumen, atau referensi</div>
                    </div>
                  </button>

                  {/* 7. Kanvas Lukis */}
                  <button
                    onClick={() => {
                      setShowCanvasModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <Paintbrush size={15} className="text-teal-500" />
                    <div>
                      <div className="font-semibold">Kanvas Lukis (Drawing Pad)</div>
                      <div className="text-[10px] text-gray-400">Coretan bebas, sketsa, dan anotasi grafis</div>
                    </div>
                  </button>

                  {/* 8. Diagram */}
                  <button
                    onClick={() => {
                      setShowDiagramModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <Network size={15} className="text-indigo-500" />
                    <div>
                      <div className="font-semibold">Diagram &amp; Bagan</div>
                      <div className="text-[10px] text-gray-400">Flowchart, SWOT, arsitektur sistem</div>
                    </div>
                  </button>

                  {/* 9. Simbol */}
                  <button
                    onClick={() => {
                      setShowSymbolModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <span className="text-amber-500 font-bold text-sm w-4 text-center">Ω</span>
                    <div>
                      <div className="font-semibold">Simbol &amp; Karakter Khusus</div>
                      <div className="text-[10px] text-gray-400">Mata uang, matematika, panah, Yunani</div>
                    </div>
                  </button>

                  {/* 10. Persamaan */}
                  <button
                    onClick={() => {
                      setShowEquationModal(true);
                      setShowInsertMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/60 flex items-center gap-2.5 text-gray-800 dark:text-gray-200 cursor-pointer"
                  >
                    <Calculator size={15} className="text-orange-500" />
                    <div>
                      <div className="font-semibold">Persamaan Matematika</div>
                      <div className="text-[10px] text-gray-400">Rumus Pythagoras, kuadrat, fraksi</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Contextual Table Controls Bar (Shown automatically when cursor is inside any table) */}
          {editor?.isActive('table') && (
            <div className="bg-blue-50 dark:bg-blue-950/70 border-b border-blue-200 dark:border-blue-800 px-6 py-2 flex items-center gap-2 text-xs flex-wrap z-10 shadow-xs">
              <span className="font-bold text-blue-800 dark:text-blue-200 flex items-center gap-1.5 mr-1">
                <TableIcon size={14} /> Pengaturan Tabel:
              </span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertTableRowAfter();
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-300 dark:border-blue-700 shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                title="Sisipkan baris baru di bawah baris aktif"
              >
                + Sisipkan Baris di Bawah
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertTableRowBefore();
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-700 dark:text-blue-300 font-bold rounded-lg border border-blue-300 dark:border-blue-700 shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                title="Sisipkan baris baru di atas baris aktif"
              >
                + Sisipkan Baris di Atas
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertTableColAfter();
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-700 dark:text-blue-300 font-semibold rounded-lg border border-blue-300 dark:border-blue-700 shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                title="Sisipkan kolom baru di kanan"
              >
                + Kolom di Kanan
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertTableColBefore();
                }}
                className="px-2.5 py-1 bg-white dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-700 dark:text-blue-300 font-semibold rounded-lg border border-blue-300 dark:border-blue-700 shadow-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                title="Sisipkan kolom baru di kiri"
              >
                + Kolom di Kiri
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDeleteTableRow();
                }}
                className="px-2 py-1 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 font-medium rounded-lg border border-red-300 dark:border-red-800 shadow-xs cursor-pointer transition-all"
                title="Hapus baris saat ini"
              >
                Hapus Baris
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDeleteTableCol();
                }}
                className="px-2 py-1 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 font-medium rounded-lg border border-red-300 dark:border-red-800 shadow-xs cursor-pointer transition-all"
                title="Hapus kolom saat ini"
              >
                Hapus Kolom
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleDeleteEntireTable();
                }}
                className="px-2.5 py-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 hover:bg-red-200 font-bold rounded-lg cursor-pointer transition-all ml-auto"
                title="Hapus seluruh tabel"
              >
                Hapus Tabel
              </button>
            </div>
          )}

          {/* Main Document Body + Comments Area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Scrollable Center Paper View (A4 & F4 with Zoom) */}
            <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-[#f0f4f9] dark:bg-[#0e131b]">
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: 'top center',
                  width: PAPER_CONFIG[paperSize].width,
                  minHeight: paperMinHeight,
                  lineHeight: lineSpacing,
                  padding: '72px 72px 96px 72px',
                }}
                className="doc-page-canvas my-3 transition-all duration-150"
                data-papersize={paperSize}
              >
                <EditorContent editor={editor} className="tiptap-editor-wrapper flex-1 flex flex-col" />
              </div>
            </div>

            {/* Comments Sidebar (Google Docs Style) */}
            <CommentsSidebar
              isOpen={showCommentsSidebar}
              onClose={() => setShowCommentsSidebar(false)}
              comments={selectedPage.comments || []}
              selectedText={editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ')}
              onAddComment={(content, selectedText) => {
                addCommentToPage(selectedPage.id, content, selectedText);
              }}
              onResolveComment={(commentId) => resolveComment(selectedPage.id, commentId)}
              onDeleteComment={(commentId) => deleteComment(selectedPage.id, commentId)}
            />
          </div>

          {/* Bottom Document Status Bar */}
          <div className="h-7 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>{wordCount} kata</span>
              <span>•</span>
              <span>{charCount} karakter</span>
              <span>•</span>
              <span className="font-semibold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                <PaperIcon size={12} /> {pageCount} Halaman • Kertas: {PAPER_CONFIG[paperSize].name} ({PAPER_CONFIG[paperSize].desc})
              </span>
              <span>•</span>
              <span>Zoom: {zoom}%</span>
              <span>•</span>
              <span>Spasi: {lineSpacing}</span>
            </div>
            <div>
              <span>Tersimpan otomatis di Wiki Ruang Kelana</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <p className="text-5xl mb-3">📚</p>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Pilih Halaman Wiki atau Buat Halaman Baru</h3>
            <p className="text-xs text-gray-500 mt-1">Dokumentasi perusahaan berstandar Word &amp; Google Docs.</p>
            <button onClick={() => addPage('Halaman Baru')} className="btn-primary mt-4">
              <Plus size={16} /> Buat Halaman Baru
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleLocalImageUpload}
        className="hidden"
      />

      {/* Modal Sisipkan Link */}
      {showLinkModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowLinkModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <LinkIcon size={15} className="text-primary-600" /> Sisipkan Hyperlink (Tautan Web)
              </h3>
              <button onClick={() => setShowLinkModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">URL Tujuan:</label>
              <input
                type="url"
                autoFocus
                placeholder="https://example.com/..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                className="input text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowLinkModal(false)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
              <button onClick={handleInsertLink} className="btn-primary text-xs py-1.5 px-4">Terapkan Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sisipkan Gambar */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-5 border border-gray-200 dark:border-gray-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <ImageIcon size={15} className="text-emerald-600" /> Sisipkan Gambar ke Dokumen Wiki
              </h3>
              <button onClick={() => setShowImageModal(false)}><X size={16} className="text-gray-400" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Pilihan 1: Upload dari Komputer</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 rounded-xl text-xs text-gray-600 dark:text-gray-300 font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileDown size={16} /> Pilih File Gambar...
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                <span className="flex-shrink mx-2 text-[10px] text-gray-400 uppercase">atau</span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Pilihan 2: Masukkan Link Gambar (URL)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInsertImageUrl()}
                  className="input text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowImageModal(false)} className="btn-secondary text-xs py-1.5 px-3">Batal</button>
              <button onClick={handleInsertImageUrl} className="btn-primary text-xs py-1.5 px-4">Sisipkan Gambar</button>
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
    </div>
  );
};
