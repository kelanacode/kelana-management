export interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType: 'folder' | 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'image' | 'archive' | 'other';
  size?: string;
  updatedAt: string;
  url: string;
  author: string;
  division?: string;
  tags?: string[];
  isStarred?: boolean;
}

export interface GoogleDriveConfig {
  isConnected: boolean;
  userEmail: string;
  connectedAt?: string;
  defaultFolderUrl: string;
  autoBackupNotes: boolean;
  autoBackupSalarySlips: boolean;
  sharedWorkspaceFolder: string;
}
