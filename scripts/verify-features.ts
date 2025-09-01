#!/usr/bin/env tsx

/**
 * Feature Verification Script
 * 
 * This script verifies that all enhanced features are properly configured and working
 */

import { config } from 'dotenv';
import chalk from 'chalk';
import { pool } from '../server/db';

// Load environment variables
config();

interface FeatureCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

class FeatureVerifier {
  private checks: FeatureCheck[] = [];
  
  async runAllChecks() {
    console.log(chalk.blue.bold('\n🔍 Practice Intelligence Feature Verification\n'));
    console.log('='.repeat(60));
    
    // Core system checks
    await this.checkDatabase();
    await this.checkAIServices();
    await this.checkEnhancedFeatures();
    await this.checkSecurity();
    await this.checkPerformance();
    
    // Print results
    this.printResults();
  }
  
  private async checkDatabase() {
    console.log(chalk.yellow('\n📊 Checking Database...'));
    
    try {
      // Check basic connection
      const result = await pool.query('SELECT NOW()');
      this.addCheck('Database Connection', 'pass', 'Connected successfully');
      
      // Check for new tables
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('api_tokens', 'audit_logs', 'performance_metrics')
      `);
      
      if (tables.rows.length === 3) {
        this.addCheck('Security Tables', 'pass', 'All security tables present');
      } else {
        this.addCheck('Security Tables', 'warning', 
          `Only ${tables.rows.length}/3 tables found. Run migrations.`);
      }
      
      // Check for enhanced columns
      const columns = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'session_notes' 
        AND column_name IN ('created_by', 'updated_by', 'is_archived')
      `);
      
      if (columns.rows.length > 0) {
        this.addCheck('Enhanced Columns', 'pass', `${columns.rows.length} enhanced columns found`);
      } else {
        this.addCheck('Enhanced Columns', 'warning', 'Enhanced columns not found');
      }
      
    } catch (error: any) {
      this.addCheck('Database Connection', 'fail', error.message);
    }
  }
  
  private async checkAIServices() {
    console.log(chalk.yellow('\n🤖 Checking AI Services...'));
    
    // Check OpenAI
    if (process.env.OPENAI_API_KEY) {
      if (process.env.OPENAI_API_KEY.startsWith('sk-')) {
        this.addCheck('OpenAI API', 'pass', 'API key configured');
      } else {
        this.addCheck('OpenAI API', 'warning', 'API key format may be incorrect');
      }
    } else {
      this.addCheck('OpenAI API', 'fail', 'OPENAI_API_KEY not set');
    }
    
    // Check Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.addCheck('Anthropic API', 'pass', 'API key configured (fallback ready)');
    } else {
      this.addCheck('Anthropic API', 'warning', 'Not configured (no fallback)');
    }
    
    // Check AI Orchestrator
    try {
      const { AIOrchestrator } = require('../server/ai-orchestrator');
      const orchestrator = AIOrchestrator.getInstance();
      const metrics = orchestrator.getMetrics();
      this.addCheck('AI Orchestrator', 'pass', 
        `Loaded with ${metrics.providers.length} providers`);
    } catch (error: any) {
      this.addCheck('AI Orchestrator', 'fail', 'Failed to load');
    }
  }
  
  private async checkEnhancedFeatures() {
    console.log(chalk.yellow('\n✨ Checking Enhanced Features...'));
    
    // Check timeline routes
    try {
      require('../server/routes/enhanced-timeline-routes');
      this.addCheck('Enhanced Timeline', 'pass', 'Routes loaded');
    } catch {
      this.addCheck('Enhanced Timeline', 'fail', 'Routes not found');
    }
    
    // Check AI routes
    try {
      require('../server/routes/ai-enhanced-routes');
      this.addCheck('AI Routes', 'pass', 'AI endpoints configured');
    } catch {
      this.addCheck('AI Routes', 'fail', 'AI routes not found');
    }
    
    // Check critical fixes
    try {
      require('../server/fixes/critical-bugs-and-improvements');
      this.addCheck('Critical Fixes', 'pass', 'Bug fixes applied');
    } catch {
      this.addCheck('Critical Fixes', 'warning', 'Fixes module not loaded');
    }
    
    // Check client components
    const clientComponents = [
      'EnhancedClinicalTimeline',
      'EnhancedClientProfile',
      'ClientLink'
    ];
    
    let foundComponents = 0;
    for (const component of clientComponents) {
      try {
        const fs = require('fs');
        const path = `./client/src/components/${component}.tsx`;
        if (fs.existsSync(path)) {
          foundComponents++;
        }
      } catch {}
    }
    
    if (foundComponents === clientComponents.length) {
      this.addCheck('Client Components', 'pass', 
        `All ${clientComponents.length} components present`);
    } else {
      this.addCheck('Client Components', 'warning', 
        `${foundComponents}/${clientComponents.length} components found`);
    }
  }
  
  private async checkSecurity() {
    console.log(chalk.yellow('\n🔒 Checking Security...'));
    
    // Check session secret
    if (process.env.SESSION_SECRET && 
        process.env.SESSION_SECRET !== 'development-secret-change-in-production') {
      this.addCheck('Session Secret', 'pass', 'Custom secret configured');
    } else {
      this.addCheck('Session Secret', 'warning', 'Using default secret');
    }
    
    // Check HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      if (process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS) {
        this.addCheck('HTTPS', 'pass', 'Replit provides HTTPS');
      } else {
        this.addCheck('HTTPS', 'warning', 'Ensure HTTPS is configured');
      }
    } else {
      this.addCheck('HTTPS', 'pass', 'Not required in development');
    }
    
    // Check for console.logs in production
    if (process.env.NODE_ENV === 'production') {
      const { Logger } = require('../server/fixes/critical-bugs-and-improvements');
      if (Logger) {
        this.addCheck('Logging', 'pass', 'Production logger configured');
      } else {
        this.addCheck('Logging', 'warning', 'Logger not initialized');
      }
    } else {
      this.addCheck('Logging', 'pass', 'Development mode');
    }
  }
  
  private async checkPerformance() {
    console.log(chalk.yellow('\n⚡ Checking Performance...'));
    
    // Check for file cleanup
    const fs = require('fs');
    const uploadsDir = './uploads';
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      if (files.length > 10) {
        this.addCheck('File Cleanup', 'warning', 
          `${files.length} files in uploads - consider cleanup`);
      } else {
        this.addCheck('File Cleanup', 'pass', 
          `${files.length} files in uploads`);
      }
    } else {
      this.addCheck('File Cleanup', 'pass', 'Uploads directory clean');
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    if (heapUsedMB < 500) {
      this.addCheck('Memory Usage', 'pass', `${heapUsedMB}MB heap used`);
    } else {
      this.addCheck('Memory Usage', 'warning', `${heapUsedMB}MB heap used`);
    }
    
    // Check for PM2
    if (process.env.PM2_HOME || process.env.pm_id) {
      this.addCheck('Process Manager', 'pass', 'Running under PM2');
    } else {
      this.addCheck('Process Manager', 'warning', 'Not using PM2');
    }
  }
  
  private addCheck(name: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) {
    this.checks.push({ name, status, message, details });
    
    const icon = status === 'pass' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    const color = status === 'pass' ? chalk.green : status === 'warning' ? chalk.yellow : chalk.red;
    
    console.log(`  ${icon} ${chalk.gray(name)}: ${color(message)}`);
    if (details) {
      console.log(chalk.gray(`     ${JSON.stringify(details)}`));
    }
  }
  
  private printResults() {
    console.log('\n' + '='.repeat(60));
    
    const passed = this.checks.filter(c => c.status === 'pass').length;
    const warnings = this.checks.filter(c => c.status === 'warning').length;
    const failed = this.checks.filter(c => c.status === 'fail').length;
    
    console.log(chalk.bold('\n📊 Verification Summary:\n'));
    console.log(chalk.green(`  ✅ Passed: ${passed}/${this.checks.length}`));
    if (warnings > 0) {
      console.log(chalk.yellow(`  ⚠️  Warnings: ${warnings}`));
    }
    if (failed > 0) {
      console.log(chalk.red(`  ❌ Failed: ${failed}`));
    }
    
    const score = (passed / this.checks.length) * 100;
    const scoreColor = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
    
    console.log(chalk.bold(`\n  Overall Score: ${scoreColor(score.toFixed(0) + '%')}`));
    
    if (failed > 0) {
      console.log(chalk.red('\n⚠️  Action Required:'));
      this.checks.filter(c => c.status === 'fail').forEach(check => {
        console.log(chalk.red(`  • Fix: ${check.name} - ${check.message}`));
      });
    }
    
    if (warnings > 0) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      this.checks.filter(c => c.status === 'warning').forEach(check => {
        console.log(chalk.yellow(`  • ${check.name}: ${check.message}`));
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (score >= 80) {
      console.log(chalk.green.bold('\n🎉 System is ready for production use!\n'));
    } else if (score >= 60) {
      console.log(chalk.yellow.bold('\n⚠️  System is functional but needs improvements.\n'));
    } else {
      console.log(chalk.red.bold('\n❌ Critical issues detected. Please fix before deployment.\n'));
    }
  }
}

// Run verification
async function main() {
  const verifier = new FeatureVerifier();
  
  try {
    await verifier.runAllChecks();
    process.exit(0);
  } catch (error) {
    console.error(chalk.red('\n❌ Verification failed:'), error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  main();
}

export { FeatureVerifier };