import { Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface PageBreakOptions {
  HTMLAttributes: Record<string, any>;
  pageHeight: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  draggable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      pageHeight: 960,
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="page-break"]' },
      { tag: 'div.page-break-divider' },
      { tag: 'hr[data-type="page-break"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'page-break',
        class: 'page-break-divider',
        contenteditable: 'false',
        title: 'Pemisah Halaman (Pemisah 0.1 cm)',
      }),
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain, state }) => {
          const { selection } = state;
          const isAtEndOfBlock =
            selection.$from.parentOffset === selection.$from.parent.content.size;

          if (isAtEndOfBlock) {
            return chain()
              .insertContent({ type: this.name })
              .createParagraphNear()
              .focus()
              .run();
          } else {
            return chain()
              .insertContent({ type: this.name })
              .focus()
              .run();
          }
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
      Backspace: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;

        // If the cursor is immediately after a pageBreak node, deleting it pulls content back
        const $pos = selection.$from;
        const nodeBefore = $pos.nodeBefore;
        if (nodeBefore && nodeBefore.type.name === this.name) {
          const deleteFrom = $pos.pos - nodeBefore.nodeSize;
          const deleteTo = $pos.pos;
          return editor.chain().deleteRange({ from: deleteFrom, to: deleteTo }).focus().run();
        }
        return false;
      },
      Delete: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;

        // If the cursor is immediately before a pageBreak node
        const $pos = selection.$from;
        const nodeAfter = $pos.nodeAfter;
        if (nodeAfter && nodeAfter.type.name === this.name) {
          const deleteFrom = $pos.pos;
          const deleteTo = $pos.pos + nodeAfter.nodeSize;
          return editor.chain().deleteRange({ from: deleteFrom, to: deleteTo }).focus().run();
        }
        return false;
      },
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        if (!selection.empty) return false;

        try {
          const dom = editor.view.dom;
          const coords = editor.view.coordsAtPos(selection.from);
          const domRect = dom.getBoundingClientRect();

          // Current cursor vertical position relative to editor top
          const cursorRelativeY = coords.bottom - domRect.top;

          // Count how many page breaks exist before the cursor
          let pageBreaksBefore = 0;
          editor.state.doc.nodesBetween(0, selection.from, (node) => {
            if (node.type.name === 'pageBreak') {
              pageBreaksBefore++;
            }
          });

          // Check canvas paper size
          const canvas = dom.closest('.doc-page-canvas') as HTMLElement | null;
          const isF4 = canvas?.dataset.papersize === 'F4' || canvas?.style.width.includes('812');
          const usablePageHeight = isF4 ? 1080 : (this.options.pageHeight || 960);

          const singlePageTotalSpan = usablePageHeight + 4; // page content + 0.1cm divider gap
          const currentSheetOffset = cursorRelativeY - (pageBreaksBefore * singlePageTotalSpan);

          // If cursor is at or near the bottom boundary of the current page (within 40px)
          if (currentSheetOffset >= usablePageHeight - 40) {
            return editor.commands.setPageBreak();
          }
        } catch {
          return false;
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: new PluginKey('autoPageSpillPlugin'),
        view(editorView) {
          let debounceTimer: ReturnType<typeof setTimeout> | null = null;
          let isSpilling = false;

          const checkOverflowAndSpill = () => {
            if (isSpilling) return;
            const { state } = editorView;
            const { selection } = state;
            const dom = editorView.dom;

            try {
              const domRect = dom.getBoundingClientRect();
              const canvas = dom.closest('.doc-page-canvas') as HTMLElement | null;
              const isF4 = canvas?.dataset.papersize === 'F4' || canvas?.style.width.includes('812');
              const usablePageHeight = isF4 ? 1080 : (extension.options.pageHeight || 960);
              const singlePageTotalSpan = usablePageHeight + 4; // 0.1cm divider gap

              // A. REVERSE CHECK (AUTO CONTRACT ON BACKSPACE / CONTENT DELETION):
              // If there are page breaks in the document, check if following page content actually fits in preceding page!
              const pageBreakPositions: { pos: number; nodeSize: number }[] = [];
              state.doc.descendants((node, pos) => {
                if (node.type.name === extension.name) {
                  pageBreakPositions.push({ pos, nodeSize: node.nodeSize });
                }
              });

              if (pageBreakPositions.length > 0) {
                // Check if total editor height has shrunk below what requires all these pages
                const totalDocHeight = dom.scrollHeight || domRect.height;
                const totalPageCapacity = pageBreakPositions.length * singlePageTotalSpan;
                
                // If total document height is significantly less than the total capacity of previous pages,
                // or if content after the last page break has been deleted/shortened:
                const lastBreak = pageBreakPositions[pageBreakPositions.length - 1];
                const textAfterLastBreak = state.doc.textBetween(lastBreak.pos + lastBreak.nodeSize, state.doc.content.size, ' ').trim();
                
                if (totalDocHeight <= totalPageCapacity - 120 || textAfterLastBreak.length === 0) {
                  isSpilling = true;
                  extension.editor
                    .chain()
                    .deleteRange({ from: lastBreak.pos, to: lastBreak.pos + lastBreak.nodeSize })
                    .run();
                  setTimeout(() => { isSpilling = false; }, 150);
                  return;
                }
              }

              // 1. CHECK ACTIVE CURSOR POSITION (DURING CONTINUOUS TYPING)
              if (editorView.hasFocus() && selection.empty) {
                const coords = editorView.coordsAtPos(selection.from);
                const cursorRelativeY = coords.bottom - domRect.top;

                let pageBreaksBefore = 0;
                state.doc.nodesBetween(0, selection.from, (node) => {
                  if (node.type.name === 'pageBreak') {
                    pageBreaksBefore++;
                  }
                });

                const currentSheetOffset = cursorRelativeY - (pageBreaksBefore * singlePageTotalSpan);

                // If typed writing crosses the bottom boundary of the current paper!
                if (currentSheetOffset > usablePageHeight + 5) {
                  isSpilling = true;
                  extension.editor.commands.setPageBreak();
                  setTimeout(() => { isSpilling = false; }, 150);
                  return;
                }
              }

              // 2. CHECK BLOCK LEVEL OVERFLOW (FOR PASTED CONTENT OR LONG PARAGRAPHS)
              // NOTE: For tables, let them flow naturally across pages without forcing whole table displacement
              const children = Array.from(dom.children) as HTMLElement[];
              let currentSheetStart = 0;
              let pageBreaksCount = 0;

              for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child.getAttribute('data-type') === 'page-break') {
                  const childRect = child.getBoundingClientRect();
                  currentSheetStart = childRect.bottom - domRect.top;
                  pageBreaksCount++;
                  continue;
                }

                // If child is a table or contains a table, user requested:
                // "untuk bentuk tabel biarkan saja dia terpotong menjadi dua dipage sebelumnya dan selanjutnya"
                const isTableElement = child.tagName.toLowerCase() === 'table' || child.querySelector('table');
                if (isTableElement) {
                  // Tables are allowed to span across pages continuously without being pushed as a whole block
                  continue;
                }

                const childRect = child.getBoundingClientRect();
                const childBottom = childRect.bottom - domRect.top;
                const offsetOnSheet = childBottom - currentSheetStart;

                // If this non-table block overflows past the bottom of the current sheet
                if (offsetOnSheet > usablePageHeight + 25 && i > 0) {
                  const childTop = childRect.top - domRect.top;
                  const startsOnPreviousPart = (childTop - currentSheetStart) < usablePageHeight;

                  try {
                    isSpilling = true;

                    // If a multi-line paragraph started on this page and overflowed the bottom:
                    if (startsOnPreviousPart && child.tagName.toLowerCase() === 'p') {
                      // Find where the page boundary cuts into this element
                      const boundaryY = domRect.top + currentSheetStart + usablePageHeight;
                      const splitCoord = editorView.posAtCoords({
                        left: domRect.left + 80,
                        top: boundaryY,
                      });

                      if (splitCoord && splitCoord.pos > 0) {
                        extension.editor
                          .chain()
                          .insertContentAt(splitCoord.pos, { type: extension.name })
                          .focus()
                          .run();
                        setTimeout(() => { isSpilling = false; }, 150);
                        return;
                      }
                    }

                    // Otherwise, move this whole block to the next page
                    const blockPos = editorView.posAtDOM(child, 0);
                    if (blockPos > 0) {
                      extension.editor
                        .chain()
                        .insertContentAt(blockPos, { type: extension.name })
                        .run();
                      setTimeout(() => { isSpilling = false; }, 150);
                      return;
                    }
                  } catch {
                    isSpilling = false;
                  }
                  break;
                }
              }
            } catch {
              isSpilling = false;
            }
          };

          return {
            update(view, prevState) {
              if (
                view.state.doc !== prevState.doc ||
                view.state.selection !== prevState.selection
              ) {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(checkOverflowAndSpill, 100);
              }
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
            },
          };
        },
      }),
    ];
  },
});
