
/**
 * Service Date Review Script
 * Reviews all existing progress notes and session notes to extract correct service dates
 */

import fs from 'fs';
import { storage } from './server/storage.ts';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ServiceDateReviewer {
  constructor() {
    this.processedCount = 0;
    this.correctedCount = 0;
    this.errorCount = 0;
    this.reviewResults = [];
  }

  async extractServiceDateWithAI(content, title = '', currentDate = '') {
    try {
      const prompt = `You are an expert at extracting service dates from clinical therapy notes.

Analyze this clinical note content and extract the ACTUAL SESSION/SERVICE DATE, not the creation date or upload date.

Look for:
- Explicit date mentions like "Session Date: 2025-01-15" or "Date: January 15, 2025"
- Contextual clues like "Today's session..." with dates in headers
- References to specific dates within the clinical content
- Date patterns in the title or content headers

Current stored date: ${currentDate}
Note title: ${title}

Clinical note content:
${content.substring(0, 3000)}

Respond with ONLY a JSON object in this exact format:
{
  "extracted_date": "YYYY-MM-DD or null if no clear service date found",
  "confidence": "high/medium/low",
  "reasoning": "Brief explanation of how the date was determined",
  "date_indicators": ["list of text snippets that indicated the date"]
}

Be conservative - only return a date if you're confident it represents the actual service/session date.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a clinical date extraction expert. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      let responseText = response.choices[0]?.message?.content?.trim();
      
      // Clean potential markdown formatting
      if (responseText?.includes('```json')) {
        responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      
      const result = JSON.parse(responseText);
      return result;

    } catch (error) {
      console.error(`  ❌ AI date extraction failed: ${error.message}`);
      return null;
    }
  }

  validateDate(dateStr) {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      return date >= twoYearsAgo && date <= oneMonthFuture;
    } catch (error) {
      return false;
    }
  }

  async reviewProgressNote(note) {
    console.log(`\n🔍 Reviewing Progress Note: ${note.clientName} - ${note.title?.substring(0, 50)}...`);
    
    // Combine all content for AI analysis
    const fullContent = `
Title: ${note.title || ''}
Subjective: ${note.subjective || ''}
Objective: ${note.objective || ''}
Assessment: ${note.assessment || ''}
Plan: ${note.plan || ''}
Narrative Summary: ${note.narrativeSummary || ''}
    `.trim();
    
    const currentDate = note.sessionDate?.toISOString().split('T')[0] || 
                       note.createdAt?.toISOString().split('T')[0];
    
    const aiResult = await this.extractServiceDateWithAI(
      fullContent,
      note.title,
      currentDate
    );
    
    const result = {
      noteId: note.id,
      noteType: 'progress_note',
      clientName: note.clientName,
      title: note.title?.substring(0, 100),
      currentDate,
      aiExtractedDate: null,
      dateChanged: false,
      confidence: 'none',
      reasoning: 'AI extraction failed',
      actionTaken: 'none'
    };
    
    if (aiResult?.extracted_date) {
      const extractedDate = aiResult.extracted_date;
      const confidence = aiResult.confidence || 'low';
      const reasoning = aiResult.reasoning || 'No reasoning provided';
      
      result.aiExtractedDate = extractedDate;
      result.confidence = confidence;
      result.reasoning = reasoning;
      
      // Only update if we have high confidence and the date is different
      if (confidence === 'high' && 
          extractedDate !== currentDate && 
          this.validateDate(extractedDate)) {
        
        try {
          await storage.updateProgressNote(note.id, {
            sessionDate: new Date(extractedDate)
          });
          
          result.dateChanged = true;
          result.actionTaken = 'date_updated';
          this.correctedCount++;
          
          console.log(`  ✅ Updated date: ${currentDate} → ${extractedDate}`);
          
        } catch (error) {
          console.error(`  ❌ Database update failed: ${error.message}`);
          result.actionTaken = 'update_failed';
          this.errorCount++;
        }
      } else {
        result.actionTaken = 'no_change_needed';
        if (confidence !== 'high') {
          console.log(`  ⚠️ Low confidence (${confidence}), no update made`);
        } else if (extractedDate === currentDate) {
          console.log(`  ✅ Date confirmed correct: ${currentDate}`);
        }
      }
    }
    
    this.processedCount++;
    return result;
  }

  async reviewSessionNote(note) {
    console.log(`\n🔍 Reviewing Session Note: ${note.clientName} - ${note.type || 'session_note'}`);
    
    const currentDate = note.sessionDate?.toISOString().split('T')[0] || 
                       note.createdAt?.toISOString().split('T')[0];
    
    const aiResult = await this.extractServiceDateWithAI(
      note.content,
      `${note.type || 'session_note'} for ${note.clientName}`,
      currentDate
    );
    
    const result = {
      noteId: note.id,
      noteType: 'session_note',
      clientName: note.clientName,
      title: `${note.type || 'session_note'} - ${note.clientName}`,
      currentDate,
      aiExtractedDate: null,
      dateChanged: false,
      confidence: 'none',
      reasoning: 'AI extraction failed',
      actionTaken: 'none'
    };
    
    if (aiResult?.extracted_date) {
      const extractedDate = aiResult.extracted_date;
      const confidence = aiResult.confidence || 'low';
      const reasoning = aiResult.reasoning || 'No reasoning provided';
      
      result.aiExtractedDate = extractedDate;
      result.confidence = confidence;
      result.reasoning = reasoning;
      
      // Only update if we have high confidence and the date is different
      if (confidence === 'high' && 
          extractedDate !== currentDate && 
          this.validateDate(extractedDate)) {
        
        try {
          await storage.updateSessionNote(note.id, {
            sessionDate: new Date(extractedDate)
          });
          
          result.dateChanged = true;
          result.actionTaken = 'date_updated';
          this.correctedCount++;
          
          console.log(`  ✅ Updated date: ${currentDate} → ${extractedDate}`);
          
        } catch (error) {
          console.error(`  ❌ Database update failed: ${error.message}`);
          result.actionTaken = 'update_failed';
          this.errorCount++;
        }
      } else {
        result.actionTaken = 'no_change_needed';
        if (confidence !== 'high') {
          console.log(`  ⚠️ Low confidence (${confidence}), no update made`);
        } else if (extractedDate === currentDate) {
          console.log(`  ✅ Date confirmed correct: ${currentDate}`);
        }
      }
    }
    
    this.processedCount++;
    return result;
  }

  generateReport() {
    const correctedNotes = this.reviewResults.filter(r => r.dateChanged);
    const confirmedNotes = this.reviewResults.filter(r => 
      r.actionTaken === 'no_change_needed' && r.confidence === 'high'
    );
    
    let report = `
🔍 AI DATE EXTRACTION REVIEW COMPLETE
${'='.repeat(50)}

📊 SUMMARY:
• Total Notes Reviewed: ${this.processedCount}
• Dates Corrected: ${this.correctedCount}
• Dates Confirmed Correct: ${confirmedNotes.length}
• Errors Encountered: ${this.errorCount}

✅ CORRECTED DATES (${correctedNotes.length} notes):
`;
    
    correctedNotes.forEach(note => {
      report += `
• ${note.clientName}: ${note.currentDate} → ${note.aiExtractedDate}
  Type: ${note.noteType}
  Reasoning: ${note.reasoning}
`;
    });
    
    if (confirmedNotes.length > 0) {
      report += `\n✅ CONFIRMED CORRECT DATES (${confirmedNotes.length} notes):\n`;
      confirmedNotes.forEach(note => {
        report += `• ${note.clientName}: ${note.currentDate} (confirmed)\n`;
      });
    }
    
    return report.trim();
  }

  async reviewAllNotes() {
    console.log('🚀 STARTING AI DATE EXTRACTION REVIEW');
    console.log('='.repeat(60));
    
    const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Default therapist
    
    try {
      // Review progress notes
      console.log('\n📋 REVIEWING PROGRESS NOTES');
      console.log('-'.repeat(30));
      
      const progressNotes = await storage.getProgressNotesByTherapistId(therapistId);
      console.log(`Found ${progressNotes.length} progress notes to review`);
      
      for (const note of progressNotes) {
        // Get client name
        const client = await storage.getClientById(note.clientId);
        note.clientName = client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
        
        const result = await this.reviewProgressNote(note);
        this.reviewResults.push(result);
      }
      
      // Review session notes
      console.log('\n📝 REVIEWING SESSION NOTES');
      console.log('-'.repeat(30));
      
      const sessionNotes = await storage.getSessionNotesByTherapistId(therapistId);
      console.log(`Found ${sessionNotes.length} session notes to review`);
      
      for (const note of sessionNotes) {
        // Get client name
        const client = await storage.getClientById(note.clientId);
        note.clientName = client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
        
        const result = await this.reviewSessionNote(note);
        this.reviewResults.push(result);
      }
      
      // Generate and display report
      console.log('\n' + '='.repeat(60));
      const report = this.generateReport();
      console.log(report);
      
      // Save detailed results to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                       new Date().toTimeString().split(' ')[0].replace(/:/g, '');
      const resultsFile = `date_extraction_review_${timestamp}.json`;
      
      const detailedResults = {
        summary: {
          totalReviewed: this.processedCount,
          datesCorrected: this.correctedCount,
          errors: this.errorCount,
          reviewTimestamp: new Date().toISOString()
        },
        detailedResults: this.reviewResults
      };
      
      fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
      console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Review process failed: ${error.message}`);
      return false;
    }
  }
}

async function main() {
  console.log('Starting service date review...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const reviewer = new ServiceDateReviewer();
  const success = await reviewer.reviewAllNotes();
  
  if (success) {
    console.log('\n🎉 Date extraction review completed successfully!');
  } else {
    console.log('\n❌ Date extraction review failed!');
    process.exit(1);
  }
}

main().catch(console.error);
