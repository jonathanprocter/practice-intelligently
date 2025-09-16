declare module '@neondatabase/serverless';
declare module 'mammoth';
declare module 'xlsx';
declare module 'sharp';
declare module 'csv-parser';
declare module 'pdfjs-dist/legacy/build/pdf.mjs';
declare module 'adm-zip';
declare module 'pdf-parse';
declare module '@sendgrid/mail';
declare module '@notionhq/client';
declare module 'compression';
declare module 'ws';
declare module 'pg';

interface SessionData {
  id: string;
  date: Date;
  content: string;
  clientId: string | null;
  therapistId: string | null;
  createdAt: Date | null;
  [key: string]: any;
}
