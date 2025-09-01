#!/usr/bin/env node

/**
 * One-time cleanup script for orphaned files
 * Run this to clean up existing orphaned upload files
 */

import fs from 'fs/promises';
import path from 'path';
import { pool } from '../server/db';

interface CleanupResult {
  directory: string;
  filesChecked: number;
  filesDeleted: number;
  spaceFreed: number; // in bytes
  errors: string[];
}

class OrphanedFileCleanup {
  private results: CleanupResult[] = [];
  
  async cleanup() {
    console.log('🧹 Starting orphaned file cleanup...\n');
    
    // Directories to clean
    const directories = [
      { path: 'uploads', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
      { path: 'temp_uploads', maxAge: 60 * 60 * 1000 }, // 1 hour
      { path: 'attached_assets', maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days for assets
    ];

    for (const dir of directories) {
      await this.cleanDirectory(dir.path, dir.maxAge);
    }

    // Clean up database references to deleted files
    await this.cleanDatabaseReferences();

    // Print summary
    this.printSummary();
  }

  private async cleanDirectory(dirPath: string, maxAge: number) {
    const fullPath = path.join(process.cwd(), dirPath);
    const result: CleanupResult = {
      directory: dirPath,
      filesChecked: 0,
      filesDeleted: 0,
      spaceFreed: 0,
      errors: []
    };

    try {
      // Check if directory exists
      try {
        await fs.access(fullPath);
      } catch {
        console.log(`📁 Directory ${dirPath} does not exist, skipping...`);
        return;
      }

      const files = await fs.readdir(fullPath);
      const now = Date.now();

      console.log(`📂 Checking ${files.length} files in ${dirPath}...`);

      for (const file of files) {
        result.filesChecked++;
        const filePath = path.join(fullPath, file);
        
        try {
          const stats = await fs.stat(filePath);
          
          // Skip directories
          if (stats.isDirectory()) {
            continue;
          }

          const fileAge = now - stats.mtimeMs;
          
          // Check if file should be deleted
          if (fileAge > maxAge) {
            // Check if file is referenced in database before deleting
            const isReferenced = await this.isFileReferenced(file);
            
            if (!isReferenced) {
              result.spaceFreed += stats.size;
              await fs.unlink(filePath);
              result.filesDeleted++;
              console.log(`  ✅ Deleted: ${file} (${this.formatSize(stats.size)}, ${this.formatAge(fileAge)} old)`);
            } else {
              console.log(`  ⚠️  Kept: ${file} (referenced in database)`);
            }
          }
        } catch (error) {
          result.errors.push(`Error processing ${file}: ${error.message}`);
        }
      }
    } catch (error) {
      result.errors.push(`Error accessing directory: ${error.message}`);
    }

    this.results.push(result);
  }

  private async isFileReferenced(filename: string): Promise<boolean> {
    try {
      // Check if file is referenced in documents table
      const docResult = await pool.query(
        `SELECT id FROM documents 
         WHERE file_name = $1 OR original_name = $1 OR file_path LIKE $2
         LIMIT 1`,
        [filename, `%${filename}%`]
      );

      if (docResult.rows.length > 0) {
        return true;
      }

      // Check if file is referenced in session_notes
      const noteResult = await pool.query(
        `SELECT id FROM session_notes 
         WHERE content LIKE $1 OR metadata::text LIKE $1
         LIMIT 1`,
        [`%${filename}%`]
      );

      return noteResult.rows.length > 0;
    } catch (error) {
      console.error(`Error checking database reference for ${filename}:`, error);
      // Err on the side of caution - don't delete if we can't check
      return true;
    }
  }

  private async cleanDatabaseReferences() {
    console.log('\n🗄️  Cleaning database references...');
    
    try {
      // Find documents with missing files
      const result = await pool.query(`
        UPDATE documents 
        SET metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{file_missing}',
          'true'::jsonb
        )
        WHERE file_path IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM pg_stat_file(file_path)
        )
        RETURNING id, file_name
      `);

      if (result.rows.length > 0) {
        console.log(`  ⚠️  Marked ${result.rows.length} documents with missing files`);
      }
    } catch (error) {
      console.error('Error cleaning database references:', error);
    }
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  private formatAge(ms: number): string {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLEANUP SUMMARY');
    console.log('='.repeat(60));

    let totalChecked = 0;
    let totalDeleted = 0;
    let totalSpaceFreed = 0;
    let totalErrors = 0;

    for (const result of this.results) {
      totalChecked += result.filesChecked;
      totalDeleted += result.filesDeleted;
      totalSpaceFreed += result.spaceFreed;
      totalErrors += result.errors.length;

      console.log(`\n📁 ${result.directory}:`);
      console.log(`   Files checked: ${result.filesChecked}`);
      console.log(`   Files deleted: ${result.filesDeleted}`);
      console.log(`   Space freed: ${this.formatSize(result.spaceFreed)}`);
      
      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach(err => console.log(`      - ${err}`));
      }
    }

    console.log('\n' + '-'.repeat(60));
    console.log('📈 TOTALS:');
    console.log(`   Total files checked: ${totalChecked}`);
    console.log(`   Total files deleted: ${totalDeleted}`);
    console.log(`   Total space freed: ${this.formatSize(totalSpaceFreed)}`);
    
    if (totalErrors > 0) {
      console.log(`   ⚠️  Total errors: ${totalErrors}`);
    }

    console.log('='.repeat(60));
    console.log('\n✅ Cleanup complete!\n');
  }
}

// Run the cleanup
async function main() {
  const cleanup = new OrphanedFileCleanup();
  
  try {
    await cleanup.cleanup();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { OrphanedFileCleanup };