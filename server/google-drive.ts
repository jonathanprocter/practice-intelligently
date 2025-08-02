import { google } from 'googleapis';
import { simpleOAuth } from './oauth-simple';

export class GoogleDriveService {
    private drive: any;

    constructor() {
        // We'll use the existing OAuth client from the calendar integration
        this.drive = null;
    }

    private async initializeDrive() {
        if (!this.drive) {
            // Check if we have OAuth credentials from the calendar integration
            if (!simpleOAuth.isConnected()) {
                throw new Error('Google OAuth not connected. Please connect your Google Calendar first.');
            }
            
            // Get the OAuth client and add Drive scope
            const oauth2Client = (simpleOAuth as any).oauth2Client;
            this.drive = google.drive({ version: 'v3', auth: oauth2Client });
        }
    }

    async listFiles(query?: string) {
        await this.initializeDrive();
        
        try {
            const response = await this.drive.files.list({
                q: query || "trashed=false",
                fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, thumbnailLink)',
                pageSize: 100,
                orderBy: 'modifiedTime desc'
            });

            return response.data.files || [];
        } catch (error: any) {
            console.error('Error listing Drive files:', error);
            if (error.code === 401 || error.code === 403) {
                throw new Error('Drive access not authorized. Please re-authenticate with Google and ensure Drive access is granted.');
            }
            throw error;
        }
    }

    async getFileContent(fileId: string) {
        await this.initializeDrive();
        
        try {
            // First get file metadata
            const metadata = await this.drive.files.get({
                fileId,
                fields: 'id, name, mimeType, size'
            });

            // Get file content based on type
            if (metadata.data.mimeType?.includes('text/') || 
                metadata.data.mimeType?.includes('application/json')) {
                // For text files, get the raw content
                const content = await this.drive.files.get({
                    fileId,
                    alt: 'media'
                });
                
                return {
                    metadata: metadata.data,
                    content: content.data
                };
            } else if (metadata.data.mimeType?.includes('application/vnd.google-apps.document')) {
                // For Google Docs, export as plain text
                const content = await this.drive.files.export({
                    fileId,
                    mimeType: 'text/plain'
                });
                
                return {
                    metadata: metadata.data,
                    content: content.data
                };
            } else if (metadata.data.mimeType?.includes('application/vnd.google-apps.spreadsheet')) {
                // For Google Sheets, export as CSV
                const content = await this.drive.files.export({
                    fileId,
                    mimeType: 'text/csv'
                });
                
                return {
                    metadata: metadata.data,
                    content: content.data
                };
            } else {
                // For other files, return metadata only
                return {
                    metadata: metadata.data,
                    content: 'Binary file - content not accessible via text preview'
                };
            }
        } catch (error: any) {
            console.error(`Error getting file content for ${fileId}:`, error);
            if (error.code === 401 || error.code === 403) {
                throw new Error('Drive access not authorized. Please re-authenticate with Google.');
            }
            throw error;
        }
    }

    async searchFiles(query: string) {
        await this.initializeDrive();
        
        try {
            const searchQuery = `name contains '${query}' or fullText contains '${query}'`;
            const response = await this.drive.files.list({
                q: searchQuery + " and trashed=false",
                fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)',
                pageSize: 50,
                orderBy: 'relevance desc'
            });

            return response.data.files || [];
        } catch (error: any) {
            console.error('Error searching Drive files:', error);
            if (error.code === 401 || error.code === 403) {
                throw new Error('Drive access not authorized. Please re-authenticate with Google.');
            }
            throw error;
        }
    }

    async getFolderContents(folderId: string) {
        await this.initializeDrive();
        
        try {
            const response = await this.drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)',
                pageSize: 100,
                orderBy: 'name'
            });

            return response.data.files || [];
        } catch (error: any) {
            console.error(`Error getting folder contents for ${folderId}:`, error);
            if (error.code === 401 || error.code === 403) {
                throw new Error('Drive access not authorized. Please re-authenticate with Google.');
            }
            throw error;
        }
    }
}

export const googleDriveService = new GoogleDriveService();