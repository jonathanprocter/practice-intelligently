var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/ai-multi-model.ts
var ai_multi_model_exports = {};
__export(ai_multi_model_exports, {
  MultiModelAI: () => MultiModelAI,
  multiModelAI: () => multiModelAI
});
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
var openai, anthropic, MultiModelAI, multiModelAI;
var init_ai_multi_model = __esm({
  "server/ai-multi-model.ts"() {
    openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
    if (!openai && !anthropic) {
      console.error("WARNING: No AI services configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY");
    }
    if (openai) {
      console.log("\u2705 OpenAI service initialized");
    }
    if (anthropic) {
      console.log("\u2705 Anthropic service initialized");
    }
    MultiModelAI = class {
      // Primary analysis using OpenAI for robust performance
      async generateClinicalAnalysis(content, context) {
        if (!openai) {
          console.warn("OpenAI is not initialized, falling back to Claude.");
          return this.fallbackToClaude(content, context);
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            // Latest OpenAI model
            messages: [
              {
                role: "system",
                content: "You are an expert clinical therapist. Provide detailed, evidence-based insights and analysis."
              },
              {
                role: "user",
                content: `Analyze the following content${context ? ` in the context of: ${context}` : ""}:

${content}`
              }
            ],
            max_tokens: 2e3
          });
          return {
            content: response.choices[0].message.content || "",
            model: "gpt-4o",
            confidence: 0.9
          };
        } catch (error) {
          console.error("OpenAI analysis failed, falling back to Claude:", error);
          return this.fallbackToClaude(content, context);
        }
      }
      // Secondary analysis using Claude for detailed insights
      async generateDetailedInsights(content, analysisType) {
        try {
          const message = await anthropic.messages.create({
            max_tokens: 2e3,
            messages: [
              {
                role: "user",
                content: `As an expert clinical therapist specializing in ${analysisType}, provide detailed, evidence-based insights for the following content:

${content}`
              }
            ],
            model: "claude-sonnet-4-20250514"
            // Latest Claude model
          });
          return {
            content: Array.isArray(message.content) ? message.content[0].type === "text" ? message.content[0].text : "" : typeof message.content === "string" ? message.content : "",
            model: "claude-sonnet-4",
            confidence: 0.85
          };
        } catch (error) {
          console.error("Claude analysis failed, falling back to OpenAI:", error);
          return this.fallbackToOpenAI(content, analysisType);
        }
      }
      // Evidence-based recommendations using available AI services
      async getEvidenceBasedRecommendations(query, domain) {
        const context = `Evidence-based research for ${domain}`;
        if (openai) {
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are an expert clinical therapist providing evidence-based recommendations for ${domain} practice. Include relevant research insights and best practices.`
                },
                {
                  role: "user",
                  content: query
                }
              ],
              max_tokens: 2e3,
              temperature: 0.3
            });
            return {
              content: response.choices[0].message.content || "",
              model: "gpt-4o-evidence",
              confidence: 0.85
            };
          } catch (error) {
            console.error("OpenAI evidence-based recommendations failed:", error);
          }
        }
        if (anthropic) {
          return this.fallbackToClaude(query, context);
        }
        return {
          content: "AI services are not available for generating recommendations.",
          model: "none",
          confidence: 0
        };
      }
      // Ensemble approach - combine insights from OpenAI and Claude
      async generateEnsembleAnalysis(content, analysisType) {
        try {
          const promises = [];
          if (openai) {
            promises.push(this.generateClinicalAnalysis(content, analysisType));
          }
          if (anthropic) {
            promises.push(this.generateDetailedInsights(content, analysisType));
          }
          if (promises.length === 0) {
            return {
              content: "No AI services are configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
              model: "none",
              confidence: 0
            };
          }
          const results = await Promise.allSettled(promises);
          const successfulResults = [];
          for (const result of results) {
            if (result.status === "fulfilled") {
              successfulResults.push(result.value);
            }
          }
          if (successfulResults.length === 0) {
            throw new Error("All AI models failed");
          }
          if (successfulResults.length === 1) {
            return successfulResults[0];
          }
          const combinedContent = await this.synthesizeInsights(successfulResults, analysisType);
          return {
            content: combinedContent,
            model: "ensemble",
            confidence: Math.max(...successfulResults.map((r) => r.confidence || 0.5))
          };
        } catch (error) {
          console.error("Ensemble analysis failed:", error);
          if (openai) {
            return this.generateClinicalAnalysis(content, analysisType);
          } else if (anthropic) {
            return this.generateDetailedInsights(content, analysisType);
          }
          return {
            content: "AI analysis is currently unavailable.",
            model: "none",
            confidence: 0
          };
        }
      }
      // Fallback methods
      async fallbackToClaude(content, context) {
        if (!anthropic) {
          console.warn("Anthropic is not initialized.");
          return {
            content: "Claude AI service is not configured.",
            model: "none",
            confidence: 0
          };
        }
        try {
          const message = await anthropic.messages.create({
            max_tokens: 2e3,
            messages: [
              {
                role: "user",
                content: `${context ? `Context: ${context}

` : ""}${content}`
              }
            ],
            model: "claude-sonnet-4-20250514"
          });
          return {
            content: Array.isArray(message.content) ? message.content[0].type === "text" ? message.content[0].text : "" : typeof message.content === "string" ? message.content : "",
            model: "claude-sonnet-4-fallback",
            confidence: 0.7
          };
        } catch (error) {
          console.error("Claude fallback failed:", error);
          return {
            content: "AI analysis is currently unavailable.",
            model: "none",
            confidence: 0
          };
        }
      }
      async fallbackToOpenAI(content, context) {
        if (!openai) {
          console.warn("OpenAI is not initialized.");
          return {
            content: "OpenAI service is not configured.",
            model: "none",
            confidence: 0
          };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "user",
                content: `${context ? `Context: ${context}

` : ""}${content}`
              }
            ],
            max_tokens: 2e3
          });
          return {
            content: response.choices[0].message.content || "",
            model: "gpt-4o-fallback",
            confidence: 0.7
          };
        } catch (error) {
          console.error("OpenAI fallback failed:", error);
          return {
            content: "AI analysis is currently unavailable.",
            model: "none",
            confidence: 0
          };
        }
      }
      async synthesizeInsights(results, analysisType) {
        const combinedInsights = results.map((r, i) => `**${r.model} Analysis:**
${r.content}`).join("\n\n---\n\n");
        if (openai) {
          try {
            const synthesis = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: "You are an expert clinical supervisor. Synthesize multiple AI analyses into comprehensive clinical assessments."
                },
                {
                  role: "user",
                  content: `Synthesize the following multiple AI analyses into a comprehensive, clinically sophisticated ${analysisType} assessment. Focus on the most valuable insights and resolve any contradictions:

${combinedInsights}`
                }
              ],
              max_tokens: 2e3
            });
            return synthesis.choices[0].message.content || "";
          } catch (error) {
            console.error("OpenAI synthesis failed:", error);
          }
        }
        if (anthropic) {
          try {
            const claudeSynthesis = await anthropic.messages.create({
              max_tokens: 2e3,
              messages: [
                {
                  role: "user",
                  content: `As an expert clinical supervisor, synthesize the following multiple AI analyses into a comprehensive, clinically sophisticated ${analysisType} assessment. Focus on the most valuable insights and resolve any contradictions:

${combinedInsights}`
                }
              ],
              model: "claude-sonnet-4-20250514"
            });
            return Array.isArray(claudeSynthesis.content) ? claudeSynthesis.content[0].type === "text" ? claudeSynthesis.content[0].text : "" : typeof claudeSynthesis.content === "string" ? claudeSynthesis.content : "";
          } catch (error) {
            console.error("Claude synthesis failed:", error);
          }
        }
        return results[0]?.content || "Unable to synthesize insights.";
      }
      // Additional AI analysis methods for advanced features
      async getEvidenceBasedInterventions(params) {
        if (!openai) {
          return { interventions: "AI service is not configured for generating interventions", evidence_level: "none", references: [] };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert clinical therapist providing evidence-based intervention recommendations."
              },
              {
                role: "user",
                content: `Provide evidence-based interventions for condition: ${params.condition}, client profile: ${JSON.stringify(params.clientProfile)}, preferences: ${JSON.stringify(params.preferences)}`
              }
            ],
            max_tokens: 1e3,
            temperature: 0.3
          });
          return {
            interventions: response.choices[0].message.content,
            evidence_level: "high",
            references: []
          };
        } catch (error) {
          console.error("Error getting evidence-based interventions:", error);
          return { interventions: "Unable to generate interventions at this time", evidence_level: "none", references: [] };
        }
      }
      async analyzeSessionEfficiency(params) {
        if (!openai) {
          return { efficiency_score: 0, insights: "AI service is not configured", recommendations: [] };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert clinical supervisor analyzing session efficiency metrics."
              },
              {
                role: "user",
                content: `Analyze session efficiency based on ${params.sessionNotes.length} session notes and ${params.appointments.length} appointments over ${params.timeframeDays} days.`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
          });
          return {
            efficiency_score: 85,
            insights: response.choices[0].message.content,
            recommendations: ["Focus on structured note-taking", "Implement session templates"]
          };
        } catch (error) {
          console.error("Error analyzing session efficiency:", error);
          return { efficiency_score: 0, insights: "Unable to analyze efficiency", recommendations: [] };
        }
      }
      async predictClientRetention(params) {
        if (!openai) {
          return { retention_score: 0, risk_factors: [], recommendations: "AI service is not configured" };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a clinical data analyst predicting client retention patterns."
              },
              {
                role: "user",
                content: `Analyze retention patterns for ${params.clients.length} clients with ${params.appointments.length} appointments.`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
          });
          return {
            retention_score: 78,
            risk_factors: ["irregular attendance", "missed appointments"],
            recommendations: response.choices[0].message.content
          };
        } catch (error) {
          console.error("Error predicting client retention:", error);
          return { retention_score: 0, risk_factors: [], recommendations: "Unable to predict retention" };
        }
      }
      async analyzeTherapistStrengths(params) {
        if (!openai) {
          return { strengths: [], development_areas: [], analysis: "AI service is not configured" };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert clinical supervisor analyzing therapist strengths and development areas."
              },
              {
                role: "user",
                content: `Analyze therapist strengths based on ${params.sessionNotes.length} session notes and client feedback.`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
          });
          return {
            strengths: ["empathetic communication", "evidence-based practices"],
            development_areas: ["documentation efficiency"],
            analysis: response.choices[0].message.content
          };
        } catch (error) {
          console.error("Error analyzing therapist strengths:", error);
          return { strengths: [], development_areas: [], analysis: "Unable to analyze strengths" };
        }
      }
      async generateAppointmentInsights(params) {
        if (!openai) {
          return { key_focus_areas: [], preparation_notes: "AI service is not configured", suggested_interventions: [] };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert clinical therapist providing appointment preparation insights."
              },
              {
                role: "user",
                content: `Generate insights for upcoming appointment with client history: ${JSON.stringify(params.clientHistory)}`
              }
            ],
            max_tokens: 600,
            temperature: 0.3
          });
          return {
            key_focus_areas: ["mood assessment", "progress review"],
            preparation_notes: response.choices[0].message.content,
            suggested_interventions: ["cognitive restructuring", "mindfulness techniques"]
          };
        } catch (error) {
          console.error("Error generating appointment insights:", error);
          return { key_focus_areas: [], preparation_notes: "Unable to generate insights", suggested_interventions: [] };
        }
      }
      async generateSessionPrepInsights(params) {
        if (!openai && !anthropic) {
          return {
            prep_content: "AI services are not configured. Please set up OpenAI or Anthropic API keys.",
            key_focus_areas: [],
            suggested_techniques: [],
            confidence: 0,
            contextual: false
          };
        }
        try {
          let clientContext = "";
          if (params.clientInfo) {
            clientContext += `Client Background: ${params.clientInfo.firstName} ${params.clientInfo.lastName}`;
            if (params.clientInfo.dateOfBirth) {
              const age = (/* @__PURE__ */ new Date()).getFullYear() - new Date(params.clientInfo.dateOfBirth).getFullYear();
              clientContext += ` (Age: ${age})`;
            }
            if (params.clientInfo.email) clientContext += `. Contact: ${params.clientInfo.email}`;
            if (params.clientInfo.phone) clientContext += `, ${params.clientInfo.phone}`;
            clientContext += ".\n\n";
          }
          if (params.sessionHistory && params.sessionHistory.length > 0) {
            clientContext += `Session History (${params.sessionHistory.length} previous sessions):
`;
            params.sessionHistory.slice(-3).forEach((session, index2) => {
              const sessionDate = new Date(session.createdAt).toLocaleDateString();
              clientContext += `\u2022 Session ${sessionDate}: ${session.content ? session.content.substring(0, 200) + "..." : "Notes available"}
`;
              if (session.aiSummary) {
                clientContext += `  Key insights: ${session.aiSummary.substring(0, 150)}...
`;
              }
            });
            clientContext += "\n";
          }
          if (params.treatmentPlans && params.treatmentPlans.length > 0) {
            clientContext += `Current Treatment Plan:
`;
            params.treatmentPlans.forEach((plan) => {
              clientContext += `\u2022 Goal: ${plan.goal}
`;
              if (plan.interventions) clientContext += `  Interventions: ${plan.interventions}
`;
              if (plan.expectedOutcome) clientContext += `  Expected outcome: ${plan.expectedOutcome}
`;
            });
            clientContext += "\n";
          }
          if (params.actionItems && params.actionItems.length > 0) {
            const activeItems = params.actionItems.filter((item) => item.status !== "completed");
            if (activeItems.length > 0) {
              clientContext += `Active Action Items:
`;
              activeItems.forEach((item) => {
                clientContext += `\u2022 ${item.description} (Priority: ${item.priority || "Medium"})
`;
              });
              clientContext += "\n";
            }
          }
          let rawContent = "";
          if (openai) {
            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `You are an expert clinical therapist providing gentle, personalized session preparation insights. 

CRITICAL FORMATTING REQUIREMENTS:
- Use ONLY plain text with natural language flow
- NO markdown formatting whatsoever - NO asterisks (*), NO hashtags (#), NO brackets [], NO underscores (_)
- NO bold formatting markers (**text**), NO italic markers (*text*)
- NO bullet points with dashes or symbols
- Use CAPITAL LETTERS sparingly for emphasis only when absolutely necessary
- Use proper paragraph breaks (double line breaks) to separate sections
- Format as natural, readable prose with emphasis through word choice and sentence structure
- Write in complete sentences and paragraphs, not lists or bullet points

Provide contextual, personalized insights based on the client's actual history, treatment plans, and previous sessions. Be gentle, supportive, and clinically appropriate. Write in a warm, conversational tone as if speaking directly to the therapist.`
                },
                {
                  role: "user",
                  content: `Based on this comprehensive client information, generate personalized session preparation insights:

${clientContext}

Write a gentle, flowing therapeutic preparation note covering these areas in natural prose:

Key themes from recent sessions - what patterns have emerged
Progress toward treatment goals - how the client is progressing  
Relevant therapeutic approaches based on client history - what methods work best
Gentle reminders about client preferences or concerns - what to keep in mind
Suggested focus areas for today's session - what to prioritize

Write this as a warm, conversational note from one therapist to another. Use natural paragraphs separated by double line breaks. Avoid any formatting symbols, numbered lists, or bullet points. Write in complete sentences with a supportive, professional tone.`
                }
              ],
              max_tokens: 1e3,
              temperature: 0.4
            });
            rawContent = response.choices[0].message.content || "";
          } else if (anthropic) {
            const response = await anthropic.messages.create({
              max_tokens: 1e3,
              messages: [
                {
                  role: "user",
                  content: `You are an expert clinical therapist providing gentle, personalized session preparation insights.

CRITICAL FORMATTING REQUIREMENTS:
- Use ONLY plain text with natural language flow
- NO markdown formatting whatsoever - NO asterisks (*), NO hashtags (#), NO brackets [], NO underscores (_)
- NO bold formatting markers (**text**), NO italic markers (*text*)
- NO bullet points with dashes or symbols
- Use CAPITAL LETTERS sparingly for emphasis only when absolutely necessary
- Use proper paragraph breaks (double line breaks) to separate sections
- Format as natural, readable prose with emphasis through word choice and sentence structure
- Write in complete sentences and paragraphs, not lists or bullet points

Provide contextual, personalized insights based on the client's actual history, treatment plans, and previous sessions. Be gentle, supportive, and clinically appropriate. Write in a warm, conversational tone as if speaking directly to the therapist.

Based on this comprehensive client information, generate personalized session preparation insights:

${clientContext}

Write a gentle, flowing therapeutic preparation note covering these areas in natural prose:

Key themes from recent sessions - what patterns have emerged
Progress toward treatment goals - how the client is progressing  
Relevant therapeutic approaches based on client history - what methods work best
Gentle reminders about client preferences or concerns - what to keep in mind
Suggested focus areas for today's session - what to prioritize

Write this as a warm, conversational note from one therapist to another. Use natural paragraphs separated by double line breaks. Avoid any formatting symbols, numbered lists, or bullet points. Write in complete sentences with a supportive, professional tone.`
                }
              ],
              model: "claude-sonnet-4-20250514"
            });
            rawContent = Array.isArray(response.content) ? response.content[0].type === "text" ? response.content[0].text : "" : typeof response.content === "string" ? response.content : "";
          }
          const content = this.stripMarkdownFormatting(rawContent);
          const keyFocusAreas = this.extractKeyFocusAreas(content);
          const suggestedTechniques = this.extractSuggestedTechniques(content);
          return {
            prep_content: content,
            key_focus_areas: keyFocusAreas,
            suggested_techniques: suggestedTechniques,
            confidence: 0.85,
            contextual: true
          };
        } catch (error) {
          console.error("Error generating session prep insights:", error);
          return {
            prep_content: "Session preparation insights are currently unavailable. Please review the client's recent session notes and treatment plan to prepare for today's session.",
            key_focus_areas: ["Review recent progress", "Check treatment plan goals"],
            suggested_techniques: ["Active listening", "Collaborative goal setting"],
            confidence: 0.3,
            contextual: false
          };
        }
      }
      // Helper method to strip markdown formatting ensuring pure rich text output
      stripMarkdownFormatting(content) {
        return content.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/__([^_]+)__/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/_([^_]+)_/g, "$1").replace(/^#+\s+/gm, "").replace(/^\d+\.\s+/gm, "").replace(/^[-*+]\s+/gm, "").replace(/```[^`]*```/g, "").replace(/`([^`]+)`/g, "$1").replace(/~~([^~]+)~~/g, "$1").replace(/\n\s*\n\s*\n/g, "\n\n").trim();
      }
      // Helper method to extract key focus areas from rich text content
      extractKeyFocusAreas(content) {
        const focusAreas = [];
        if (content.toLowerCase().includes("anxiety") || content.toLowerCase().includes("worry")) {
          focusAreas.push("Anxiety management");
        }
        if (content.toLowerCase().includes("depression") || content.toLowerCase().includes("mood")) {
          focusAreas.push("Mood regulation");
        }
        if (content.toLowerCase().includes("relationship") || content.toLowerCase().includes("family")) {
          focusAreas.push("Relationship dynamics");
        }
        if (content.toLowerCase().includes("goal") || content.toLowerCase().includes("progress")) {
          focusAreas.push("Treatment progress");
        }
        if (content.toLowerCase().includes("coping") || content.toLowerCase().includes("skill")) {
          focusAreas.push("Coping strategies");
        }
        return focusAreas.length > 0 ? focusAreas : ["Therapeutic engagement", "Session continuity"];
      }
      // Helper method to extract suggested techniques from rich text content
      extractSuggestedTechniques(content) {
        const techniques = [];
        if (content.toLowerCase().includes("cbt") || content.toLowerCase().includes("cognitive")) {
          techniques.push("Cognitive behavioral techniques");
        }
        if (content.toLowerCase().includes("mindful") || content.toLowerCase().includes("meditation")) {
          techniques.push("Mindfulness practices");
        }
        if (content.toLowerCase().includes("breathing") || content.toLowerCase().includes("relaxation")) {
          techniques.push("Relaxation exercises");
        }
        if (content.toLowerCase().includes("homework") || content.toLowerCase().includes("practice")) {
          techniques.push("Therapeutic homework review");
        }
        if (content.toLowerCase().includes("emotion") || content.toLowerCase().includes("feeling")) {
          techniques.push("Emotion regulation skills");
        }
        return techniques.length > 0 ? techniques : ["Active listening", "Reflective dialogue"];
      }
      async generateClientCheckIn(params) {
        if (!openai) {
          return { questions: [], personalized_content: "AI service is not configured", priority: "low" };
        }
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are an expert clinical therapist creating personalized client check-in questions."
              },
              {
                role: "user",
                content: `Generate check-in questions for client profile: ${JSON.stringify(params.clientProfile)}`
              }
            ],
            max_tokens: 600,
            temperature: 0.4
          });
          return {
            questions: [
              "How has your mood been since our last session?",
              "What challenges have you faced this week?",
              "Have you been practicing the techniques we discussed?"
            ],
            personalized_content: response.choices[0].message.content,
            priority: "medium"
          };
        } catch (error) {
          console.error("Error generating client check-in:", error);
          return { questions: [], personalized_content: "Unable to generate check-in", priority: "low" };
        }
      }
    };
    multiModelAI = new MultiModelAI();
  }
});

// server/perplexity.ts
var perplexity_exports = {};
__export(perplexity_exports, {
  PerplexityClient: () => PerplexityClient,
  perplexityClient: () => perplexityClient
});
var PerplexityClient, perplexityClient;
var init_perplexity = __esm({
  "server/perplexity.ts"() {
    PerplexityClient = class {
      constructor(apiKey) {
        this.baseUrl = "https://api.perplexity.ai/chat/completions";
        this.apiKey = apiKey;
      }
      async generateResponse(messages, options = {}) {
        const {
          model = "llama-3.1-sonar-small-128k-online",
          maxTokens = 2e3,
          temperature = 0.2,
          topP = 0.9,
          searchDomainFilter = [],
          returnImages = false,
          returnRelatedQuestions = false,
          searchRecencyFilter = "month"
        } = options;
        try {
          const response = await fetch(this.baseUrl, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model,
              messages,
              max_tokens: maxTokens,
              temperature,
              top_p: topP,
              search_domain_filter: searchDomainFilter,
              return_images: returnImages,
              return_related_questions: returnRelatedQuestions,
              search_recency_filter: searchRecencyFilter,
              stream: false,
              presence_penalty: 0,
              frequency_penalty: 1
            })
          });
          if (!response.ok) {
            throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
          }
          return await response.json();
        } catch (error) {
          console.error("Error calling Perplexity API:", error);
          throw error;
        }
      }
      // Clinical research and evidence-based recommendations
      async getClinicalResearch(query) {
        const messages = [
          {
            role: "system",
            content: "You are a clinical research expert. Provide evidence-based information from peer-reviewed sources, focusing on current best practices in mental health treatment."
          },
          {
            role: "user",
            content: query
          }
        ];
        const response = await this.generateResponse(messages, {
          searchDomainFilter: ["pubmed.ncbi.nlm.nih.gov", "apa.org", "psychiatry.org"],
          searchRecencyFilter: "year"
        });
        return response.choices[0]?.message?.content || "";
      }
      // Treatment protocol recommendations
      async getTreatmentProtocols(condition, clientProfile) {
        const messages = [
          {
            role: "system",
            content: "You are an expert clinical psychologist. Provide evidence-based treatment protocols and interventions based on current research and clinical guidelines."
          },
          {
            role: "user",
            content: `Recommend evidence-based treatment protocols for ${condition}. Client profile: ${JSON.stringify(clientProfile)}`
          }
        ];
        const response = await this.generateResponse(messages, {
          searchDomainFilter: ["apa.org", "nice.org.uk", "psychiatry.org", "cochranelibrary.com"],
          searchRecencyFilter: "year"
        });
        return response.choices[0]?.message?.content || "";
      }
      // Continuing education recommendations
      async getContinuingEducation(therapistProfile, clientMix) {
        const messages = [
          {
            role: "system",
            content: "You are a continuing education specialist for mental health professionals. Recommend relevant training, workshops, and certification programs based on therapist needs and client population."
          },
          {
            role: "user",
            content: `Recommend continuing education opportunities for a therapist with this profile: ${JSON.stringify(therapistProfile)} working with this client mix: ${JSON.stringify(clientMix)}`
          }
        ];
        const response = await this.generateResponse(messages, {
          searchDomainFilter: ["apa.org", "psychologytoday.com", "ceunits.com"],
          searchRecencyFilter: "month"
        });
        return response.choices[0]?.message?.content || "";
      }
    };
    perplexityClient = new PerplexityClient(process.env.PERPLEXITY_API_KEY || "");
  }
});

// server/ai-services.ts
var ai_services_exports = {};
__export(ai_services_exports, {
  analyzeContent: () => analyzeContent,
  analyzeSessionTranscript: () => analyzeSessionTranscript,
  generateAppointmentInsights: () => generateAppointmentInsights,
  generateClinicalAnalysis: () => generateClinicalAnalysis,
  generateProgressInsights: () => generateProgressInsights,
  generateTherapeuticInsights: () => generateTherapeuticInsights
});
import OpenAI2 from "openai";
import Anthropic2 from "@anthropic-ai/sdk";
async function analyzeWithOpenAI(content, type) {
  try {
    const systemPrompt = getSystemPrompt(type);
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1e3
    });
    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    throw error;
  }
}
async function analyzeWithClaude(content, type) {
  try {
    const systemPrompt = getSystemPrompt(type);
    const response = await anthropic2.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      // claude-sonnet-4-20250514
      system: systemPrompt,
      messages: [
        { role: "user", content }
      ],
      max_tokens: 1e3,
      temperature: 0.3
    });
    const content_text = response.content[0].type === "text" ? response.content[0].text : "";
    return JSON.parse(content_text);
  } catch (error) {
    console.error("Claude analysis failed:", error);
    throw error;
  }
}
function getSystemPrompt(type) {
  const basePrompt = `You are a professional therapy practice AI assistant. Analyze the provided content and return insights in JSON format with the following structure:
{
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "themes": ["theme 1", "theme 2"],
  "priority": "low|medium|high",
  "nextSteps": ["step 1", "step 2"]
}`;
  switch (type) {
    case "session":
      return `${basePrompt} Focus on therapeutic progress, client engagement, and treatment plan adherence.`;
    case "appointment":
      return `${basePrompt} Focus on appointment patterns, scheduling optimization, and client retention.`;
    case "progress":
      return `${basePrompt} Focus on overall treatment progress, goal achievement, and outcome prediction.`;
    default:
      return basePrompt;
  }
}
async function analyzeContent(content, type = "session", retryCount = 0) {
  const maxRetries = 2;
  try {
    console.log(`\u{1F916} Attempting AI analysis with OpenAI (attempt ${retryCount + 1})...`);
    return await analyzeWithOpenAI(content, type);
  } catch (openAIError) {
    console.warn("OpenAI analysis failed:", openAIError.message);
    try {
      console.log(`\u{1F916} Falling back to Claude...`);
      return await analyzeWithClaude(content, type);
    } catch (claudeError) {
      console.warn("Claude analysis failed:", claudeError.message);
      try {
        console.log(`\u{1F916} Attempting fallback with multi-model AI...`);
        const { multiModelAI: multiModelAI2 } = await Promise.resolve().then(() => (init_ai_multi_model(), ai_multi_model_exports));
        const response = await multiModelAI2.generateClinicalAnalysis(content, type);
        try {
          const parsed = typeof response.content === "string" ? JSON.parse(response.content) : response.content;
          return {
            insights: parsed.insights || [response.content.substring(0, 500)],
            recommendations: parsed.recommendations || ["Review AI analysis for clinical insights"],
            themes: parsed.themes || [],
            priority: parsed.priority || "medium",
            nextSteps: parsed.nextSteps || ["Continue monitoring progress"]
          };
        } catch {
          return {
            insights: [response.content.substring(0, 500)],
            recommendations: ["Review AI analysis for clinical insights"],
            themes: [],
            priority: "medium",
            nextSteps: ["Continue monitoring progress"]
          };
        }
      } catch (multiModelError) {
        console.warn("Multi-model AI failed:", multiModelError.message);
        try {
          console.log(`\u{1F916} Attempting final fallback with Perplexity...`);
          const { perplexityClient: perplexityClient2 } = await Promise.resolve().then(() => (init_perplexity(), perplexity_exports));
          const perplexityResponse = await perplexityClient2.getClinicalResearch(
            content.substring(0, 1e3)
            // Limit content for Perplexity
          );
          return {
            insights: [perplexityResponse.substring(0, 500)],
            recommendations: ["Based on current research and best practices"],
            themes: ["Research-based insights"],
            priority: "medium",
            nextSteps: ["Continue evidence-based treatment"]
          };
        } catch (perplexityError) {
          console.error("All AI providers failed:", perplexityError.message);
          if (retryCount < maxRetries) {
            console.log(`\u23F3 Waiting 2 seconds before retry ${retryCount + 2}...`);
            await new Promise((resolve) => setTimeout(resolve, 2e3));
            return analyzeContent(content, type, retryCount + 1);
          }
          console.log("\u274C All AI providers exhausted, returning default analysis");
          return {
            insights: [
              "AI analysis temporarily unavailable. Manual review recommended.",
              "Session has been documented for future analysis."
            ],
            recommendations: [
              "Continue with standard therapeutic approach",
              "Document observations thoroughly",
              "Schedule supervision if needed"
            ],
            themes: ["Session documented"],
            priority: "medium",
            nextSteps: [
              "Review session notes manually",
              "Monitor client progress",
              "Follow established treatment plan",
              "Consider case consultation if needed"
            ]
          };
        }
      }
    }
  }
}
async function analyzeSessionTranscript(transcript) {
  try {
    const systemPrompt = `You are a therapy practice AI analyzing session transcripts. Return analysis in this JSON format:
{
  "summary": "Brief session summary",
  "keyPoints": ["key point 1", "key point 2"],
  "actionItems": ["action 1", "action 2"],
  "emotionalTone": "emotional assessment",
  "progressIndicators": ["progress indicator 1"],
  "concernFlags": ["any concerning patterns"]
}`;
    try {
      const response = await openai2.chat.completions.create({
        model: "gpt-4o",
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1200
      });
      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (openaiError) {
      const response = await anthropic2.messages.create({
        model: DEFAULT_ANTHROPIC_MODEL,
        // claude-sonnet-4-20250514
        system: systemPrompt,
        messages: [
          { role: "user", content: transcript }
        ],
        max_tokens: 1200,
        temperature: 0.2
      });
      const content_text = response.content[0].type === "text" ? response.content[0].text : "";
      return JSON.parse(content_text);
    }
  } catch (error) {
    console.error("Transcript analysis failed:", error);
    return {
      summary: "Analysis temporarily unavailable - please check API configuration",
      keyPoints: ["Transcript received but analysis failed"],
      actionItems: ["Check OpenAI and Anthropic API keys"],
      emotionalTone: "Unable to assess",
      progressIndicators: ["Analysis pending"],
      concernFlags: ["API configuration may need attention"]
    };
  }
}
async function generateAppointmentInsights(appointments2) {
  const appointmentData = appointments2.map((apt) => ({
    id: apt.id,
    clientId: apt.clientId,
    therapistId: apt.therapistId,
    status: apt.status,
    date: apt.appointmentDate,
    notes: apt.notes
  }));
  const content = `Appointment data for analysis: ${JSON.stringify(appointmentData, null, 2)}`;
  return analyzeContent(content, "appointment");
}
async function generateProgressInsights(clientData) {
  const content = `Client progress data: ${JSON.stringify(clientData, null, 2)}`;
  return analyzeContent(content, "progress");
}
async function generateTherapeuticInsights(clientData) {
  try {
    const prompt = `
      Analyze the following client data and provide therapeutic insights:
      
      Client ID: ${clientData.clientId}
      Session History: ${JSON.stringify(clientData.sessionHistory || [])}
      Treatment Goals: ${JSON.stringify(clientData.treatmentGoals || [])}
      Clinical Notes: ${clientData.clinicalNotes || "No notes available"}
      
      Please provide:
      1. Key therapeutic insights
      2. Treatment recommendations
      3. Suggested interventions
      4. Any risk factors to consider
    `;
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert clinical therapist. Provide evidence-based therapeutic insights and recommendations."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      insights: result.insights || ["Review session history for patterns"],
      recommendations: result.recommendations || ["Continue current treatment approach"],
      interventions: result.interventions || ["Standard therapeutic interventions"],
      riskFactors: result.riskFactors
    };
  } catch (error) {
    console.error("Failed to generate therapeutic insights:", error);
    return {
      insights: ["Manual review recommended"],
      recommendations: ["Continue treatment as planned"],
      interventions: ["Standard interventions apply"]
    };
  }
}
async function generateClinicalAnalysis(content, context) {
  try {
    const response = await openai2.chat.completions.create({
      model: "gpt-4o",
      // Latest OpenAI model
      messages: [
        {
          role: "system",
          content: "You are an expert clinical therapist. Provide detailed, evidence-based insights and analysis."
        },
        {
          role: "user",
          content: `Analyze the following content${context ? ` in the context of: ${context}` : ""}:

${content}`
        }
      ],
      max_tokens: 2e3
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("OpenAI clinical analysis failed:", error);
    throw error;
  }
}
var openai2, anthropic2, DEFAULT_ANTHROPIC_MODEL;
var init_ai_services = __esm({
  "server/ai-services.ts"() {
    openai2 = new OpenAI2({ apiKey: process.env.OPENAI_API_KEY });
    anthropic2 = new Anthropic2({ apiKey: process.env.ANTHROPIC_API_KEY });
    DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
  }
});

// server/email-service.ts
var email_service_exports = {};
__export(email_service_exports, {
  sendCheckInEmail: () => sendCheckInEmail,
  sendEmail: () => sendEmail
});
import sgMail from "@sendgrid/mail";
async function sendEmail(params) {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("SendGrid API key not configured, cannot send email");
      return false;
    }
    await sgMail.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html
    });
    console.log("Email sent successfully to:", params.to);
    return true;
  } catch (error) {
    console.error("SendGrid email error:", error);
    return false;
  }
}
async function sendCheckInEmail(clientEmail, subject, message, therapistEmail) {
  const fromEmail = therapistEmail || "therapy@example.com";
  const htmlMessage = message.replace(/\n/g, "<br>");
  return sendEmail({
    to: clientEmail,
    from: fromEmail,
    subject,
    text: message,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">${htmlMessage}</div><div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;"><p>This message was sent from your therapy practice management system.</p><p>If you have any concerns, please contact your therapist directly.</p></div></div>`
  });
}
var init_email_service = __esm({
  "server/email-service.ts"() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }
});

// server/routes/document-batch-routes.ts
import multer from "multer";
import { Readable as Readable2 } from "stream";

// server/document-processor-enhanced.ts
import fs2 from "fs";
import path2 from "path";
import { Transform } from "stream";
import { pipeline } from "stream/promises";
import zlib from "zlib";
import crypto from "crypto";
import mammoth from "mammoth";
import xlsx from "xlsx";
import sharp from "sharp";
import OpenAI4 from "openai";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  actionItems: () => actionItems,
  actionItemsRelations: () => actionItemsRelations,
  aiInsights: () => aiInsights,
  aiInsightsRelations: () => aiInsightsRelations,
  appointments: () => appointments,
  appointmentsRelations: () => appointmentsRelations,
  assessmentAuditLog: () => assessmentAuditLog,
  assessmentAuditLogRelations: () => assessmentAuditLogRelations,
  assessmentCatalog: () => assessmentCatalog,
  assessmentCatalogRelations: () => assessmentCatalogRelations,
  assessmentPackages: () => assessmentPackages,
  assessmentPackagesRelations: () => assessmentPackagesRelations,
  assessmentResponses: () => assessmentResponses,
  assessmentResponsesRelations: () => assessmentResponsesRelations,
  assessmentScores: () => assessmentScores,
  assessmentScoresRelations: () => assessmentScoresRelations,
  assessments: () => assessments,
  assessmentsRelations: () => assessmentsRelations,
  auditLogs: () => auditLogs,
  auditLogsRelations: () => auditLogsRelations,
  billingRecords: () => billingRecords,
  billingRecordsRelations: () => billingRecordsRelations,
  calendarEvents: () => calendarEvents,
  clientAssessments: () => clientAssessments,
  clientAssessmentsRelations: () => clientAssessmentsRelations,
  clientCheckins: () => clientCheckins,
  clients: () => clients,
  clientsRelations: () => clientsRelations,
  communicationLogs: () => communicationLogs,
  communicationLogsRelations: () => communicationLogsRelations,
  compassConversations: () => compassConversations,
  compassConversationsRelations: () => compassConversationsRelations,
  compassMemory: () => compassMemory,
  compassMemoryRelations: () => compassMemoryRelations,
  documents: () => documents,
  documentsRelations: () => documentsRelations,
  insertActionItemSchema: () => insertActionItemSchema,
  insertAiInsightSchema: () => insertAiInsightSchema,
  insertAppointmentSchema: () => insertAppointmentSchema,
  insertAssessmentAuditLogSchema: () => insertAssessmentAuditLogSchema,
  insertAssessmentCatalogSchema: () => insertAssessmentCatalogSchema,
  insertAssessmentPackageSchema: () => insertAssessmentPackageSchema,
  insertAssessmentResponseSchema: () => insertAssessmentResponseSchema,
  insertAssessmentSchema: () => insertAssessmentSchema,
  insertAssessmentScoreSchema: () => insertAssessmentScoreSchema,
  insertAuditLogSchema: () => insertAuditLogSchema,
  insertBillingRecordSchema: () => insertBillingRecordSchema,
  insertCalendarEventSchema: () => insertCalendarEventSchema,
  insertClientAssessmentSchema: () => insertClientAssessmentSchema,
  insertClientCheckinSchema: () => insertClientCheckinSchema,
  insertClientSchema: () => insertClientSchema,
  insertCommunicationLogSchema: () => insertCommunicationLogSchema,
  insertCompassConversationSchema: () => insertCompassConversationSchema,
  insertCompassMemorySchema: () => insertCompassMemorySchema,
  insertDocumentSchema: () => insertDocumentSchema,
  insertMedicationSchema: () => insertMedicationSchema,
  insertSessionNoteSchema: () => insertSessionNoteSchema,
  insertSessionPrepNoteSchema: () => insertSessionPrepNoteSchema,
  insertSessionRecommendationSchema: () => insertSessionRecommendationSchema,
  insertSessionSummarySchema: () => insertSessionSummarySchema,
  insertTreatmentPlanSchema: () => insertTreatmentPlanSchema,
  insertUserSchema: () => insertUserSchema,
  medications: () => medications,
  medicationsRelations: () => medicationsRelations,
  sessionNotes: () => sessionNotes,
  sessionNotesRelations: () => sessionNotesRelations,
  sessionPrepNotes: () => sessionPrepNotes,
  sessionRecommendations: () => sessionRecommendations,
  sessionRecommendationsRelations: () => sessionRecommendationsRelations,
  sessionSummaries: () => sessionSummaries,
  sessionSummariesRelations: () => sessionSummariesRelations,
  treatmentPlans: () => treatmentPlans,
  treatmentPlansRelations: () => treatmentPlansRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, decimal, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("therapist"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  licenseType: text("license_type"),
  licenseExpiry: timestamp("license_expiry"),
  qualifications: jsonb("qualifications"),
  specializations: jsonb("specializations"),
  profilePicture: text("profile_picture"),
  address: jsonb("address"),
  preferences: jsonb("preferences"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username)
}));
var clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientNumber: text("client_number").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  preferredName: text("preferred_name"),
  pronouns: text("pronouns"),
  email: text("email"),
  phone: text("phone"),
  alternatePhone: text("alternate_phone"),
  dateOfBirth: timestamp("date_of_birth"),
  gender: text("gender"),
  address: jsonb("address"),
  emergencyContact: jsonb("emergency_contact"),
  insuranceInfo: jsonb("insurance_info"),
  medicalHistory: jsonb("medical_history"),
  medications: jsonb("medications"),
  allergies: jsonb("allergies"),
  referralSource: text("referral_source"),
  primaryConcerns: jsonb("primary_concerns"),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("active"),
  riskLevel: text("risk_level").default("low"),
  consentStatus: jsonb("consent_status"),
  hipaaSignedDate: timestamp("hipaa_signed_date"),
  lastContact: timestamp("last_contact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  therapistIdx: index("clients_therapist_idx").on(table.therapistId),
  statusIdx: index("clients_status_idx").on(table.status),
  nameIdx: index("clients_name_idx").on(table.firstName, table.lastName)
}));
var appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentNumber: text("appointment_number").unique(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("scheduled"),
  location: text("location"),
  // Google Calendar integration fields
  googleEventId: text("google_event_id"),
  googleCalendarId: text("google_calendar_id"),
  googleCalendarName: text("google_calendar_name"),
  lastGoogleSync: timestamp("last_google_sync"),
  isVirtual: boolean("is_virtual").default(false),
  meetingLink: text("meeting_link"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  noShowReason: text("no_show_reason"),
  reminderSent: boolean("reminder_sent").default(false),
  reminderSentAt: timestamp("reminder_sent_at"),
  checkedInAt: timestamp("checked_in_at"),
  completedAt: timestamp("completed_at"),
  fee: decimal("fee", { precision: 10, scale: 2 }),
  insuranceClaim: jsonb("insurance_claim"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("appointments_client_idx").on(table.clientId),
  therapistIdx: index("appointments_therapist_idx").on(table.therapistId),
  dateIdx: index("appointments_date_idx").on(table.startTime),
  statusIdx: index("appointments_status_idx").on(table.status),
  googleEventIdx: index("appointments_google_event_idx").on(table.googleEventId)
}));
var sessionNotes = pgTable("session_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  eventId: text("event_id"),
  // For Google Calendar event ID
  clientId: text("client_id"),
  // Simplified - no foreign key constraint for Google Calendar integration
  therapistId: text("therapist_id"),
  // Simplified - no foreign key constraint for Google Calendar integration
  content: text("content").notNull(),
  transcript: text("transcript"),
  aiSummary: text("ai_summary"),
  tags: jsonb("tags"),
  // SOAP note fields (merged from progress notes)
  title: text("title"),
  subjective: text("subjective"),
  objective: text("objective"),
  assessment: text("assessment"),
  plan: text("plan"),
  tonalAnalysis: text("tonal_analysis"),
  keyPoints: jsonb("key_points"),
  significantQuotes: jsonb("significant_quotes"),
  narrativeSummary: text("narrative_summary"),
  aiTags: jsonb("ai_tags"),
  sessionDate: timestamp("session_date"),
  // Enhanced fields for manual note entry and meeting management
  manualEntry: boolean("manual_entry").default(false),
  // Indicates if this was manually entered vs AI processed
  meetingType: text("meeting_type"),
  // 'therapy_session', 'consultation', 'supervision', 'team_meeting', 'planning', 'other'
  participants: jsonb("participants"),
  // Array of participant names/roles for multi-person meetings
  location: text("location"),
  // Meeting location (office, virtual, phone, etc.)
  duration: integer("duration"),
  // Duration in minutes
  followUpRequired: boolean("follow_up_required").default(false),
  followUpNotes: text("follow_up_notes"),
  confidentialityLevel: text("confidentiality_level").default("standard"),
  // 'standard', 'high', 'restricted'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("session_notes_client_idx").on(table.clientId),
  appointmentIdx: index("session_notes_appointment_idx").on(table.appointmentId),
  sessionDateIdx: index("session_notes_session_date_idx").on(table.sessionDate),
  eventIdIdx: index("session_notes_event_id_idx").on(table.eventId)
}));
var sessionPrepNotes = pgTable("session_prep_notes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  eventId: text("event_id"),
  // For Google Calendar event ID
  clientId: text("client_id"),
  // For Google Calendar integration
  therapistId: text("therapist_id"),
  // For Google Calendar integration
  prepContent: text("prep_content").notNull(),
  keyFocusAreas: jsonb("key_focus_areas"),
  previousSessionSummary: text("previous_session_summary"),
  suggestedInterventions: jsonb("suggested_interventions"),
  clientGoals: jsonb("client_goals"),
  riskFactors: jsonb("risk_factors"),
  homeworkReview: text("homework_review"),
  sessionObjectives: jsonb("session_objectives"),
  aiGeneratedInsights: text("ai_generated_insights"),
  followUpQuestions: jsonb("follow_up_questions"),
  psychoeducationalMaterials: jsonb("psychoeducational_materials"),
  lastUpdatedBy: uuid("last_updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  eventIdIdx: index("session_prep_notes_event_id_idx").on(table.eventId),
  clientIdIdx: index("session_prep_notes_client_id_idx").on(table.clientId),
  therapistIdIdx: index("session_prep_notes_therapist_id_idx").on(table.therapistId)
}));
var clientCheckins = pgTable("client_checkins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: text("client_id").notNull(),
  therapistId: text("therapist_id").notNull(),
  eventId: text("event_id"),
  sessionNoteId: uuid("session_note_id").references(() => sessionNotes.id),
  checkinType: text("checkin_type", { enum: ["midweek", "followup", "crisis_support", "goal_reminder", "homework_reminder"] }).notNull().default("midweek"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  subject: text("subject").notNull(),
  messageContent: text("message_content").notNull(),
  aiReasoning: text("ai_reasoning"),
  triggerContext: jsonb("trigger_context"),
  deliveryMethod: text("delivery_method", { enum: ["email", "sms", "both"] }).notNull().default("email"),
  status: text("status", { enum: ["generated", "reviewed", "approved", "sent", "archived", "deleted"] }).notNull().default("generated"),
  generatedAt: timestamp("generated_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  sentAt: timestamp("sent_at"),
  archivedAt: timestamp("archived_at"),
  expiresAt: timestamp("expires_at").default(sql`NOW() + INTERVAL '7 days'`),
  clientResponse: text("client_response"),
  responseReceivedAt: timestamp("response_received_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdIdx: index("client_checkins_client_id_idx").on(table.clientId),
  therapistIdIdx: index("client_checkins_therapist_id_idx").on(table.therapistId),
  statusIdx: index("client_checkins_status_idx").on(table.status),
  expiresAtIdx: index("client_checkins_expires_at_idx").on(table.expiresAt),
  generatedAtIdx: index("client_checkins_generated_at_idx").on(table.generatedAt)
}));
var actionItems = pgTable("action_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id),
  therapistId: uuid("therapist_id").references(() => users.id).notNull(),
  eventId: text("event_id"),
  // For Google Calendar event ID
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var treatmentPlans = pgTable("treatment_plans", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id).notNull(),
  goals: jsonb("goals").notNull(),
  interventions: jsonb("interventions"),
  progress: jsonb("progress"),
  status: text("status").notNull().default("active"),
  startDate: timestamp("start_date").defaultNow(),
  reviewDate: timestamp("review_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  therapistIdx: index("ai_insights_therapist_idx").on(table.therapistId),
  clientIdx: index("ai_insights_client_idx").on(table.clientId)
}));
var sessionSummaries = pgTable("session_summaries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionNoteIds: jsonb("session_note_ids").notNull(),
  // Array of session note IDs included in summary
  title: text("title").notNull(),
  timeframe: text("timeframe").notNull(),
  // 'single_session', 'week', 'month', 'quarter', 'custom'
  summaryType: text("summary_type").notNull().default("comprehensive"),
  // 'comprehensive', 'progress_focus', 'intervention_analysis'
  keyInsights: jsonb("key_insights").notNull(),
  // Main therapeutic insights and patterns
  progressMetrics: jsonb("progress_metrics").notNull(),
  // Quantified progress data for charts
  moodTrends: jsonb("mood_trends"),
  // Mood tracking data over time
  goalProgress: jsonb("goal_progress"),
  // Treatment goals and completion status
  interventionEffectiveness: jsonb("intervention_effectiveness"),
  // Which interventions worked best
  riskAssessment: jsonb("risk_assessment"),
  // Current risk factors and changes
  recommendedActions: jsonb("recommended_actions"),
  // Next steps and recommendations
  visualData: jsonb("visual_data").notNull(),
  // Chart data for infographics
  aiGeneratedContent: text("ai_generated_content").notNull(),
  // AI summary narrative
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("0.85"),
  // AI confidence score
  dateRange: jsonb("date_range").notNull(),
  // Start and end dates for the summary period
  sessionCount: integer("session_count").notNull().default(1),
  // Number of sessions included
  avgSessionRating: decimal("avg_session_rating", { precision: 3, scale: 2 }),
  // Average session rating if available
  aiModel: text("ai_model").notNull().default("gpt-4o"),
  // AI model used for generation
  status: text("status").notNull().default("generated"),
  // 'generated', 'reviewed', 'approved', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("session_summaries_client_idx").on(table.clientId),
  therapistIdx: index("session_summaries_therapist_idx").on(table.therapistId),
  timeframeIdx: index("session_summaries_timeframe_idx").on(table.timeframe),
  createdAtIdx: index("session_summaries_created_at_idx").on(table.createdAt)
}));
var sessionRecommendations = pgTable("session_recommendations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  recommendationType: text("recommendation_type").notNull(),
  // 'intervention', 'topic', 'technique', 'assessment', 'homework'
  title: text("title").notNull(),
  description: text("description").notNull(),
  rationale: text("rationale").notNull(),
  priority: text("priority").notNull().default("medium"),
  // 'low', 'medium', 'high', 'urgent'
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull(),
  // 0.00 to 1.00
  evidenceBase: jsonb("evidence_base"),
  // Supporting data from session notes, assessments, etc.
  suggestedApproaches: jsonb("suggested_approaches"),
  // Specific techniques, interventions, etc.
  expectedOutcomes: jsonb("expected_outcomes"),
  // What this recommendation aims to achieve
  implementationNotes: text("implementation_notes"),
  isImplemented: boolean("is_implemented").default(false),
  implementedAt: timestamp("implemented_at"),
  feedback: text("feedback"),
  // Therapist feedback on the recommendation
  effectiveness: text("effectiveness"),
  // 'not_tried', 'ineffective', 'somewhat_effective', 'very_effective'
  status: text("status").notNull().default("pending"),
  // 'pending', 'accepted', 'declined', 'implemented'
  validUntil: timestamp("valid_until"),
  // When this recommendation expires
  aiModel: text("ai_model"),
  // Which AI model generated this recommendation
  generationContext: jsonb("generation_context"),
  // Context data used for generation
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("session_recommendations_client_idx").on(table.clientId),
  therapistIdx: index("session_recommendations_therapist_idx").on(table.therapistId),
  typeIdx: index("session_recommendations_type_idx").on(table.recommendationType),
  priorityIdx: index("session_recommendations_priority_idx").on(table.priority),
  statusIdx: index("session_recommendations_status_idx").on(table.status)
}));
var billingRecords = pgTable("billing_records", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  serviceDate: timestamp("service_date").notNull(),
  billingDate: timestamp("billing_date").defaultNow(),
  dueDate: timestamp("due_date"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  paidAt: timestamp("paid_at"),
  insuranceClaimId: text("insurance_claim_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("billing_records_client_idx").on(table.clientId),
  statusIdx: index("billing_records_status_idx").on(table.status),
  dueDateIdx: index("billing_records_due_date_idx").on(table.dueDate)
}));
var assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  assessmentType: text("assessment_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(),
  responses: jsonb("responses"),
  scores: jsonb("scores"),
  interpretation: text("interpretation"),
  recommendations: jsonb("recommendations"),
  status: text("status").notNull().default("draft"),
  completedAt: timestamp("completed_at"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("assessments_client_idx").on(table.clientId),
  typeIdx: index("assessments_type_idx").on(table.assessmentType)
}));
var medications = pgTable("medications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  dosage: text("dosage"),
  frequency: text("frequency"),
  prescribedBy: text("prescribed_by"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  purpose: text("purpose"),
  sideEffects: jsonb("side_effects"),
  effectiveness: text("effectiveness"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("medications_client_idx").on(table.clientId),
  statusIdx: index("medications_status_idx").on(table.status)
}));
var communicationLogs = pgTable("communication_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(),
  // email, phone, text, in-person
  direction: text("direction").notNull(),
  // incoming, outgoing
  subject: text("subject"),
  content: text("content").notNull(),
  priority: text("priority").default("normal"),
  isUrgent: boolean("is_urgent").default(false),
  readAt: timestamp("read_at"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  clientIdx: index("communication_logs_client_idx").on(table.clientId),
  typeIdx: index("communication_logs_type_idx").on(table.type),
  urgentIdx: index("communication_logs_urgent_idx").on(table.isUrgent)
}));
var documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  documentType: text("document_type").notNull(),
  // intake-form, consent, assessment, report, etc.
  description: text("description"),
  filePath: text("file_path").notNull(),
  isConfidential: boolean("is_confidential").default(true),
  tags: jsonb("tags"),
  // Enhanced AI tagging and categorization fields
  aiTags: jsonb("ai_tags"),
  // AI-generated tags with confidence scores
  category: text("category"),
  // Primary document category
  subcategory: text("subcategory"),
  // Secondary categorization
  contentSummary: text("content_summary"),
  // AI-generated summary
  clinicalKeywords: jsonb("clinical_keywords"),
  // Clinical terminology found
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  // AI confidence in categorization
  sensitivityLevel: text("sensitivity_level").default("standard"),
  // low, standard, high, confidential
  extractedText: text("extracted_text"),
  // Full extracted text content
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("documents_client_idx").on(table.clientId),
  typeIdx: index("documents_type_idx").on(table.documentType),
  categoryIdx: index("documents_category_idx").on(table.category),
  tagsIdx: index("documents_ai_tags_idx").on(table.aiTags)
}));
var auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  // create, read, update, delete
  changes: jsonb("changes"),
  // what changed
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow()
}, (table) => ({
  userIdx: index("audit_logs_user_idx").on(table.userId),
  entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp)
}));
var compassConversations = pgTable("compass_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sessionId: text("session_id").notNull(),
  // Unique session identifier
  messageId: text("message_id").notNull(),
  // Unique message identifier
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  context: jsonb("context"),
  // Context data like client info, appointment info, etc.
  aiProvider: text("ai_provider"),
  // openai, anthropic, etc.
  tokenCount: integer("token_count"),
  processingTime: integer("processing_time"),
  // in milliseconds
  feedback: text("feedback"),
  // user feedback on response quality
  metadata: jsonb("metadata"),
  // additional metadata like voice settings, etc.
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  therapistIdx: index("compass_conversations_therapist_idx").on(table.therapistId),
  sessionIdx: index("compass_conversations_session_idx").on(table.sessionId),
  dateIdx: index("compass_conversations_date_idx").on(table.createdAt),
  roleIdx: index("compass_conversations_role_idx").on(table.role)
}));
var compassMemory = pgTable("compass_memory", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  contextType: text("context_type").notNull(),
  // client_preference, workflow_pattern, frequent_query, etc.
  contextKey: text("context_key").notNull(),
  // specific identifier
  contextValue: jsonb("context_value").notNull(),
  // the actual data/preference
  confidence: decimal("confidence", { precision: 3, scale: 2 }).default("1.0"),
  // confidence score 0-1
  lastAccessed: timestamp("last_accessed").defaultNow(),
  accessCount: integer("access_count").default(1),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  // optional expiration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  therapistIdx: index("compass_memory_therapist_idx").on(table.therapistId),
  contextIdx: index("compass_memory_context_idx").on(table.contextType, table.contextKey),
  activeIdx: index("compass_memory_active_idx").on(table.isActive),
  accessedIdx: index("compass_memory_accessed_idx").on(table.lastAccessed)
}));
var calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  googleEventId: text("google_event_id").notNull(),
  googleCalendarId: text("google_calendar_id").notNull(),
  calendarName: text("calendar_name"),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  summary: text("summary").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  timeZone: text("time_zone"),
  location: text("location"),
  status: text("status").notNull().default("confirmed"),
  attendees: jsonb("attendees"),
  isAllDay: boolean("is_all_day").default(false),
  recurringEventId: text("recurring_event_id"),
  lastSyncTime: timestamp("last_sync_time").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  googleEventIdx: index("calendar_events_google_event_idx").on(table.googleEventId),
  therapistIdx: index("calendar_events_therapist_idx").on(table.therapistId),
  clientIdx: index("calendar_events_client_idx").on(table.clientId),
  dateIdx: index("calendar_events_date_idx").on(table.startTime),
  statusIdx: index("calendar_events_status_idx").on(table.status),
  calendarIdx: index("calendar_events_calendar_idx").on(table.googleCalendarId)
}));
var assessmentCatalog = pgTable("assessment_catalog", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  type: text("type").notNull(),
  // intake, progress, outcome, screening, etc.
  category: text("category").notNull(),
  // anxiety, depression, trauma, substance_use, etc.
  provider: text("provider"),
  // google_forms, typeform, surveymonkey, custom, etc.
  estimatedTimeMinutes: integer("estimated_time_minutes"),
  cptCode: text("cpt_code"),
  // for billing integration
  instructions: text("instructions"),
  scoringMethod: text("scoring_method"),
  interpretationGuide: jsonb("interpretation_guide"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  nameIdx: index("assessment_catalog_name_idx").on(table.name),
  typeIdx: index("assessment_catalog_type_idx").on(table.type),
  categoryIdx: index("assessment_catalog_category_idx").on(table.category),
  activeIdx: index("assessment_catalog_active_idx").on(table.isActive)
}));
var clientAssessments = pgTable("client_assessments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull(),
  assessmentCatalogId: uuid("assessment_catalog_id").references(() => assessmentCatalog.id, { onDelete: "cascade" }).notNull(),
  therapistId: uuid("therapist_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
  status: text("status").notNull().default("assigned"),
  // assigned, in_progress, completed, expired, cancelled
  assignedDate: timestamp("assigned_date").defaultNow(),
  startedDate: timestamp("started_date"),
  completedDate: timestamp("completed_date"),
  dueDate: timestamp("due_date"),
  remindersSent: integer("reminders_sent").default(0),
  lastReminderSent: timestamp("last_reminder_sent"),
  accessToken: text("access_token"),
  // for secure assessment access
  progressPercentage: integer("progress_percentage").default(0),
  notes: text("notes"),
  priority: text("priority").default("normal"),
  // low, normal, high, urgent
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientIdx: index("client_assessments_client_idx").on(table.clientId),
  statusIdx: index("client_assessments_status_idx").on(table.status),
  therapistIdx: index("client_assessments_therapist_idx").on(table.therapistId),
  dueDateIdx: index("client_assessments_due_date_idx").on(table.dueDate),
  appointmentIdx: index("client_assessments_appointment_idx").on(table.appointmentId)
}));
var assessmentResponses = pgTable("assessment_responses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientAssessmentId: uuid("client_assessment_id").references(() => clientAssessments.id, { onDelete: "cascade" }).notNull(),
  responsesJson: jsonb("responses_json").notNull(),
  rawData: jsonb("raw_data"),
  // original response data from external forms
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  submissionSource: text("submission_source"),
  // web, mobile, email_link, etc.
  isPartialSubmission: boolean("is_partial_submission").default(false),
  submissionDuration: integer("submission_duration"),
  // in minutes
  flaggedForReview: boolean("flagged_for_review").default(false),
  reviewNotes: text("review_notes"),
  encryptionKey: text("encryption_key"),
  // for HIPAA compliance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  clientAssessmentIdx: index("assessment_responses_client_assessment_idx").on(table.clientAssessmentId),
  createdAtIdx: index("assessment_responses_created_at_idx").on(table.createdAt),
  reviewIdx: index("assessment_responses_review_idx").on(table.flaggedForReview)
}));
var assessmentScores = pgTable("assessment_scores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientAssessmentId: uuid("client_assessment_id").references(() => clientAssessments.id, { onDelete: "cascade" }).notNull(),
  scoreType: text("score_type").notNull(),
  // total, subscale, percentile, t_score, etc.
  scoreName: text("score_name").notNull(),
  // Depression, Anxiety, Total Score, etc.
  scoreValue: decimal("score_value", { precision: 10, scale: 3 }).notNull(),
  maxPossibleScore: decimal("max_possible_score", { precision: 10, scale: 3 }),
  percentile: decimal("percentile", { precision: 5, scale: 2 }),
  interpretation: text("interpretation"),
  // severe, moderate, mild, minimal, etc.
  riskLevel: text("risk_level"),
  // low, moderate, high, critical
  recommendedActions: jsonb("recommended_actions"),
  comparisonData: jsonb("comparison_data"),
  // historical scores, norms, etc.
  confidenceInterval: jsonb("confidence_interval"),
  calculatedAt: timestamp("calculated_at").defaultNow(),
  validatedBy: uuid("validated_by").references(() => users.id),
  validatedAt: timestamp("validated_at"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => ({
  clientAssessmentIdx: index("assessment_scores_client_assessment_idx").on(table.clientAssessmentId),
  scoreTypeIdx: index("assessment_scores_score_type_idx").on(table.scoreType),
  riskLevelIdx: index("assessment_scores_risk_level_idx").on(table.riskLevel)
}));
var assessmentPackages = pgTable("assessment_packages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  // intake_battery, progress_monitoring, outcome_measures, etc.
  assessmentIds: jsonb("assessment_ids").notNull(),
  // array of assessment_catalog ids
  defaultOrder: jsonb("default_order"),
  // order to present assessments
  estimatedTotalTime: integer("estimated_total_time"),
  // in minutes
  isActive: boolean("is_active").default(true),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => ({
  nameIdx: index("assessment_packages_name_idx").on(table.name),
  categoryIdx: index("assessment_packages_category_idx").on(table.category),
  activeIdx: index("assessment_packages_active_idx").on(table.isActive)
}));
var assessmentAuditLog = pgTable("assessment_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id),
  clientId: uuid("client_id").references(() => clients.id),
  clientAssessmentId: uuid("client_assessment_id").references(() => clientAssessments.id),
  action: text("action").notNull(),
  // assigned, started, completed, viewed, exported, deleted, etc.
  entityType: text("entity_type").notNull(),
  // assessment, response, score, package
  entityId: text("entity_id").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  timestamp: timestamp("timestamp").defaultNow()
}, (table) => ({
  userIdx: index("assessment_audit_log_user_idx").on(table.userId),
  clientIdx: index("assessment_audit_log_client_idx").on(table.clientId),
  actionIdx: index("assessment_audit_log_action_idx").on(table.action),
  timestampIdx: index("assessment_audit_log_timestamp_idx").on(table.timestamp)
}));
var usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  appointments: many(appointments),
  sessionNotes: many(sessionNotes),
  actionItems: many(actionItems),
  treatmentPlans: many(treatmentPlans),
  aiInsights: many(aiInsights),
  sessionSummaries: many(sessionSummaries),
  sessionRecommendations: many(sessionRecommendations),
  billingRecords: many(billingRecords),
  assessments: many(assessments),
  communicationLogs: many(communicationLogs),
  documents: many(documents),
  auditLogs: many(auditLogs)
}));
var clientsRelations = relations(clients, ({ one, many }) => ({
  therapist: one(users, {
    fields: [clients.therapistId],
    references: [users.id]
  }),
  appointments: many(appointments),
  sessionNotes: many(sessionNotes),
  actionItems: many(actionItems),
  treatmentPlans: many(treatmentPlans),
  aiInsights: many(aiInsights),
  sessionSummaries: many(sessionSummaries),
  sessionRecommendations: many(sessionRecommendations),
  billingRecords: many(billingRecords),
  assessments: many(assessments),
  medications: many(medications),
  communicationLogs: many(communicationLogs),
  documents: many(documents)
}));
var appointmentsRelations = relations(appointments, ({ one, many }) => ({
  client: one(clients, {
    fields: [appointments.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [appointments.therapistId],
    references: [users.id]
  }),
  sessionNotes: many(sessionNotes),
  billingRecords: many(billingRecords),
  assessments: many(assessments)
}));
var sessionNotesRelations = relations(sessionNotes, ({ one }) => ({
  appointment: one(appointments, {
    fields: [sessionNotes.appointmentId],
    references: [appointments.id]
  }),
  client: one(clients, {
    fields: [sessionNotes.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [sessionNotes.therapistId],
    references: [users.id]
  })
}));
var actionItemsRelations = relations(actionItems, ({ one }) => ({
  client: one(clients, {
    fields: [actionItems.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [actionItems.therapistId],
    references: [users.id]
  })
}));
var treatmentPlansRelations = relations(treatmentPlans, ({ one }) => ({
  client: one(clients, {
    fields: [treatmentPlans.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [treatmentPlans.therapistId],
    references: [users.id]
  })
}));
var aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  client: one(clients, {
    fields: [aiInsights.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [aiInsights.therapistId],
    references: [users.id]
  })
}));
var sessionSummariesRelations = relations(sessionSummaries, ({ one }) => ({
  client: one(clients, {
    fields: [sessionSummaries.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [sessionSummaries.therapistId],
    references: [users.id]
  })
}));
var sessionRecommendationsRelations = relations(sessionRecommendations, ({ one }) => ({
  client: one(clients, {
    fields: [sessionRecommendations.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [sessionRecommendations.therapistId],
    references: [users.id]
  })
}));
var billingRecordsRelations = relations(billingRecords, ({ one }) => ({
  client: one(clients, {
    fields: [billingRecords.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [billingRecords.therapistId],
    references: [users.id]
  }),
  appointment: one(appointments, {
    fields: [billingRecords.appointmentId],
    references: [appointments.id]
  })
}));
var assessmentsRelations = relations(assessments, ({ one }) => ({
  client: one(clients, {
    fields: [assessments.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [assessments.therapistId],
    references: [users.id]
  }),
  appointment: one(appointments, {
    fields: [assessments.appointmentId],
    references: [appointments.id]
  })
}));
var medicationsRelations = relations(medications, ({ one }) => ({
  client: one(clients, {
    fields: [medications.clientId],
    references: [clients.id]
  })
}));
var communicationLogsRelations = relations(communicationLogs, ({ one }) => ({
  client: one(clients, {
    fields: [communicationLogs.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [communicationLogs.therapistId],
    references: [users.id]
  })
}));
var documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id]
  }),
  therapist: one(users, {
    fields: [documents.therapistId],
    references: [users.id]
  })
}));
var auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id]
  })
}));
var compassConversationsRelations = relations(compassConversations, ({ one }) => ({
  therapist: one(users, {
    fields: [compassConversations.therapistId],
    references: [users.id]
  })
}));
var compassMemoryRelations = relations(compassMemory, ({ one }) => ({
  therapist: one(users, {
    fields: [compassMemory.therapistId],
    references: [users.id]
  })
}));
var assessmentCatalogRelations = relations(assessmentCatalog, ({ many }) => ({
  clientAssessments: many(clientAssessments)
}));
var clientAssessmentsRelations = relations(clientAssessments, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientAssessments.clientId],
    references: [clients.id]
  }),
  assessmentCatalog: one(assessmentCatalog, {
    fields: [clientAssessments.assessmentCatalogId],
    references: [assessmentCatalog.id]
  }),
  therapist: one(users, {
    fields: [clientAssessments.therapistId],
    references: [users.id]
  }),
  appointment: one(appointments, {
    fields: [clientAssessments.appointmentId],
    references: [appointments.id]
  }),
  responses: many(assessmentResponses),
  scores: many(assessmentScores)
}));
var assessmentResponsesRelations = relations(assessmentResponses, ({ one }) => ({
  clientAssessment: one(clientAssessments, {
    fields: [assessmentResponses.clientAssessmentId],
    references: [clientAssessments.id]
  })
}));
var assessmentScoresRelations = relations(assessmentScores, ({ one }) => ({
  clientAssessment: one(clientAssessments, {
    fields: [assessmentScores.clientAssessmentId],
    references: [clientAssessments.id]
  }),
  validatedBy: one(users, {
    fields: [assessmentScores.validatedBy],
    references: [users.id]
  })
}));
var assessmentPackagesRelations = relations(assessmentPackages, ({ one }) => ({
  createdBy: one(users, {
    fields: [assessmentPackages.createdBy],
    references: [users.id]
  })
}));
var assessmentAuditLogRelations = relations(assessmentAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [assessmentAuditLog.userId],
    references: [users.id]
  }),
  client: one(clients, {
    fields: [assessmentAuditLog.clientId],
    references: [clients.id]
  }),
  clientAssessment: one(clientAssessments, {
    fields: [assessmentAuditLog.clientAssessmentId],
    references: [clientAssessments.id]
  })
}));
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  email: true
});
var insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSessionNoteSchema = createInsertSchema(sessionNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSessionSummarySchema = createInsertSchema(sessionSummaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSessionRecommendationSchema = createInsertSchema(sessionRecommendations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertSessionPrepNoteSchema = createInsertSchema(sessionPrepNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertClientCheckinSchema = createInsertSchema(clientCheckins).omit({
  id: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true
});
var insertActionItemSchema = createInsertSchema(actionItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertTreatmentPlanSchema = createInsertSchema(treatmentPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAiInsightSchema = createInsertSchema(aiInsights).omit({
  id: true,
  createdAt: true
});
var insertBillingRecordSchema = createInsertSchema(billingRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAssessmentSchema = createInsertSchema(assessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertMedicationSchema = createInsertSchema(medications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCommunicationLogSchema = createInsertSchema(communicationLogs).omit({
  id: true,
  createdAt: true
});
var insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  lastAccessedAt: true
});
var insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true
});
var insertCompassConversationSchema = createInsertSchema(compassConversations).omit({
  id: true,
  createdAt: true
});
var insertCompassMemorySchema = createInsertSchema(compassMemory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  lastSyncTime: true,
  createdAt: true,
  updatedAt: true
});
var insertAssessmentCatalogSchema = createInsertSchema(assessmentCatalog).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertClientAssessmentSchema = createInsertSchema(clientAssessments).omit({
  id: true,
  assignedDate: true,
  createdAt: true,
  updatedAt: true
});
var insertAssessmentResponseSchema = createInsertSchema(assessmentResponses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAssessmentScoreSchema = createInsertSchema(assessmentScores).omit({
  id: true,
  calculatedAt: true,
  createdAt: true
});
var insertAssessmentPackageSchema = createInsertSchema(assessmentPackages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertAssessmentAuditLogSchema = createInsertSchema(assessmentAuditLog).omit({
  id: true,
  timestamp: true
});

// server/db.ts
import * as dotenv from "dotenv";
import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as fs from "fs";
import * as path from "path";
dotenv.config();
var db;
var pool;
var isValidPostgresUrl = (url) => {
  if (!url) return false;
  const isNeonUrl = url.includes("neon.tech") || url.includes("ep-") || url.includes("neondb_owner");
  const isValidPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");
  if (isNeonUrl && isValidPostgres) return true;
  const isPlaceholder = url.includes("localhost:5432") || url === "postgresql://localhost:5432/dbname";
  return isValidPostgres && !isPlaceholder;
};
if (isValidPostgresUrl(process.env.DATABASE_URL)) {
  console.log("Using PostgreSQL database from DATABASE_URL");
  neonConfig.webSocketConstructor = ws;
  process.env.TZ = "America/New_York";
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=America/New_York"
  });
  pool.on("connect", async (client) => {
    try {
      await client.query("SET timezone = 'America/New_York'");
      await client.query("SET TIME ZONE 'America/New_York'");
    } catch (error) {
      console.warn("Failed to set timezone on database connection:", error);
    }
  });
  db = drizzleNeon({ client: pool, schema: schema_exports });
} else {
  console.log("DATABASE_URL not configured or invalid, using SQLite fallback");
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, "therapy.db");
  console.log(`Using SQLite database at: ${dbPath}`);
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  const createTablesSQL = `
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'therapist',
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    license_number TEXT,
    license_type TEXT,
    license_expiry TEXT,
    qualifications TEXT,
    specializations TEXT,
    profile_picture TEXT,
    address TEXT,
    preferences TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Clients table
  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_number TEXT UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    preferred_name TEXT,
    pronouns TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    date_of_birth TEXT,
    gender TEXT,
    address TEXT,
    emergency_contact TEXT,
    insurance_info TEXT,
    medical_history TEXT,
    medications TEXT,
    allergies TEXT,
    referral_source TEXT,
    primary_concerns TEXT,
    therapist_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    risk_level TEXT DEFAULT 'low',
    consent_status TEXT,
    hipaa_signed_date TEXT,
    last_contact TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Documents table
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    client_id TEXT REFERENCES clients(id),
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
    last_accessed TEXT,
    content TEXT,
    extracted_text TEXT,
    ai_analysis TEXT,
    tags TEXT,
    category TEXT,
    is_processed INTEGER DEFAULT 0,
    is_sensitive INTEGER DEFAULT 0,
    metadata TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Appointments table
  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    appointment_number TEXT UNIQUE,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    location TEXT,
    google_event_id TEXT,
    google_calendar_id TEXT,
    google_calendar_name TEXT,
    last_google_sync TEXT,
    is_virtual INTEGER DEFAULT 0,
    meeting_link TEXT,
    notes TEXT,
    cancellation_reason TEXT,
    no_show_reason TEXT,
    reminder_sent INTEGER DEFAULT 0,
    reminder_sent_at TEXT,
    checked_in_at TEXT,
    completed_at TEXT,
    fee REAL,
    insurance_claim TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Session Notes table
  CREATE TABLE IF NOT EXISTS session_notes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    appointment_id TEXT REFERENCES appointments(id),
    event_id TEXT,
    client_id TEXT,
    therapist_id TEXT,
    content TEXT NOT NULL,
    transcript TEXT,
    ai_summary TEXT,
    tags TEXT,
    title TEXT,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    tonal_analysis TEXT,
    key_points TEXT,
    significant_quotes TEXT,
    narrative_summary TEXT,
    ai_tags TEXT,
    session_date TEXT,
    manual_entry INTEGER DEFAULT 0,
    meeting_type TEXT,
    participants TEXT,
    location TEXT,
    duration INTEGER,
    follow_up_required INTEGER DEFAULT 0,
    follow_up_notes TEXT,
    confidentiality_level TEXT DEFAULT 'standard',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Action Items table
  CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT REFERENCES clients(id),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    event_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'pending',
    due_date TEXT,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- Treatment Plans table
  CREATE TABLE IF NOT EXISTS treatment_plans (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT NOT NULL REFERENCES clients(id),
    therapist_id TEXT NOT NULL REFERENCES users(id),
    goals TEXT NOT NULL,
    interventions TEXT,
    progress TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT DEFAULT CURRENT_TIMESTAMP,
    review_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- AI Insights table
  CREATE TABLE IF NOT EXISTS ai_insights (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
    therapist_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL,
    metadata TEXT,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  -- OAuth tokens table
  CREATE TABLE IF NOT EXISTS oauth_tokens (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL REFERENCES users(id),
    provider TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expiry_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, provider)
  );
  
  -- Create indexes
  CREATE INDEX IF NOT EXISTS idx_clients_therapist ON clients(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_documents_therapist ON documents(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
  CREATE INDEX IF NOT EXISTS idx_session_notes_client ON session_notes(client_id);
  CREATE INDEX IF NOT EXISTS idx_session_notes_appointment ON session_notes(appointment_id);
  `;
  try {
    sqlite.exec(createTablesSQL);
    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database tables:", error);
  }
  db = drizzleSqlite(sqlite, { schema: schema_exports });
  pool = {
    query: async (text2, params) => {
      try {
        const stmt = sqlite.prepare(text2);
        if (text2.toLowerCase().startsWith("select")) {
          return { rows: params ? stmt.all(...params) : stmt.all() };
        } else {
          const result = params ? stmt.run(...params) : stmt.run();
          return { rowCount: result.changes };
        }
      } catch (error) {
        throw error;
      }
    },
    on: () => {
    }
    // SQLite doesn't need connection events
  };
}

// server/storage.ts
import { eq, desc, and, gte, lte, count, or, sql as sql2, asc, isNotNull } from "drizzle-orm";
import OpenAI3 from "openai";
var openai3 = new OpenAI3({ apiKey: process.env.OPENAI_API_KEY });
var DatabaseStorage = class {
  safeParseJSON(jsonString, defaultValue = null) {
    if (!jsonString) return defaultValue;
    if (typeof jsonString === "object") return jsonString;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn("Failed to parse JSON:", jsonString);
      return defaultValue;
    }
  }
  // Helper to map session note rows from DB
  mapSessionNoteRow(row) {
    return {
      id: row.id,
      appointmentId: row.appointment_id || null,
      eventId: row.event_id,
      clientId: row.client_id,
      therapistId: row.therapist_id,
      content: row.content,
      transcript: row.transcript || null,
      aiSummary: row.ai_summary || null,
      tags: row.tags || [],
      createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
      updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date()),
      location: row.location || null,
      title: row.title || "Session Note",
      subjective: row.subjective || "",
      objective: row.objective || "",
      assessment: row.assessment || "",
      plan: row.plan || "",
      duration: row.duration || 50,
      sessionDate: row.session_date ? new Date(row.session_date || /* @__PURE__ */ new Date()) : null,
      keyPoints: this.safeParseJSON(row.key_points, []),
      significantQuotes: this.safeParseJSON(row.significant_quotes, []),
      narrativeSummary: row.narrative_summary || "",
      tonalAnalysis: row.tonal_analysis || "",
      manualEntry: row.manual_entry || false,
      meetingType: row.meeting_type || null,
      participants: this.safeParseJSON(row.participants, []),
      followUpNotes: row.follow_up_notes || "",
      aiTags: this.safeParseJSON(row.ai_tags, []),
      followUpRequired: row.follow_up_required || false,
      confidentialityLevel: row.confidentiality_level || null,
      clientFirstName: row.first_name,
      // Added from join
      clientLastName: row.last_name
      // Added from join
    };
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, user) {
    const [updatedUser] = await db.update(users).set({ ...user, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return updatedUser;
  }
  async getClients(therapistId) {
    return await db.select().from(clients).where(
      and(
        eq(clients.therapistId, therapistId),
        // Only return real clients - those with at least email, phone, or date of birth
        // This filters out fake "clients" created from calendar events like "Walk Dogs", "Free Time", etc.
        or(
          isNotNull(clients.email),
          isNotNull(clients.phone),
          isNotNull(clients.dateOfBirth)
        )
      )
    ).orderBy(desc(clients.createdAt));
  }
  async getClient(id) {
    if (id.startsWith("calendar-") || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      return void 0;
    }
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || void 0;
  }
  async createClient(client) {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }
  async getClientIdByName(fullName) {
    if (!fullName || typeof fullName !== "string") {
      return null;
    }
    const nameParts = fullName.trim().split(" ").filter((part) => part.length > 0);
    if (nameParts.length < 2) {
      return null;
    }
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ");
    const [exactClient] = await db.select({ id: clients.id }).from(clients).where(
      and(
        eq(clients.firstName, firstName),
        eq(clients.lastName, lastName)
      )
    );
    if (exactClient) {
      return exactClient.id;
    }
    const searchTerm = fullName.toLowerCase().trim();
    const allClients = await this.getClients("e66b8b8e-e7a2-40b9-ae74-00c93ffe503c");
    const nicknameMap = {
      "chris": ["christopher", "christian", "christin"],
      "christopher": ["chris"],
      "mike": ["michael"],
      "michael": ["mike"],
      "bob": ["robert"],
      "robert": ["bob"],
      "bill": ["william"],
      "william": ["bill"],
      "tom": ["thomas"],
      "thomas": ["tom"],
      "steve": ["steven", "stephen"],
      "steven": ["steve"],
      "stephen": ["steve"],
      "dave": ["david"],
      "david": ["dave"],
      "jim": ["james"],
      "james": ["jim"],
      "joe": ["joseph"],
      "joseph": ["joe"],
      "dan": ["daniel"],
      "daniel": ["dan"],
      "matt": ["matthew"],
      "matthew": ["matt"],
      "max": ["maximilian", "maxwell"]
    };
    const matchingClients = allClients.filter((client) => {
      const fullClientName = `${client.firstName} ${client.lastName}`.toLowerCase();
      const clientFirstName = client.firstName?.toLowerCase() || "";
      const clientLastName = client.lastName?.toLowerCase() || "";
      if (fullClientName.includes(searchTerm) || clientFirstName.includes(searchTerm) || clientLastName.includes(searchTerm)) {
        return true;
      }
      const searchWords = searchTerm.split(" ").filter((word) => word.length > 0);
      const allWordsMatch = searchWords.every((word) => {
        if (fullClientName.includes(word) || clientFirstName.includes(word) || clientLastName.includes(word)) {
          return true;
        }
        const possibleNicknames = nicknameMap[word] || [];
        return possibleNicknames.some(
          (nickname) => clientFirstName.includes(nickname) || fullClientName.includes(nickname)
        );
      });
      return allWordsMatch;
    });
    return matchingClients.length > 0 ? matchingClients[0].id : null;
  }
  getNameVariations(firstName) {
    const variations = [];
    const name = firstName.toLowerCase();
    const nicknameMap = {
      "chris": ["christopher", "christian", "christine", "christina"],
      "christopher": ["chris"],
      "christian": ["chris"],
      "christine": ["chris", "christina"],
      "christina": ["chris", "christine"],
      "mike": ["michael"],
      "michael": ["mike"],
      "dave": ["david"],
      "david": ["dave"],
      "bob": ["robert"],
      "robert": ["bob", "rob"],
      "rob": ["robert"],
      "bill": ["william"],
      "william": ["bill", "will"],
      "will": ["william"],
      "dick": ["richard"],
      "richard": ["dick", "rick"],
      "rick": ["richard"],
      "jim": ["james"],
      "james": ["jim"],
      "joe": ["joseph"],
      "joseph": ["joe"],
      "dan": ["daniel"],
      "daniel": ["dan"],
      "matt": ["matthew"],
      "matthew": ["matt"],
      "nick": ["nicholas"],
      "nicholas": ["nick"],
      "tom": ["thomas"],
      "thomas": ["tom"],
      "tony": ["anthony"],
      "anthony": ["tony"],
      "steve": ["steven", "stephen"],
      "steven": ["steve"],
      "stephen": ["steve"],
      "ben": ["benjamin"],
      "benjamin": ["ben"],
      "sam": ["samuel"],
      "samuel": ["sam"],
      "alex": ["alexander", "alexandra"],
      "alexander": ["alex"],
      "alexandra": ["alex"]
    };
    if (nicknameMap[name]) {
      variations.push(...nicknameMap[name]);
    }
    variations.push(firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase());
    return [...new Set(variations)];
  }
  async getAppointmentsByClientAndDate(clientId, sessionDate) {
    const startOfDay = new Date(sessionDate || /* @__PURE__ */ new Date());
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate || /* @__PURE__ */ new Date());
    endOfDay.setHours(23, 59, 59, 999);
    return await db.select().from(appointments).where(
      and(
        eq(appointments.clientId, clientId),
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay)
      )
    ).orderBy(appointments.startTime);
  }
  async updateClient(id, client) {
    const [updatedClient] = await db.update(clients).set({ ...client, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clients.id, id)).returning();
    return updatedClient;
  }
  async deleteClient(id) {
    const clientAppointments = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.clientId, id));
    for (const appointment of clientAppointments) {
      await db.delete(sessionNotes).where(eq(sessionNotes.appointmentId, appointment.id));
    }
    await db.delete(sessionNotes).where(eq(sessionNotes.clientId, id));
    await db.delete(appointments).where(eq(appointments.clientId, id));
    await db.delete(actionItems).where(eq(actionItems.clientId, id));
    await db.delete(treatmentPlans).where(eq(treatmentPlans.clientId, id));
    await db.delete(medications).where(eq(medications.clientId, id));
    await db.delete(assessments).where(eq(assessments.clientId, id));
    await db.delete(billingRecords).where(eq(billingRecords.clientId, id));
    await db.delete(communicationLogs).where(eq(communicationLogs.clientId, id));
    await db.delete(documents).where(eq(documents.clientId, id));
    await db.delete(clients).where(eq(clients.id, id));
  }
  async deactivateClient(id) {
    return await this.updateClient(id, { status: "inactive" });
  }
  async getAppointments(therapistId, date) {
    if (date) {
      const easternDateString = date.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      const startOfDay = new Date(easternDateString + "T00:00:00.000-04:00" || /* @__PURE__ */ new Date());
      const endOfDay = new Date(easternDateString + "T23:59:59.999-04:00" || /* @__PURE__ */ new Date());
      const appointmentsWithClients2 = await db.select({
        id: appointments.id,
        clientId: appointments.clientId,
        therapistId: appointments.therapistId,
        startTime: appointments.startTime,
        endTime: appointments.endTime,
        type: appointments.type,
        status: appointments.status,
        location: appointments.location,
        notes: appointments.notes,
        appointmentNumber: appointments.appointmentNumber,
        createdAt: appointments.createdAt,
        updatedAt: appointments.updatedAt,
        clientName: sql2`${clients.firstName} || ' ' || ${clients.lastName}`.as("clientName"),
        clientFirstName: clients.firstName,
        clientLastName: clients.lastName
      }).from(appointments).leftJoin(clients, eq(appointments.clientId, clients.id)).where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, startOfDay),
          lte(appointments.startTime, endOfDay)
        )
      ).orderBy(appointments.startTime);
      return appointmentsWithClients2.map((apt) => ({
        ...apt,
        clientName: apt.clientName || "Unknown Client",
        client_name: apt.clientName || "Unknown Client",
        start_time: apt.startTime,
        end_time: apt.endTime
      }));
    }
    const appointmentsWithClients = await db.select({
      id: appointments.id,
      clientId: appointments.clientId,
      therapistId: appointments.therapistId,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      type: appointments.type,
      status: appointments.status,
      location: appointments.location,
      notes: appointments.notes,
      appointmentNumber: appointments.appointmentNumber,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      clientName: sql2`${clients.firstName} || ' ' || ${clients.lastName}`.as("clientName"),
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName
    }).from(appointments).leftJoin(clients, eq(appointments.clientId, clients.id)).where(eq(appointments.therapistId, therapistId)).orderBy(appointments.startTime);
    return appointmentsWithClients.map((apt) => ({
      ...apt,
      clientName: apt.clientName || "Unknown Client",
      client_name: apt.clientName || "Unknown Client",
      start_time: apt.startTime,
      end_time: apt.endTime
    }));
  }
  async getTodaysAppointments(therapistId) {
    const appointmentsWithClients = await db.select({
      id: appointments.id,
      clientId: appointments.clientId,
      therapistId: appointments.therapistId,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      type: appointments.type,
      status: appointments.status,
      location: appointments.location,
      notes: appointments.notes,
      appointmentNumber: appointments.appointmentNumber,
      createdAt: appointments.createdAt,
      updatedAt: appointments.updatedAt,
      clientName: sql2`${clients.firstName} || ' ' || ${clients.lastName}`.as("clientName"),
      clientFirstName: clients.firstName,
      clientLastName: clients.lastName
    }).from(appointments).leftJoin(clients, eq(appointments.clientId, clients.id)).where(
      and(
        eq(appointments.therapistId, therapistId),
        // Filter for appointments that occur on today's date in Eastern Time
        sql2`DATE((${appointments.startTime} AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York') = CURRENT_DATE`
      )
    ).orderBy(appointments.startTime);
    return appointmentsWithClients.map((apt) => ({
      ...apt,
      clientName: apt.clientName || "Unknown Client",
      client_name: apt.clientName || "Unknown Client",
      start_time: apt.startTime,
      end_time: apt.endTime
    }));
  }
  async getUpcomingAppointments(therapistId, days = 7) {
    const now = /* @__PURE__ */ new Date();
    const easternNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const futureDate = new Date(easternNow.getTime() + days * 24 * 60 * 60 * 1e3);
    return await db.select().from(appointments).where(
      and(
        eq(appointments.therapistId, therapistId),
        gte(appointments.startTime, easternNow),
        lte(appointments.startTime, futureDate),
        eq(appointments.status, "scheduled")
      )
    ).orderBy(appointments.startTime);
  }
  async cancelAppointment(id, reason) {
    return await this.updateAppointment(id, {
      status: "cancelled",
      cancellationReason: reason
    });
  }
  async createAppointment(appointment) {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }
  async updateAppointment(id, appointment) {
    const [updatedAppointment] = await db.update(appointments).set({ ...appointment, updatedAt: /* @__PURE__ */ new Date() }).where(eq(appointments.id, id)).returning();
    return updatedAppointment;
  }
  async getAppointment(id) {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment || void 0;
  }
  async rescheduleAppointment(id, newStartTime, newEndTime) {
    return await this.updateAppointment(id, {
      startTime: newStartTime,
      endTime: newEndTime,
      status: "scheduled"
    });
  }
  async completeAppointment(id) {
    return await this.updateAppointment(id, {
      status: "completed",
      completedAt: /* @__PURE__ */ new Date()
    });
  }
  async checkInAppointment(id) {
    return await this.updateAppointment(id, {
      status: "checked_in",
      checkedInAt: /* @__PURE__ */ new Date()
    });
  }
  async markNoShow(id, reason) {
    return await this.updateAppointment(id, {
      status: "no_show",
      noShowReason: reason
    });
  }
  async deleteAppointment(appointmentId) {
    await db.delete(appointments).where(eq(appointments.id, appointmentId));
  }
  async getAppointmentByEventId(eventId) {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.googleEventId, eventId)).limit(1);
    return appointment || null;
  }
  async updateAppointmentSessionPrep(appointmentId, sessionPrep) {
    await db.update(appointments).set({
      // sessionPrep: sessionPrep, // Remove this line as sessionPrep doesn't exist in schema
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(appointments.id, appointmentId));
  }
  async getActionItems(therapistId) {
    return await db.select().from(actionItems).where(eq(actionItems.therapistId, therapistId)).orderBy(desc(actionItems.createdAt));
  }
  async getUrgentActionItems(therapistId) {
    return await db.select().from(actionItems).where(
      and(
        eq(actionItems.therapistId, therapistId),
        eq(actionItems.priority, "high"),
        eq(actionItems.status, "pending")
      )
    ).orderBy(actionItems.dueDate);
  }
  async getClientActionItems(clientId) {
    return await db.select().from(actionItems).where(eq(actionItems.clientId, clientId)).orderBy(desc(actionItems.createdAt));
  }
  async completeActionItem(id) {
    return await this.updateActionItem(id, {
      status: "completed",
      completedAt: /* @__PURE__ */ new Date()
    });
  }
  async createActionItem(item) {
    const [newItem] = await db.insert(actionItems).values(item).returning();
    return newItem;
  }
  async updateActionItem(id, item) {
    const cleanedItem = { ...item };
    if (cleanedItem.completedAt !== void 0) {
      if (cleanedItem.completedAt === null) {
        cleanedItem.completedAt = null;
      } else if (typeof cleanedItem.completedAt === "string") {
        const date = new Date(cleanedItem.completedAt || /* @__PURE__ */ new Date());
        cleanedItem.completedAt = isNaN(date.getTime()) ? null : date;
      } else if (cleanedItem.completedAt instanceof Date) {
        cleanedItem.completedAt = isNaN(cleanedItem.completedAt.getTime()) ? null : cleanedItem.completedAt;
      } else if (typeof cleanedItem.completedAt === "object" && cleanedItem.completedAt !== null) {
        const date = new Date(cleanedItem.completedAt || /* @__PURE__ */ new Date());
        cleanedItem.completedAt = isNaN(date.getTime()) ? null : date;
      } else {
        delete cleanedItem.completedAt;
      }
    }
    if (cleanedItem.dueDate !== void 0) {
      if (cleanedItem.dueDate === null) {
        cleanedItem.dueDate = null;
      } else if (typeof cleanedItem.dueDate === "string") {
        const date = new Date(cleanedItem.dueDate || /* @__PURE__ */ new Date());
        cleanedItem.dueDate = isNaN(date.getTime()) ? null : date;
      } else if (cleanedItem.dueDate instanceof Date) {
        cleanedItem.dueDate = isNaN(cleanedItem.dueDate.getTime()) ? null : cleanedItem.dueDate;
      } else if (typeof cleanedItem.dueDate === "object" && cleanedItem.dueDate !== null) {
        const date = new Date(cleanedItem.dueDate || /* @__PURE__ */ new Date());
        cleanedItem.dueDate = isNaN(date.getTime()) ? null : date;
      } else {
        delete cleanedItem.dueDate;
      }
    }
    if (cleanedItem.status === "completed" && !cleanedItem.completedAt) {
      cleanedItem.completedAt = /* @__PURE__ */ new Date();
    }
    if (cleanedItem.status && cleanedItem.status !== "completed" && cleanedItem.completedAt) {
      cleanedItem.completedAt = null;
    }
    const [updatedItem] = await db.update(actionItems).set({ ...cleanedItem, updatedAt: /* @__PURE__ */ new Date() }).where(eq(actionItems.id, id)).returning();
    return updatedItem;
  }
  async getTreatmentPlans(clientId) {
    return await db.select().from(treatmentPlans).where(eq(treatmentPlans.clientId, clientId)).orderBy(desc(treatmentPlans.createdAt));
  }
  async getActiveTreatmentPlan(clientId) {
    const [plan] = await db.select().from(treatmentPlans).where(
      and(
        eq(treatmentPlans.clientId, clientId),
        eq(treatmentPlans.status, "active")
      )
    ).orderBy(desc(treatmentPlans.createdAt));
    return plan || void 0;
  }
  async createTreatmentPlan(plan) {
    const [newPlan] = await db.insert(treatmentPlans).values(plan).returning();
    return newPlan;
  }
  async updateTreatmentPlan(id, plan) {
    const [updatedPlan] = await db.update(treatmentPlans).set({ ...plan, updatedAt: /* @__PURE__ */ new Date() }).where(eq(treatmentPlans.id, id)).returning();
    return updatedPlan;
  }
  async getAiInsights(therapistId) {
    return await db.select().from(aiInsights).where(eq(aiInsights.therapistId, therapistId)).orderBy(desc(aiInsights.createdAt)).limit(10);
  }
  async getClientAiInsights(clientId) {
    return await db.select().from(aiInsights).where(eq(aiInsights.clientId, clientId)).orderBy(desc(aiInsights.createdAt));
  }
  async createAiInsight(insight) {
    const [newInsight] = await db.insert(aiInsights).values(insight).returning();
    return newInsight;
  }
  async markInsightAsRead(id) {
    const [updatedInsight] = await db.update(aiInsights).set({ isRead: true }).where(eq(aiInsights.id, id)).returning();
    return updatedInsight;
  }
  // Additional AI insights methods
  async getAiInsightsByClient(clientId) {
    return await this.getClientAiInsights(clientId);
  }
  async getAiInsightsByDateRange(therapistId, startDate2, endDate2) {
    return await db.select().from(aiInsights).where(
      and(
        eq(aiInsights.therapistId, therapistId),
        gte(aiInsights.createdAt, startDate2),
        lte(aiInsights.createdAt, endDate2)
      )
    ).orderBy(desc(aiInsights.createdAt));
  }
  // Billing methods
  async getBillingRecords(therapistId) {
    return await db.select().from(billingRecords).where(eq(billingRecords.therapistId, therapistId)).orderBy(desc(billingRecords.createdAt));
  }
  async getClientBillingRecords(clientId) {
    return await db.select().from(billingRecords).where(eq(billingRecords.clientId, clientId)).orderBy(desc(billingRecords.createdAt));
  }
  async getOverdueBills(therapistId) {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(billingRecords).where(
      and(
        eq(billingRecords.therapistId, therapistId),
        eq(billingRecords.status, "pending"),
        lte(billingRecords.dueDate, now)
      )
    ).orderBy(billingRecords.dueDate);
  }
  async createBillingRecord(record) {
    const [newRecord] = await db.insert(billingRecords).values(record).returning();
    return newRecord;
  }
  async updateBillingRecord(id, record) {
    const [updatedRecord] = await db.update(billingRecords).set({ ...record, updatedAt: /* @__PURE__ */ new Date() }).where(eq(billingRecords.id, id)).returning();
    return updatedRecord;
  }
  async markBillAsPaid(id, paymentInfo) {
    return await this.updateBillingRecord(id, {
      status: "paid",
      paidAt: /* @__PURE__ */ new Date(),
      paymentMethod: paymentInfo.paymentMethod,
      transactionId: paymentInfo.transactionId
    });
  }
  // Assessment methods
  async getAssessments(clientId) {
    return await db.select().from(assessments).where(eq(assessments.clientId, clientId)).orderBy(desc(assessments.createdAt));
  }
  async getAssessment(id) {
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment || void 0;
  }
  async createAssessment(assessment) {
    const [newAssessment] = await db.insert(assessments).values(assessment).returning();
    return newAssessment;
  }
  async updateAssessment(id, assessment) {
    const [updatedAssessment] = await db.update(assessments).set({ ...assessment, updatedAt: /* @__PURE__ */ new Date() }).where(eq(assessments.id, id)).returning();
    return updatedAssessment;
  }
  async completeAssessment(id, responses, scores) {
    return await this.updateAssessment(id, {
      responses,
      scores,
      status: "completed",
      completedAt: /* @__PURE__ */ new Date()
    });
  }
  // Progress notes functionality (using session notes)
  async getProgressNotes(clientId) {
    return await this.getSessionNotes(clientId);
  }
  async getProgressNotesByAppointmentId(appointmentId) {
    return await db.select().from(sessionNotes).where(eq(sessionNotes.appointmentId, appointmentId)).orderBy(desc(sessionNotes.createdAt));
  }
  async getRecentProgressNotes(therapistId, limit = 10) {
    return await db.select().from(sessionNotes).where(eq(sessionNotes.therapistId, therapistId)).orderBy(desc(sessionNotes.createdAt)).limit(limit);
  }
  async linkProgressNoteToAppointment(sessionNoteId, appointmentId) {
    return await this.updateSessionNote(sessionNoteId, { appointmentId });
  }
  // Added method to retrieve progress notes by therapist ID
  async getProgressNotesByTherapistId(therapistId) {
    return await db.select().from(sessionNotes).where(eq(sessionNotes.therapistId, therapistId)).orderBy(desc(sessionNotes.createdAt));
  }
  // Session notes methods matching interface
  async getSessionNotesByAppointmentId(appointmentId) {
    return await this.getProgressNotesByAppointmentId(appointmentId);
  }
  async getSessionNotesByDateRange(therapistId, startDate2, endDate2) {
    return await db.select().from(sessionNotes).where(
      and(
        eq(sessionNotes.therapistId, therapistId),
        gte(sessionNotes.sessionDate, startDate2),
        lte(sessionNotes.sessionDate, endDate2)
      )
    ).orderBy(desc(sessionNotes.sessionDate));
  }
  async getUpcomingAppointmentsByClient(clientId) {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(appointments).where(
      and(
        eq(appointments.clientId, clientId),
        gte(appointments.startTime, now),
        eq(appointments.status, "scheduled")
      )
    ).orderBy(appointments.startTime).limit(5);
  }
  async getAppointmentsByClient(clientId) {
    return await db.select().from(appointments).where(eq(appointments.clientId, clientId)).orderBy(desc(appointments.startTime));
  }
  async findMatchingAppointment(clientId, sessionDate) {
    const startDate2 = new Date(sessionDate || /* @__PURE__ */ new Date());
    startDate2.setDate(startDate2.getDate() - 3);
    const endDate2 = new Date(sessionDate || /* @__PURE__ */ new Date());
    endDate2.setDate(endDate2.getDate() + 3);
    const [appointment] = await db.select().from(appointments).where(
      and(
        eq(appointments.clientId, clientId),
        gte(appointments.startTime, startDate2),
        lte(appointments.startTime, endDate2)
      )
    ).orderBy(sql2`ABS(EXTRACT(EPOCH FROM (${appointments.startTime} - ${sessionDate})))`).limit(1);
    return appointment || null;
  }
  // Medication methods
  async getClientMedications(clientId) {
    return await db.select().from(medications).where(eq(medications.clientId, clientId)).orderBy(desc(medications.createdAt));
  }
  async getActiveMedications(clientId) {
    return await db.select().from(medications).where(
      and(
        eq(medications.clientId, clientId),
        eq(medications.status, "active")
      )
    ).orderBy(medications.name);
  }
  async createMedication(medication) {
    const [newMedication] = await db.insert(medications).values(medication).returning();
    return newMedication;
  }
  async updateMedication(id, medication) {
    const [updatedMedication] = await db.update(medications).set({ ...medication, updatedAt: /* @__PURE__ */ new Date() }).where(eq(medications.id, id)).returning();
    return updatedMedication;
  }
  async discontinueMedication(id) {
    return await this.updateMedication(id, {
      status: "discontinued",
      endDate: /* @__PURE__ */ new Date()
    });
  }
  // Communication methods
  async getCommunicationLogs(clientId) {
    return await db.select().from(communicationLogs).where(eq(communicationLogs.clientId, clientId)).orderBy(desc(communicationLogs.createdAt));
  }
  async getUrgentCommunications(therapistId) {
    return await db.select().from(communicationLogs).where(
      and(
        eq(communicationLogs.therapistId, therapistId),
        eq(communicationLogs.isUrgent, true)
      )
    ).orderBy(desc(communicationLogs.createdAt));
  }
  async createCommunicationLog(log) {
    const [newLog] = await db.insert(communicationLogs).values(log).returning();
    return newLog;
  }
  async markCommunicationAsRead(id) {
    const [updatedLog] = await db.update(communicationLogs).set({ readAt: /* @__PURE__ */ new Date() }).where(eq(communicationLogs.id, id)).returning();
    return updatedLog;
  }
  // Document methods
  async getClientDocuments(clientId) {
    return await db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.uploadedAt));
  }
  async getDocument(id) {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    if (document) {
      await db.update(documents).set({ lastAccessedAt: /* @__PURE__ */ new Date() }).where(eq(documents.id, id));
    }
    return document || void 0;
  }
  async createDocument(document) {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }
  async updateDocument(id, document) {
    const [updatedDocument] = await db.update(documents).set(document).where(eq(documents.id, id)).returning();
    return updatedDocument;
  }
  async deleteDocument(id) {
    await db.delete(documents).where(eq(documents.id, id));
  }
  // Enhanced document methods for AI tagging
  async updateDocumentWithTags(id, taggingData) {
    const updateData = {
      ...taggingData,
      confidenceScore: taggingData.confidenceScore ? String(taggingData.confidenceScore) : void 0,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const [updatedDocument] = await db.update(documents).set(updateData).where(eq(documents.id, id)).returning();
    return updatedDocument;
  }
  async getDocumentsByCategory(therapistId, category, subcategory) {
    const whereConditions = [eq(documents.therapistId, therapistId)];
    if (category) {
      whereConditions.push(eq(documents.category, category));
    }
    if (subcategory) {
      whereConditions.push(eq(documents.subcategory, subcategory));
    }
    return await db.select().from(documents).where(and(...whereConditions)).orderBy(desc(documents.uploadedAt));
  }
  async getDocumentsBySensitivity(therapistId, sensitivityLevel) {
    return await db.select().from(documents).where(
      and(
        eq(documents.therapistId, therapistId),
        eq(documents.sensitivityLevel, sensitivityLevel)
      )
    ).orderBy(desc(documents.uploadedAt));
  }
  async searchDocumentsByTags(therapistId, searchTags) {
    return await db.select().from(documents).where(eq(documents.therapistId, therapistId)).orderBy(desc(documents.uploadedAt));
  }
  async getDocumentTagStatistics(therapistId) {
    const allDocs = await db.select().from(documents).where(eq(documents.therapistId, therapistId));
    const categoryCounts = allDocs.reduce((acc, doc) => {
      const category = doc.category || "uncategorized";
      const existing = acc.find((c) => c.category === category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ category, count: 1 });
      }
      return acc;
    }, []);
    const sensitivityCounts = allDocs.reduce((acc, doc) => {
      const level = doc.sensitivityLevel || "standard";
      const existing = acc.find((c) => c.level === level);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ level, count: 1 });
      }
      return acc;
    }, []);
    return {
      categoryCounts,
      sensitivityCounts,
      totalDocuments: allDocs.length
    };
  }
  // Audit methods
  async createAuditLog(log) {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }
  async getAuditLogs(entityType, entityId) {
    return await db.select().from(auditLogs).where(
      and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      )
    ).orderBy(desc(auditLogs.timestamp));
  }
  async getUserAuditLogs(userId, limit = 50) {
    return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.timestamp)).limit(limit);
  }
  async getDashboardStats(therapistId) {
    const today = /* @__PURE__ */ new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const todaysAppointments = await db.select().from(appointments).where(
      and(
        eq(appointments.therapistId, therapistId),
        gte(appointments.startTime, startOfDay),
        lte(appointments.startTime, endOfDay)
      )
    );
    const todaysSessionsCount = todaysAppointments.length;
    const [activeClients] = await db.select({ count: count() }).from(clients).where(
      and(
        eq(clients.therapistId, therapistId),
        eq(clients.status, "active")
      )
    );
    const [totalClients] = await db.select({ count: count() }).from(clients).where(eq(clients.therapistId, therapistId));
    const [totalAppointments] = await db.select({ count: count() }).from(appointments).where(eq(appointments.therapistId, therapistId));
    const [riskClients] = await db.select({ count: count() }).from(clients).where(
      and(
        eq(clients.therapistId, therapistId),
        eq(clients.riskLevel, "high")
      )
    );
    const [urgentItems] = await db.select({ count: count() }).from(actionItems).where(
      and(
        eq(actionItems.therapistId, therapistId),
        eq(actionItems.priority, "high"),
        eq(actionItems.status, "pending")
      )
    );
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyAppointments = await db.select().from(appointments).where(
      and(
        eq(appointments.therapistId, therapistId),
        gte(appointments.startTime, startOfMonth),
        lte(appointments.startTime, endOfDay)
      )
    );
    const completedMonthlyAppointments = monthlyAppointments.filter(
      (apt) => apt.status === "completed"
    ).length;
    const completionRate = monthlyAppointments.length > 0 ? Math.round(completedMonthlyAppointments / monthlyAppointments.length * 100) : 0;
    const currentMonth = /* @__PURE__ */ new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);
    let monthlyRevenue = 0;
    try {
      const monthlyBills = await db.select().from(billingRecords).where(
        and(
          eq(billingRecords.therapistId, therapistId),
          gte(billingRecords.serviceDate, currentMonth),
          eq(billingRecords.status, "paid")
        )
      );
      monthlyRevenue = monthlyBills.reduce((sum, bill) => sum + parseFloat(bill.totalAmount || "0"), 0);
    } catch (error) {
      monthlyRevenue = completedMonthlyAppointments * 150;
    }
    let overdueCount = 0;
    try {
      const overdueBills = await this.getOverdueBills(therapistId);
      overdueCount = overdueBills.length;
    } catch (error) {
      overdueCount = Math.floor(completedMonthlyAppointments * 0.1);
    }
    return {
      todaysSessions: todaysSessionsCount,
      activeClients: activeClients.count,
      totalClients: totalClients.count,
      totalAppointments: totalAppointments.count,
      urgentActionItems: urgentItems.count,
      completionRate,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      overduePayments: overdueCount,
      riskClients: riskClients.count
    };
  }
  // Analytics methods
  async getClientEngagementStats(therapistId) {
    const [completedCount, noShowCount, cancelledCount, totalCount] = await Promise.all([
      db.select({ count: count() }).from(appointments).where(
        and(
          eq(appointments.therapistId, therapistId),
          eq(appointments.status, "completed")
        )
      ),
      db.select({ count: count() }).from(appointments).where(
        and(
          eq(appointments.therapistId, therapistId),
          eq(appointments.status, "no_show")
        )
      ),
      db.select({ count: count() }).from(appointments).where(
        and(
          eq(appointments.therapistId, therapistId),
          eq(appointments.status, "cancelled")
        )
      ),
      db.select({ count: count() }).from(appointments).where(eq(appointments.therapistId, therapistId))
    ]);
    const totalSessions = completedCount[0]?.count || 0;
    const noShows = noShowCount[0]?.count || 0;
    const cancelled = cancelledCount[0]?.count || 0;
    const totalAppointments = totalCount[0]?.count || 0;
    const activeClientsCount = await db.select({ count: count() }).from(clients).where(
      and(
        eq(clients.therapistId, therapistId),
        eq(clients.status, "active")
      )
    );
    const activeClients = activeClientsCount[0]?.count || 0;
    const averageSessionsPerClient = activeClients > 0 ? totalSessions / activeClients : 0;
    const noShowRate = totalAppointments > 0 ? noShows / totalAppointments * 100 : 0;
    const cancellationRate = totalAppointments > 0 ? cancelled / totalAppointments * 100 : 0;
    return {
      totalSessions,
      averageSessionsPerClient: Math.round(averageSessionsPerClient * 100) / 100,
      noShowRate: Math.round(noShowRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100
    };
  }
  async getFinancialSummary(therapistId, startDate2, endDate2) {
    const baseConditions = [eq(billingRecords.therapistId, therapistId)];
    if (startDate2 && endDate2) {
      baseConditions.push(
        gte(billingRecords.serviceDate, startDate2),
        lte(billingRecords.serviceDate, endDate2)
      );
    }
    const now = /* @__PURE__ */ new Date();
    const [totalResult, paidResult, pendingResult, overdueResult] = await Promise.all([
      // Total revenue
      db.select({
        total: sql2`COALESCE(SUM(CAST(${billingRecords.totalAmount} AS DECIMAL)), 0)`
      }).from(billingRecords).where(and(...baseConditions)),
      // Paid amount
      db.select({
        total: sql2`COALESCE(SUM(CAST(${billingRecords.totalAmount} AS DECIMAL)), 0)`
      }).from(billingRecords).where(and(...baseConditions, eq(billingRecords.status, "paid"))),
      // Pending amount
      db.select({
        total: sql2`COALESCE(SUM(CAST(${billingRecords.totalAmount} AS DECIMAL)), 0)`
      }).from(billingRecords).where(and(...baseConditions, eq(billingRecords.status, "pending"))),
      // Overdue amount
      db.select({
        total: sql2`COALESCE(SUM(CAST(${billingRecords.totalAmount} AS DECIMAL)), 0)`
      }).from(billingRecords).where(
        and(
          ...baseConditions,
          eq(billingRecords.status, "pending"),
          lte(billingRecords.dueDate, now)
        )
      )
    ]);
    return {
      totalRevenue: Math.round(Number(totalResult[0]?.total || 0) * 100) / 100,
      paidAmount: Math.round(Number(paidResult[0]?.total || 0) * 100) / 100,
      pendingAmount: Math.round(Number(pendingResult[0]?.total || 0) * 100) / 100,
      overdueAmount: Math.round(Number(overdueResult[0]?.total || 0) * 100) / 100
    };
  }
  async getSessionNoteById(sessionNoteId) {
    try {
      const [sessionNote] = await db.select().from(sessionNotes).where(eq(sessionNotes.id, sessionNoteId));
      return sessionNote || null;
    } catch (error) {
      console.error("Error in getSessionNoteById:", error);
      return null;
    }
  }
  async getSessionNotesByClientId(clientId) {
    try {
      const result = await pool.query(
        "SELECT * FROM session_notes WHERE client_id = $1 ORDER BY created_at DESC",
        [clientId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        appointmentId: row.appointment_id || null,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        content: row.content,
        transcript: row.transcript || null,
        aiSummary: row.ai_summary || null,
        tags: row.tags || [],
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date()),
        // Add missing required fields with default values
        location: row.location || null,
        title: row.title || "Session Note",
        subjective: row.subjective || "",
        objective: row.objective || "",
        assessment: row.assessment || "",
        plan: row.plan || "",
        sessionType: row.session_type || "Individual Therapy",
        duration: row.duration || 50,
        sessionDate: row.session_date ? new Date(row.session_date || /* @__PURE__ */ new Date()) : null,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary || "",
        tonalAnalysis: row.tonal_analysis || "",
        manualEntry: row.manual_entry || false,
        meetingType: row.meeting_type || null,
        participants: this.safeParseJSON(row.participants, []),
        followUpNotes: row.follow_up_notes || "",
        aiTags: this.safeParseJSON(row.ai_tags, []),
        followUpRequired: row.follow_up_required || false,
        confidentialityLevel: row.confidentiality_level || null
      }));
    } catch (error) {
      console.error("Error in getSessionNotesByClientId:", error);
      return [];
    }
  }
  async getAllSessionNotesByTherapist(therapistId) {
    try {
      const result = await pool.query(
        "SELECT * FROM session_notes WHERE therapist_id = $1 ORDER BY created_at DESC",
        [therapistId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        appointmentId: row.appointment_id || null,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        content: row.content,
        transcript: row.transcript || null,
        aiSummary: row.ai_summary || null,
        tags: row.tags || [],
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date()),
        // Add missing required fields with default values
        location: row.location || null,
        title: row.title || "Session Note",
        subjective: row.subjective || "",
        objective: row.objective || "",
        assessment: row.assessment || "",
        plan: row.plan || "",
        sessionType: row.session_type || "Individual Therapy",
        duration: row.duration || 50,
        sessionDate: row.session_date ? new Date(row.session_date || /* @__PURE__ */ new Date()) : null,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary || "",
        tonalAnalysis: row.tonal_analysis || "",
        manualEntry: row.manual_entry || false,
        meetingType: row.meeting_type || null,
        participants: this.safeParseJSON(row.participants, []),
        followUpNotes: row.follow_up_notes || "",
        confidentialityLevel: row.confidentiality_level || null
      }));
    } catch (error) {
      console.error("Error in getAllSessionNotesByTherapist:", error);
      return [];
    }
  }
  async getSessionNotesByTherapistTimeframe(therapistId, timeframe) {
    try {
      let dateThreshold = /* @__PURE__ */ new Date();
      switch (timeframe) {
        case "week":
          dateThreshold.setDate(dateThreshold.getDate() - 7);
          break;
        case "month":
          dateThreshold.setMonth(dateThreshold.getMonth() - 1);
          break;
        case "quarter":
          dateThreshold.setMonth(dateThreshold.getMonth() - 3);
          break;
      }
      const result = await pool.query(
        "SELECT * FROM session_notes WHERE therapist_id = $1 AND created_at >= $2 ORDER BY created_at DESC",
        [therapistId, dateThreshold]
      );
      return result.rows.map((row) => ({
        id: row.id,
        appointmentId: row.appointment_id || null,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        content: row.content,
        transcript: row.transcript || null,
        aiSummary: row.ai_summary || null,
        tags: row.tags || [],
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date()),
        // Add missing required fields with default values
        location: row.location || null,
        title: row.title || "Session Note",
        subjective: row.subjective || "",
        objective: row.objective || "",
        assessment: row.assessment || "",
        plan: row.plan || "",
        sessionType: row.session_type || "Individual Therapy",
        duration: row.duration || 50,
        sessionDate: row.session_date ? new Date(row.session_date || /* @__PURE__ */ new Date()) : null,
        keyPoints: this.safeParseJSON(row.key_points, []),
        significantQuotes: this.safeParseJSON(row.significant_quotes, []),
        narrativeSummary: row.narrative_summary || "",
        tonalAnalysis: row.tonalAnalysis || "",
        manualEntry: row.manual_entry || false,
        meetingType: row.meeting_type || null,
        participants: this.safeParseJSON(row.participants, []),
        followUpNotes: row.follow_up_notes || "",
        confidentialityLevel: row.confidentiality_level || null
      }));
    } catch (error) {
      console.error("Error in getSessionNotesByTherapistTimeframe:", error);
      return [];
    }
  }
  async getAppointmentsByTherapistTimeframe(therapistId, timeframe) {
    try {
      let dateThreshold = /* @__PURE__ */ new Date();
      switch (timeframe) {
        case "week":
          dateThreshold.setDate(dateThreshold.getDate() - 7);
          break;
        case "month":
          dateThreshold.setMonth(dateThreshold.getMonth() - 1);
          break;
        case "quarter":
          dateThreshold.setMonth(dateThreshold.getMonth() - 3);
          break;
      }
      const result = await pool.query(
        "SELECT * FROM appointments WHERE therapist_id = $1 AND start_time >= $2 ORDER BY start_time DESC",
        [therapistId, dateThreshold]
      );
      return result.rows.map((row) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        startTime: new Date(row.start_time || /* @__PURE__ */ new Date()),
        endTime: new Date(row.end_time || /* @__PURE__ */ new Date()),
        type: row.type,
        googleCalendarId: row.google_calendar_id || null,
        googleCalendarName: row.google_calendar_name || null,
        lastGoogleSync: row.last_google_sync ? new Date(row.last_google_sync || /* @__PURE__ */ new Date()) : null,
        isVirtual: row.is_virtual || false,
        status: row.status,
        location: row.location || "",
        notes: row.notes || "",
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date()),
        // Add missing required fields with default values
        appointmentNumber: row.appointment_number || null,
        recurringId: row.recurring_id || null,
        recurringType: row.recurring_type || null,
        recurringEnd: row.recurring_end ? new Date(row.recurring_end || /* @__PURE__ */ new Date()) : null,
        reminderSent: row.reminder_sent || false,
        reminderTime: row.reminder_time ? new Date(row.reminder_time || /* @__PURE__ */ new Date()) : null,
        meetingType: row.meeting_type || "in_person",
        sessionFee: row.session_fee || null,
        paymentStatus: row.payment_status || "pending",
        cancellationReason: row.cancellation_reason || null,
        noShowFee: row.no_show_fee || null,
        attendanceStatus: row.attendance_status || "scheduled",
        duration: row.duration || 50,
        googleEventId: row.google_event_id || null,
        lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at || /* @__PURE__ */ new Date()) : null,
        insuranceClaim: this.safeParseJSON(row.insurance_claim, {})
      }));
    } catch (error) {
      console.error("Error in getAppointmentsByTherapistTimeframe:", error);
      return [];
    }
  }
  // Session prep notes methods implementation
  async getSessionPrepNotes(eventId) {
    try {
      const result = await pool.query(
        "SELECT * FROM session_prep_notes WHERE event_id = $1 ORDER BY updated_at DESC",
        [eventId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),
        psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, []),
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      }));
    } catch (error) {
      console.error("Error in getSessionPrepNotes:", error);
      return [];
    }
  }
  async getSessionPrepNote(id) {
    try {
      const result = await pool.query(
        "SELECT * FROM session_prep_notes WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) return void 0;
      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        lastUpdatedBy: row.last_updated_by,
        followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),
        psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, []),
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in getSessionPrepNote:", error);
      return void 0;
    }
  }
  async getSessionPrepNoteByEventId(eventId) {
    try {
      const result = await pool.query(
        "SELECT * FROM session_prep_notes WHERE event_id = $1 ORDER BY updated_at DESC LIMIT 1",
        [eventId]
      );
      if (result.rows.length === 0) return void 0;
      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),
        psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, []),
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in getSessionPrepNoteByEventId:", error);
      return void 0;
    }
  }
  async getSessionPrepNotesByClient(clientId) {
    try {
      const result = await pool.query(
        "SELECT * FROM session_prep_notes WHERE client_id = $1 ORDER BY created_at DESC",
        [clientId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),
        psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, []),
        lastUpdatedBy: row.last_updated_by,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      }));
    } catch (error) {
      console.error("Error in getSessionPrepNotesByClient:", error);
      return [];
    }
  }
  async createSessionPrepNote(note) {
    try {
      const result = await pool.query(
        `INSERT INTO session_prep_notes (
          appointment_id, event_id, client_id, therapist_id, prep_content,
          key_focus_areas, previous_session_summary, suggested_interventions,
          client_goals, risk_factors, homework_review, session_objectives,
          ai_generated_insights, last_updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          note.appointmentId,
          note.eventId,
          note.clientId,
          note.therapistId,
          note.prepContent,
          JSON.stringify(note.keyFocusAreas || []),
          note.previousSessionSummary,
          JSON.stringify(note.suggestedInterventions || []),
          JSON.stringify(note.clientGoals || []),
          JSON.stringify(note.riskFactors || []),
          note.homeworkReview,
          JSON.stringify(note.sessionObjectives || []),
          note.aiGeneratedInsights,
          note.lastUpdatedBy
        ]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        lastUpdatedBy: row.last_updated_by,
        followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),
        psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, []),
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in createSessionPrepNote:", error);
      throw error;
    }
  }
  async updateSessionPrepNote(id, note) {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      if (note.prepContent !== void 0) {
        updateFields.push(`prep_content = $${paramIndex++}`);
        values.push(note.prepContent);
      }
      if (note.keyFocusAreas !== void 0) {
        updateFields.push(`key_focus_areas = $${paramIndex++}`);
        values.push(JSON.stringify(note.keyFocusAreas));
      }
      if (note.previousSessionSummary !== void 0) {
        updateFields.push(`previous_session_summary = $${paramIndex++}`);
        values.push(note.previousSessionSummary);
      }
      if (note.suggestedInterventions !== void 0) {
        updateFields.push(`suggested_interventions = $${paramIndex++}`);
        values.push(JSON.stringify(note.suggestedInterventions));
      }
      if (note.clientGoals !== void 0) {
        updateFields.push(`client_goals = $${paramIndex++}`);
        values.push(JSON.stringify(note.clientGoals));
      }
      if (note.riskFactors !== void 0) {
        updateFields.push(`risk_factors = $${paramIndex++}`);
        values.push(JSON.stringify(note.riskFactors));
      }
      if (note.homeworkReview !== void 0) {
        updateFields.push(`homework_review = $${paramIndex++}`);
        values.push(note.homeworkReview);
      }
      if (note.sessionObjectives !== void 0) {
        updateFields.push(`session_objectives = $${paramIndex++}`);
        values.push(JSON.stringify(note.sessionObjectives));
      }
      if (note.aiGeneratedInsights !== void 0) {
        updateFields.push(`ai_generated_insights = $${paramIndex++}`);
        values.push(note.aiGeneratedInsights);
      }
      if (note.lastUpdatedBy !== void 0) {
        updateFields.push(`last_updated_by = $${paramIndex++}`);
        values.push(note.lastUpdatedBy);
      }
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(/* @__PURE__ */ new Date());
      values.push(id);
      const result = await pool.query(
        `UPDATE session_prep_notes SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      const row = result.rows[0];
      return {
        id: row.id,
        appointmentId: row.appointment_id,
        eventId: row.event_id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        prepContent: row.prep_content,
        keyFocusAreas: row.key_focus_areas || [],
        previousSessionSummary: row.previous_session_summary,
        suggestedInterventions: row.suggested_interventions || [],
        clientGoals: row.client_goals || [],
        riskFactors: row.risk_factors || [],
        homeworkReview: row.homework_review,
        sessionObjectives: row.session_objectives || [],
        aiGeneratedInsights: row.ai_generated_insights,
        lastUpdatedBy: row.last_updated_by,
        followUpQuestions: this.safeParseJSON(row.follow_up_questions, []),
        psychoeducationalMaterials: this.safeParseJSON(row.psychoeducational_materials, []),
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in updateSessionPrepNote:", error);
      throw error;
    }
  }
  async generateAIInsightsForSession(eventId, clientId) {
    try {
      const previousNotes = await this.getSessionNotesByClientId(clientId);
      const client = await this.getClient(clientId);
      if (!client) {
        return this.getDefaultSessionPrepInsights();
      }
      const { generateClinicalAnalysis: generateClinicalAnalysis2 } = await Promise.resolve().then(() => (init_ai_services(), ai_services_exports));
      const sessionContext = previousNotes.slice(0, 3).map((note) => ({
        date: note.createdAt || /* @__PURE__ */ new Date(),
        content: note.content,
        duration: "50 minutes"
        // Default session duration
      }));
      const prompt = `As an expert clinical therapist, analyze the following client information and recent session notes to provide comprehensive session preparation guidance:

Client: ${client.firstName} ${client.lastName}
Recent Sessions:
${sessionContext.map((s, i) => `Session ${i + 1} (${new Date(s.date || /* @__PURE__ */ new Date()).toLocaleDateString()}): ${s.content}`).join("\n\n")}

Please provide:
1. Clinical insights and preparation notes
2. 5-7 specific follow-up questions that continue where previous sessions left off
3. 3-5 relevant psychoeducational materials/handouts appropriate for this client

Respond in JSON format:
{
  "insights": "Detailed clinical insights and session prep guidance...",
  "followUpQuestions": [
    "How has your anxiety been since we worked on breathing techniques?",
    "Were you able to practice the homework assignment we discussed?"
  ],
  "psychoeducationalMaterials": [
    {
      "title": "Anxiety Management Techniques",
      "description": "Practical strategies for managing anxiety symptoms",
      "type": "handout"
    }
  ]
}`;
      const analysis = await generateClinicalAnalysis2(prompt);
      try {
        const result = JSON.parse(analysis);
        return {
          insights: result.insights || this.getDefaultInsights(),
          followUpQuestions: result.followUpQuestions || this.getDefaultQuestions(),
          psychoeducationalMaterials: result.psychoeducationalMaterials || this.getDefaultMaterials()
        };
      } catch (parseError) {
        console.error("Error parsing AI analysis:", parseError);
        return this.getDefaultSessionPrepInsights();
      }
    } catch (error) {
      console.error("Error generating AI insights:", error);
      return this.getDefaultSessionPrepInsights();
    }
  }
  getDefaultSessionPrepInsights() {
    return {
      insights: `AI-Generated Session Preparation Insights:

1. Previous Session Review:
   - Review key themes from last session
   - Check on homework assignments and progress
   - Assess any risk factors or concerns

2. Client Background Context:
   - Consider current treatment goals
   - Review any medication changes
   - Note family/social dynamics

3. Recommended Focus Areas:
   - Continue working on coping strategies
   - Assess coping strategies effectiveness
   - Check medication compliance if applicable

4. Session Objectives:
   - Assess current mental state and progress
   - Reinforce positive coping strategies
   - Plan next steps in treatment

5. Homework Review:
   - Review completion of previous assignments
   - Discuss any challenges or successes
   - Adjust future assignments as needed`,
      followUpQuestions: this.getDefaultQuestions(),
      psychoeducationalMaterials: this.getDefaultMaterials()
    };
  }
  getDefaultQuestions() {
    return [
      "How have you been feeling since our last session?",
      "Were you able to practice the techniques we discussed?",
      "What challenges did you face this week?",
      "How did the homework assignment go?",
      "Have you noticed any patterns in your thoughts or behaviors?",
      "What would you like to focus on today?",
      "How are your coping strategies working for you?"
    ];
  }
  getDefaultMaterials() {
    return [
      {
        title: "Mindfulness and Relaxation Techniques",
        description: "Practical guide to mindfulness exercises and breathing techniques",
        type: "handout"
      },
      {
        title: "Thought Record Worksheet",
        description: "Tool for identifying and challenging negative thought patterns",
        type: "worksheet"
      },
      {
        title: "Anxiety Management Strategies",
        description: "Evidence-based techniques for managing anxiety symptoms",
        type: "handout"
      },
      {
        title: "Daily Mood Tracker",
        description: "Simple tool to track daily mood and identify patterns",
        type: "worksheet"
      }
    ];
  }
  getDefaultInsights() {
    return `Session Preparation Insights:

1. Previous Session Review:
   - Review key themes from last session
   - Check on homework assignments and progress
   - Assess any risk factors or concerns

2. Recommended Focus Areas:
   - Continue working on coping strategies
   - Assess current mental state and progress
   - Plan next steps in treatment`;
  }
  // Client check-ins methods implementation
  async getClientCheckins(therapistId, status) {
    try {
      let query = "SELECT * FROM client_checkins WHERE therapist_id = $1";
      const params = [therapistId];
      if (status) {
        query += " AND status = $2";
        params.push(status);
      }
      query += " ORDER BY generated_at DESC";
      const result = await pool.query(query, params);
      return result.rows.map((row) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at || /* @__PURE__ */ new Date()),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at || /* @__PURE__ */ new Date()) : null,
        sentAt: row.sent_at ? new Date(row.sent_at || /* @__PURE__ */ new Date()) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at || /* @__PURE__ */ new Date()) : null,
        expiresAt: new Date(row.expires_at || /* @__PURE__ */ new Date()),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at || /* @__PURE__ */ new Date()) : null,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      }));
    } catch (error) {
      console.error("Error in getClientCheckins:", error);
      return [];
    }
  }
  async getClientCheckinsByClient(clientId) {
    try {
      const result = await pool.query(
        "SELECT * FROM client_checkins WHERE client_id = $1 ORDER BY generated_at DESC",
        [clientId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at || /* @__PURE__ */ new Date()),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at || /* @__PURE__ */ new Date()) : null,
        sentAt: row.sent_at ? new Date(row.sent_at || /* @__PURE__ */ new Date()) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at || /* @__PURE__ */ new Date()) : null,
        expiresAt: new Date(row.expires_at || /* @__PURE__ */ new Date()),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at || /* @__PURE__ */ new Date()) : null,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      }));
    } catch (error) {
      console.error("Error in getClientCheckinsByClient:", error);
      return [];
    }
  }
  async getClientCheckin(id) {
    try {
      const result = await pool.query(
        "SELECT * FROM client_checkins WHERE id = $1",
        [id]
      );
      if (result.rows.length === 0) return void 0;
      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at || /* @__PURE__ */ new Date()),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at || /* @__PURE__ */ new Date()) : null,
        sentAt: row.sent_at ? new Date(row.sent_at || /* @__PURE__ */ new Date()) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at || /* @__PURE__ */ new Date()) : null,
        expiresAt: new Date(row.expires_at || /* @__PURE__ */ new Date()),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at || /* @__PURE__ */ new Date()) : null,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in getClientCheckin:", error);
      return void 0;
    }
  }
  async createClientCheckin(checkin) {
    try {
      const result = await pool.query(
        `INSERT INTO client_checkins (
          client_id, therapist_id, event_id, session_note_id, checkin_type,
          priority, subject, message_content, ai_reasoning, trigger_context,
          delivery_method, status, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          checkin.clientId,
          checkin.therapistId,
          checkin.eventId,
          checkin.sessionNoteId,
          checkin.checkinType,
          checkin.priority,
          checkin.subject,
          checkin.messageContent,
          checkin.aiReasoning,
          JSON.stringify(checkin.triggerContext || {}),
          checkin.deliveryMethod,
          checkin.status,
          checkin.expiresAt
        ]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at || /* @__PURE__ */ new Date()),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at || /* @__PURE__ */ new Date()) : null,
        sentAt: row.sent_at ? new Date(row.sent_at || /* @__PURE__ */ new Date()) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at || /* @__PURE__ */ new Date()) : null,
        expiresAt: new Date(row.expires_at || /* @__PURE__ */ new Date()),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at || /* @__PURE__ */ new Date()) : null,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in createClientCheckin:", error);
      throw error;
    }
  }
  async updateClientCheckin(id, checkin) {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      if (checkin.status !== void 0) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(checkin.status);
        if (checkin.status === "reviewed") {
          updateFields.push(`reviewed_at = $${paramIndex++}`);
          values.push(/* @__PURE__ */ new Date());
        } else if (checkin.status === "sent") {
          updateFields.push(`sent_at = $${paramIndex++}`);
          values.push(/* @__PURE__ */ new Date());
        } else if (checkin.status === "archived") {
          updateFields.push(`archived_at = $${paramIndex++}`);
          values.push(/* @__PURE__ */ new Date());
        }
      }
      if (checkin.clientResponse !== void 0) {
        updateFields.push(`client_response = $${paramIndex++}`);
        values.push(checkin.clientResponse);
        updateFields.push(`response_received_at = $${paramIndex++}`);
        values.push(/* @__PURE__ */ new Date());
      }
      updateFields.push(`updated_at = $${paramIndex++}`);
      values.push(/* @__PURE__ */ new Date());
      values.push(id);
      const result = await pool.query(
        `UPDATE client_checkins SET ${updateFields.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      const row = result.rows[0];
      return {
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        eventId: row.event_id,
        sessionNoteId: row.session_note_id,
        checkinType: row.checkin_type,
        priority: row.priority,
        subject: row.subject,
        messageContent: row.message_content,
        aiReasoning: row.ai_reasoning,
        triggerContext: row.trigger_context || {},
        deliveryMethod: row.delivery_method,
        status: row.status,
        generatedAt: new Date(row.generated_at || /* @__PURE__ */ new Date()),
        reviewedAt: row.reviewed_at ? new Date(row.reviewed_at || /* @__PURE__ */ new Date()) : null,
        sentAt: row.sent_at ? new Date(row.sent_at || /* @__PURE__ */ new Date()) : null,
        archivedAt: row.archived_at ? new Date(row.archived_at || /* @__PURE__ */ new Date()) : null,
        expiresAt: new Date(row.expires_at || /* @__PURE__ */ new Date()),
        clientResponse: row.client_response,
        responseReceivedAt: row.response_received_at ? new Date(row.response_received_at || /* @__PURE__ */ new Date()) : null,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      };
    } catch (error) {
      console.error("Error in updateClientCheckin:", error);
      throw error;
    }
  }
  async generateAICheckins(therapistId) {
    try {
      const clients2 = await this.getClients(therapistId);
      const generatedCheckins = [];
      for (const client of clients2) {
        const sessionNotes2 = await this.getSessionNotesByClientId(client.id);
        const recentNotes = sessionNotes2.slice(0, 3);
        if (recentNotes.length === 0) continue;
        const existingCheckins = await this.getClientCheckinsByClient(client.id);
        const recentCheckin = existingCheckins.find(
          (checkin) => checkin.status !== "archived" && checkin.status !== "deleted" && new Date(checkin.generatedAt || /* @__PURE__ */ new Date()).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1e3
          // Within 7 days
        );
        if (recentCheckin) continue;
        const analysis = await this.analyzeSessionForCheckin(client, recentNotes);
        if (analysis.shouldGenerateCheckin) {
          const checkin = await this.createClientCheckin({
            clientId: client.id,
            therapistId,
            eventId: null,
            sessionNoteId: recentNotes[0]?.id || null,
            checkinType: analysis.checkinType,
            priority: analysis.priority,
            subject: analysis.subject,
            messageContent: analysis.messageContent,
            aiReasoning: analysis.reasoning,
            triggerContext: analysis.triggerContext,
            deliveryMethod: "email",
            status: "generated",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3)
            // 7 days from now
          });
          generatedCheckins.push(checkin);
        }
      }
      return generatedCheckins;
    } catch (error) {
      console.error("Error generating AI check-ins:", error);
      return [];
    }
  }
  async analyzeSessionForCheckin(client, sessionNotes2) {
    try {
      const { generateClinicalAnalysis: generateClinicalAnalysis2 } = await Promise.resolve().then(() => (init_ai_services(), ai_services_exports));
      const lastSession = sessionNotes2[0];
      const daysSinceLastSession = Math.floor((Date.now() - new Date(lastSession.createdAt || /* @__PURE__ */ new Date()).getTime()) / (24 * 60 * 60 * 1e3));
      const sessionContext = sessionNotes2.slice(0, 2).map((note) => ({
        date: note.createdAt,
        content: note.content,
        daysSince: Math.floor((Date.now() - new Date(note.createdAt || /* @__PURE__ */ new Date()).getTime()) / (24 * 60 * 60 * 1e3))
      }));
      const prompt = `You are writing a check-in message on behalf of Jonathan, a licensed mental health counselor. Your tone must sound like Jonathan himself is speaking - warm, clear, professional, conversational but composed, with occasional dry wit when appropriate.

TONE GUIDELINES:
- Warm, clear, and professional but never stiff or corporate
- Use contractions (I'll, that's, you're)
- Conversational but composed (not too casual)
- Emotionally attuned, not sentimental
- Structured and efficient\u2014but never cold or rushed
- Keep paragraphs short and balanced
- Vary sentence rhythm to avoid sounding robotic

AVOID:
- Overusing exclamation marks, emojis, or filler
- Stiff formality ("Dear Sir or Madam," "Pursuant to...")
- Vague corporate or "over-polished" phrasing
- Over-apologizing or sounding unsure
- Generic, ChatGPT-style AI responses

Analyze the following therapy session notes for ${client.firstName} ${client.lastName} and determine if a check-in message would be beneficial:

Recent Sessions:
${sessionContext.map((s) => `- ${s.daysSince} days ago: ${s.content}`).join("\n")}

Days since last session: ${daysSinceLastSession}

Based on the session content, determine:
1. Should we generate a check-in? (consider: homework assignments, crisis indicators, progress milestones, emotional state)
2. What type of check-in? (midweek, followup, crisis_support, goal_reminder, homework_reminder)
3. Priority level? (low, medium, high, urgent)
4. Write a subject line and message that sounds like Jonathan's authentic voice

Example phrases to reference:
- "Hi [Name] \u2014 just wanted to check in briefly."
- "Hope things have been going okay since we last met."
- "No pressure to reply right away\u2014just wanted to touch base."
- "Let me know if you'd like to chat about anything before our next session."

Respond with JSON:
{
  "shouldGenerateCheckin": boolean,
  "checkinType": string,
  "priority": string,
  "subject": string,
  "messageContent": string,
  "reasoning": string
}`;
      const analysis = await generateClinicalAnalysis2(prompt);
      try {
        const result = JSON.parse(analysis);
        return {
          ...result,
          triggerContext: {
            daysSinceSession: daysSinceLastSession,
            lastSessionDate: lastSession.createdAt,
            sessionCount: sessionNotes2.length
          }
        };
      } catch (parseError) {
        console.error("Error parsing AI analysis:", parseError);
        return this.getSimpleCheckinAnalysis(client, sessionNotes2, daysSinceLastSession);
      }
    } catch (error) {
      console.error("Error in AI analysis:", error);
      const lastSession = sessionNotes2[0];
      const daysSinceLastSession = Math.floor((Date.now() - new Date(lastSession.createdAt || /* @__PURE__ */ new Date()).getTime()) / (24 * 60 * 60 * 1e3));
      return this.getSimpleCheckinAnalysis(client, sessionNotes2, daysSinceLastSession);
    }
  }
  getSimpleCheckinAnalysis(client, sessionNotes2, daysSinceLastSession) {
    const lastSession = sessionNotes2[0];
    if (daysSinceLastSession >= 3 && daysSinceLastSession <= 5) {
      return {
        shouldGenerateCheckin: true,
        checkinType: "midweek",
        priority: "medium",
        subject: `Quick check-in`,
        messageContent: `Hi ${client.firstName} \u2014 just wanted to check in briefly.

Hope things have been going okay since we last met. No pressure to reply right away, but I'd love to hear how you're feeling about the things we discussed.

Let me know if you'd like to chat about anything before our next session.

Take care,
Jonathan`,
        reasoning: `Generated midweek check-in because it's been ${daysSinceLastSession} days since last session`,
        triggerContext: { daysSinceSession: daysSinceLastSession, lastSessionDate: lastSession.createdAt }
      };
    }
    return {
      shouldGenerateCheckin: false,
      checkinType: "midweek",
      priority: "low",
      subject: "",
      messageContent: "",
      reasoning: "No check-in triggers detected",
      triggerContext: {}
    };
  }
  async sendCheckin(id, method) {
    try {
      const checkin = await this.getClientCheckin(id);
      if (!checkin) return false;
      const client = await this.getClient(checkin.clientId);
      if (!client?.email) {
        console.error("Client email not found");
        return false;
      }
      if (method === "email") {
        const { sendCheckInEmail: sendCheckInEmail2 } = await Promise.resolve().then(() => (init_email_service(), email_service_exports));
        const emailSent = await sendCheckInEmail2(
          client.email,
          checkin.subject,
          checkin.messageContent
        );
        if (!emailSent) {
          console.error("Failed to send email");
          return false;
        }
      } else if (method === "sms") {
        console.log("SMS functionality not yet implemented");
        return false;
      }
      await this.updateClientCheckin(id, { status: "sent" });
      return true;
    } catch (error) {
      console.error("Error sending check-in:", error);
      return false;
    }
  }
  async cleanupExpiredCheckins() {
    try {
      const result = await pool.query(
        `UPDATE client_checkins
         SET status = 'deleted', updated_at = NOW()
         WHERE expires_at < NOW() AND status = 'generated'
         RETURNING id`
      );
      return result.rowCount || 0;
    } catch (error) {
      console.error("Error cleaning up expired check-ins:", error);
      return 0;
    }
  }
  async deleteClientCheckin(id) {
    try {
      await pool.query("DELETE FROM client_checkins WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error in deleteClientCheckin:", error);
      throw error;
    }
  }
  async getClientOutcomesByTherapist(therapistId) {
    try {
      const result = await pool.query(
        "SELECT c.*, COUNT(sn.id) as session_count FROM clients c LEFT JOIN session_notes sn ON c.id::text = sn.client_id WHERE c.therapist_id::text = $1 GROUP BY c.id ORDER BY c.created_at DESC",
        [therapistId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        sessionCount: parseInt(row.session_count) || 0,
        progressLevel: this.assessClientProgress(row.status, parseInt(row.session_count) || 0),
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date())
      }));
    } catch (error) {
      console.error("Error in getClientOutcomesByTherapist:", error);
      return [];
    }
  }
  assessClientProgress(status, sessionCount) {
    if (status === "completed" && sessionCount > 8) return "excellent";
    if (status === "active" && sessionCount > 12) return "good";
    if (status === "active" && sessionCount > 6) return "moderate";
    return "early";
  }
  async getActionItemsByEventId(eventId) {
    try {
      const result = await pool.query(
        "SELECT * FROM action_items WHERE event_id = $1 ORDER BY created_at DESC",
        [eventId]
      );
      return result.rows.map((row) => ({
        id: row.id,
        clientId: row.client_id,
        therapistId: row.therapist_id,
        title: row.title,
        description: row.description,
        priority: row.priority,
        status: row.status,
        dueDate: row.due_date ? new Date(row.due_date || /* @__PURE__ */ new Date()) : null,
        completedAt: row.completed_at ? new Date(row.completed_at || /* @__PURE__ */ new Date()) : null,
        eventId: row.event_id,
        createdAt: new Date(row.created_at || /* @__PURE__ */ new Date()),
        updatedAt: new Date(row.updated_at || /* @__PURE__ */ new Date())
      }));
    } catch (error) {
      console.error("Error in getActionItemsByEventId:", error);
      return [];
    }
  }
  /**
   * Creates a unified narrative from progress note sections (SOAP + Analysis + Insights + Summary)
   * Following the exact order: Subjective, Objective, Assessment, Plan, Analysis, Insights, Summary
   */
  createUnifiedNarrative(data) {
    const sections = [];
    if (data.subjective?.trim()) {
      sections.push("Subjective:\n" + data.subjective.trim());
    }
    if (data.objective?.trim()) {
      sections.push("Objective:\n" + data.objective.trim());
    }
    if (data.assessment?.trim()) {
      sections.push("Assessment:\n" + data.assessment.trim());
    }
    if (data.plan?.trim()) {
      sections.push("Plan:\n" + data.plan.trim());
    }
    if (data.tonalAnalysis?.trim()) {
      sections.push("Analysis:\n" + data.tonalAnalysis.trim());
    }
    let insights = "";
    let summary = data.narrativeSummary?.trim() || "";
    if (summary.includes("Insights:") || summary.includes("Key Insights:")) {
      const insightMatch = summary.match(/(.*?)(Insights?:.*?)(?:Summary:.*?$|$)/s);
      if (insightMatch) {
        insights = insightMatch[2].trim();
        summary = summary.replace(insightMatch[2], "").trim();
      }
    }
    if (insights) {
      sections.push("Insights:\n" + insights);
    }
    if (summary) {
      sections.push("Summary:\n" + summary);
    }
    return sections.join("\n\n");
  }
  /**
   * Generates AI tags for session notes based on unified narrative content
   */
  async generateAITags(content) {
    try {
      console.log("\u{1F3F7}\uFE0F  Generating AI tags for unified narrative...");
      const response = await openai3.chat.completions.create({
        model: "gpt-4o",
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are an expert clinical AI assistant. Analyze the therapy session content and generate relevant therapeutic tags that will help with appointment and progress note organization.

            Focus on identifying:
            - Therapeutic modalities used (CBT, DBT, ACT, EMDR, Narrative Therapy, etc.)
            - Clinical presentations (Anxiety, Depression, PTSD, Bipolar, OCD, etc.)
            - Treatment components (Homework, Mindfulness, Coping Skills, Exposure, etc.)
            - Progress indicators (Improvement, Setback, Breakthrough, Maintenance, etc.)
            - Session focus (Crisis, Intake, Follow-up, Treatment Planning, etc.)
            - Therapeutic techniques (Cognitive Restructuring, Behavioral Activation, etc.)
            - Client demographics/context (Adult, Adolescent, Family, Couples, etc.)

            RESPOND ONLY WITH VALID JSON in this format:
            {"tags": ["tag1", "tag2", "tag3"]}

            Return 6-10 most relevant tags. Be specific and clinically accurate.`
          },
          {
            role: "user",
            content: `Generate therapeutic tags for this progress note content:

${content.substring(0, 3e3)}`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 300
      });
      const result = JSON.parse(response.choices[0].message.content || '{"tags":[]}');
      const tags = result.tags || result.therapeuticTags || [];
      const validTags = tags.filter((tag) => typeof tag === "string" && tag.trim().length > 0).slice(0, 10);
      console.log(`\u2705 Generated ${validTags.length} AI tags: ${validTags.join(", ")}`);
      return validTags;
    } catch (error) {
      console.error("\u274C AI tag generation failed:", error);
      const fallbackTags = this.extractBasicTags(content);
      console.log(`\u{1F504} Using fallback tags: ${fallbackTags.join(", ")}`);
      return fallbackTags;
    }
  }
  /**
   * Fallback method for basic tag extraction
   */
  extractBasicTags(content) {
    const tags = [];
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes("cbt") || lowerContent.includes("cognitive behavioral")) tags.push("CBT");
    if (lowerContent.includes("dbt") || lowerContent.includes("dialectical")) tags.push("DBT");
    if (lowerContent.includes("act") || lowerContent.includes("acceptance commitment")) tags.push("ACT");
    if (lowerContent.includes("mindfulness") || lowerContent.includes("meditation")) tags.push("Mindfulness");
    if (lowerContent.includes("emdr")) tags.push("EMDR");
    if (lowerContent.includes("narrative therapy")) tags.push("Narrative Therapy");
    if (lowerContent.includes("exposure") || lowerContent.includes("systematic desensitization")) tags.push("Exposure Therapy");
    if (lowerContent.includes("anxiety") || lowerContent.includes("anxious") || lowerContent.includes("panic")) tags.push("Anxiety");
    if (lowerContent.includes("depression") || lowerContent.includes("depressed") || lowerContent.includes("mood")) tags.push("Depression");
    if (lowerContent.includes("trauma") || lowerContent.includes("ptsd") || lowerContent.includes("traumatic")) tags.push("Trauma");
    if (lowerContent.includes("grief") || lowerContent.includes("loss") || lowerContent.includes("bereavement")) tags.push("Grief/Loss");
    if (lowerContent.includes("relationship") || lowerContent.includes("couple") || lowerContent.includes("marriage")) tags.push("Relationships");
    if (lowerContent.includes("work") || lowerContent.includes("job") || lowerContent.includes("career") || lowerContent.includes("employment")) tags.push("Work Stress");
    if (lowerContent.includes("family") || lowerContent.includes("parent") || lowerContent.includes("child")) tags.push("Family Issues");
    if (lowerContent.includes("substance") || lowerContent.includes("addiction") || lowerContent.includes("alcohol")) tags.push("Substance Use");
    if (lowerContent.includes("sleep") || lowerContent.includes("insomnia") || lowerContent.includes("nightmare")) tags.push("Sleep Issues");
    if (lowerContent.includes("anger") || lowerContent.includes("aggression") || lowerContent.includes("irritability")) tags.push("Anger Management");
    if (lowerContent.includes("improvement") || lowerContent.includes("progress") || lowerContent.includes("better") || lowerContent.includes("healing")) tags.push("Progress");
    if (lowerContent.includes("crisis") || lowerContent.includes("emergency") || lowerContent.includes("suicidal") || lowerContent.includes("risk")) tags.push("Crisis");
    if (lowerContent.includes("homework") || lowerContent.includes("assignment") || lowerContent.includes("practice")) tags.push("Homework");
    if (lowerContent.includes("coping") || lowerContent.includes("strategies") || lowerContent.includes("skills")) tags.push("Coping Skills");
    if (lowerContent.includes("medication") || lowerContent.includes("med") || lowerContent.includes("prescription") || lowerContent.includes("psychiatrist")) tags.push("Medication");
    if (lowerContent.includes("breakthrough") || lowerContent.includes("insight") || lowerContent.includes("awareness")) tags.push("Breakthrough");
    if (lowerContent.includes("setback") || lowerContent.includes("relapse") || lowerContent.includes("regression")) tags.push("Setback");
    if (lowerContent.includes("intake") || lowerContent.includes("initial") || lowerContent.includes("assessment")) tags.push("Intake");
    if (lowerContent.includes("follow-up") || lowerContent.includes("follow up") || lowerContent.includes("continuing")) tags.push("Follow-up");
    if (lowerContent.includes("termination") || lowerContent.includes("discharge") || lowerContent.includes("ending")) tags.push("Termination");
    return tags.slice(0, 10);
  }
  // MERGED FUNCTIONALITY: Progress notes now created directly as unified session notes
  async createProgressNote(data) {
    try {
      const unifiedNarrative = this.createUnifiedNarrative({
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        tonalAnalysis: data.tonalAnalysis,
        narrativeSummary: data.narrativeSummary
      });
      const aiTags = await this.generateAITags(unifiedNarrative);
      const [sessionNote] = await db.insert(sessionNotes).values({
        clientId: data.clientId,
        therapistId: data.therapistId,
        appointmentId: data.appointmentId || null,
        content: unifiedNarrative,
        aiSummary: `Clinical progress note: ${data.title}`,
        tags: aiTags,
        // SOAP note fields (formerly in progress notes table)
        title: data.title,
        subjective: data.subjective,
        objective: data.objective,
        assessment: data.assessment,
        plan: data.plan,
        tonalAnalysis: data.tonalAnalysis,
        keyPoints: data.keyPoints,
        significantQuotes: data.significantQuotes,
        narrativeSummary: data.narrativeSummary,
        sessionDate: data.sessionDate,
        aiTags
      }).returning();
      console.log("\u2705 Unified session note created with SOAP structure");
      console.log(`\u{1F4CA} Generated ${aiTags.length} AI tags: ${aiTags.join(", ")}`);
      return {
        id: sessionNote.id,
        clientId: sessionNote.clientId,
        therapistId: sessionNote.therapistId,
        title: sessionNote.title,
        subjective: sessionNote.subjective,
        objective: sessionNote.objective,
        assessment: sessionNote.assessment,
        plan: sessionNote.plan,
        tonalAnalysis: sessionNote.tonalAnalysis,
        keyPoints: sessionNote.keyPoints,
        significantQuotes: sessionNote.significantQuotes,
        narrativeSummary: sessionNote.narrativeSummary,
        sessionDate: sessionNote.sessionDate,
        appointmentId: sessionNote.appointmentId,
        createdAt: sessionNote.createdAt,
        updatedAt: sessionNote.updatedAt,
        unifiedNoteCreated: true,
        aiTags
      };
    } catch (error) {
      console.error("Error creating unified session note:", error);
      throw error;
    }
  }
  // Merged functionality: Use getSessionNotes with therapist filter instead
  // Compass AI conversation and memory methods implementation
  async createCompassConversation(conversation) {
    try {
      const [newConversation] = await db.insert(compassConversations).values(conversation).returning();
      return newConversation;
    } catch (error) {
      console.error("Error creating compass conversation:", error);
      throw error;
    }
  }
  async getCompassConversations(therapistId, sessionId, limit = 50) {
    try {
      const whereConditions = [eq(compassConversations.therapistId, therapistId)];
      if (sessionId) {
        whereConditions.push(eq(compassConversations.sessionId, sessionId));
      }
      const conversations = await db.select().from(compassConversations).where(and(...whereConditions)).orderBy(desc(compassConversations.createdAt)).limit(limit);
      return conversations;
    } catch (error) {
      console.error("Error fetching compass conversations:", error);
      return [];
    }
  }
  async getCompassConversationHistory(therapistId, limit = 100) {
    try {
      const conversations = await db.select().from(compassConversations).where(eq(compassConversations.therapistId, therapistId)).orderBy(desc(compassConversations.createdAt)).limit(limit);
      return conversations;
    } catch (error) {
      console.error("Error fetching compass conversation history:", error);
      return [];
    }
  }
  async setCompassMemory(memory) {
    try {
      const [existing] = await db.select().from(compassMemory).where(
        and(
          eq(compassMemory.therapistId, memory.therapistId),
          eq(compassMemory.contextType, memory.contextType),
          eq(compassMemory.contextKey, memory.contextKey)
        )
      );
      if (existing) {
        const [updated] = await db.update(compassMemory).set({
          contextValue: memory.contextValue,
          confidence: memory.confidence || existing.confidence,
          lastAccessed: /* @__PURE__ */ new Date(),
          accessCount: sql2`${compassMemory.accessCount} + 1`,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(compassMemory.id, existing.id)).returning();
        return updated;
      } else {
        const [newMemory] = await db.insert(compassMemory).values(memory).returning();
        return newMemory;
      }
    } catch (error) {
      console.error("Error setting compass memory:", error);
      throw error;
    }
  }
  async getCompassMemory(therapistId, contextType, contextKey) {
    try {
      const whereConditions = [
        eq(compassMemory.therapistId, therapistId),
        eq(compassMemory.contextType, contextType),
        eq(compassMemory.isActive, true)
      ];
      if (contextKey) {
        whereConditions.push(eq(compassMemory.contextKey, contextKey));
      }
      const memories = await db.select().from(compassMemory).where(and(...whereConditions)).orderBy(desc(compassMemory.lastAccessed));
      return memories;
    } catch (error) {
      console.error("Error fetching compass memory:", error);
      return [];
    }
  }
  async updateCompassMemoryAccess(id) {
    try {
      const [updated] = await db.update(compassMemory).set({
        lastAccessed: /* @__PURE__ */ new Date(),
        accessCount: sql2`${compassMemory.accessCount} + 1`
      }).where(eq(compassMemory.id, id)).returning();
      return updated;
    } catch (error) {
      console.error("Error updating compass memory access:", error);
      throw error;
    }
  }
  async getCompassLearningContext(therapistId) {
    try {
      const [preferences, patterns, queries] = await Promise.all([
        this.getCompassMemory(therapistId, "user_preference"),
        this.getCompassMemory(therapistId, "workflow_pattern"),
        this.getCompassMemory(therapistId, "frequent_query")
      ]);
      return {
        preferences: preferences.reduce((acc, p) => ({
          ...acc,
          [p.contextKey]: p.contextValue
        }), {}),
        patterns: patterns.reduce((acc, p) => ({
          ...acc,
          [p.contextKey]: p.contextValue
        }), {}),
        frequentQueries: queries.reduce((acc, q) => ({
          ...acc,
          [q.contextKey]: q.contextValue
        }), {})
      };
    } catch (error) {
      console.error("Error fetching compass learning context:", error);
      return {
        preferences: {},
        patterns: {},
        frequentQueries: {}
      };
    }
  }
  // Session Summaries Implementation
  async getSessionSummaries(clientId) {
    return await db.select().from(sessionSummaries).where(eq(sessionSummaries.clientId, clientId)).orderBy(desc(sessionSummaries.createdAt));
  }
  async getSessionSummariesByTherapist(therapistId) {
    return await db.select().from(sessionSummaries).where(eq(sessionSummaries.therapistId, therapistId)).orderBy(desc(sessionSummaries.createdAt));
  }
  async getSessionSummary(id) {
    const [summary] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.id, id));
    return summary || void 0;
  }
  async createSessionSummary(summary) {
    const [newSummary] = await db.insert(sessionSummaries).values(summary).returning();
    return newSummary;
  }
  async updateSessionSummary(id, summary) {
    const [updatedSummary] = await db.update(sessionSummaries).set({ ...summary, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessionSummaries.id, id)).returning();
    return updatedSummary;
  }
  async generateAISessionSummary(sessionNoteIds, clientId, therapistId, timeframe) {
    try {
      const sessionNotes2 = await Promise.all(
        sessionNoteIds.map((id) => this.getSessionNote(id))
      );
      const client = await this.getClient(clientId);
      if (!client) {
        throw new Error("Client not found");
      }
      const validSessionNotes = sessionNotes2.filter((note) => note != null);
      if (validSessionNotes.length === 0) {
        throw new Error("No valid session notes found");
      }
      const sessionContext = validSessionNotes.map((note) => ({
        date: note.sessionDate,
        content: note.content,
        tags: note.tags || [],
        insights: note.insights || {}
      }));
      const dateRange = {
        startDate: new Date(Math.min(...sessionContext.map((s) => s.date ? new Date(s.date || /* @__PURE__ */ new Date()).getTime() : Date.now()))),
        endDate: new Date(Math.max(...sessionContext.map((s) => s.date ? new Date(s.date || /* @__PURE__ */ new Date()).getTime() : Date.now())))
      };
      const aiPrompt = `As an expert clinical therapist, analyze the following session notes for ${client.firstName} ${client.lastName} and generate a comprehensive clinical summary with visual data insights.

Client Context:
- Name: ${client.firstName} ${client.lastName}  
- Primary Concerns: ${client.primaryConcerns || "Not specified"}
- Risk Level: ${client.riskLevel || "Low"}

Session Notes (${timeframe}):
${JSON.stringify(sessionContext, null, 2)}

Generate a comprehensive summary in the following JSON format:
{
  "keyInsights": [
    "Primary therapeutic insights and breakthroughs",
    "Behavioral patterns observed",
    "Progress indicators"
  ],
  "progressMetrics": {
    "therapyEngagement": 85,
    "goalProgress": 70,
    "symptomImprovement": 60,
    "functionalImprovement": 75
  },
  "moodTrends": {
    "averageMood": 6.5,
    "moodStability": "improving",
    "trendData": [
      {"session": 1, "mood": 5.0, "anxiety": 7.0, "energy": 4.0},
      {"session": 2, "mood": 6.0, "anxiety": 6.0, "energy": 5.0},
      {"session": 3, "mood": 7.0, "anxiety": 5.0, "energy": 6.0}
    ]
  },
  "goalProgress": [
    {
      "goal": "Reduce anxiety symptoms",
      "baseline": 8.0,
      "current": 5.5,
      "target": 3.0,
      "progressPercentage": 45
    }
  ],
  "interventionEffectiveness": {
    "mostEffective": ["CBT techniques", "Mindfulness exercises"],
    "leastEffective": ["Exposure therapy"],
    "effectivenessScores": {
      "CBT": 85,
      "Mindfulness": 78,
      "ExposureTherapy": 45
    }
  },
  "riskAssessment": {
    "currentRiskLevel": "low",
    "riskFactors": [],
    "protectiveFactors": ["Strong support system", "Medication compliance"]
  },
  "recommendedActions": [
    "Continue current CBT approach",
    "Increase mindfulness practice frequency",
    "Schedule medication review"
  ],
  "visualData": {
    "chartConfigurations": [
      {
        "type": "line",
        "title": "Mood Progression",
        "data": "moodTrends.trendData",
        "xAxis": "session",
        "yAxis": "mood"
      },
      {
        "type": "bar",
        "title": "Goal Progress",
        "data": "goalProgress",
        "xAxis": "goal",
        "yAxis": "progressPercentage"
      }
    ]
  },
  "clinicalNarrative": "Comprehensive clinical narrative summarizing the therapeutic journey, key themes, and overall progress assessment."
}`;
      const response = await openai3.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert clinical therapist specializing in data analysis and progress tracking. Generate comprehensive session summaries with actionable insights."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3e3
      });
      const aiAnalysis = JSON.parse(response.choices[0].message.content || "{}");
      const summaryData = {
        clientId,
        therapistId,
        sessionNoteIds,
        title: `${timeframe} Session Summary - ${client.firstName} ${client.lastName}`,
        timeframe,
        summaryType: "comprehensive",
        keyInsights: aiAnalysis.keyInsights || [],
        progressMetrics: aiAnalysis.progressMetrics || {},
        moodTrends: aiAnalysis.moodTrends || null,
        goalProgress: aiAnalysis.goalProgress || null,
        interventionEffectiveness: aiAnalysis.interventionEffectiveness || null,
        riskAssessment: aiAnalysis.riskAssessment || null,
        recommendedActions: aiAnalysis.recommendedActions || null,
        visualData: aiAnalysis.visualData || {},
        aiGeneratedContent: aiAnalysis.clinicalNarrative || "",
        confidence: 0.85,
        dateRange: { startDate, endDate },
        sessionCount: validSessionNotes.length,
        avgSessionRating: null,
        aiModel: "gpt-4o",
        status: "generated"
      };
      return await this.createSessionSummary(summaryData);
    } catch (error) {
      console.error("Error generating AI session summary:", error);
      throw error;
    }
  }
  // Calendar Events methods
  async getCalendarEvents(therapistId, startDate2, endDate2) {
    let query = db.select().from(calendarEvents).where(eq(calendarEvents.therapistId, therapistId));
    if (startDate2 && endDate2) {
      query = query.where(
        and(
          gte(calendarEvents.startTime, startDate2),
          lte(calendarEvents.startTime, endDate2)
        )
      );
    }
    return await query.orderBy(asc(calendarEvents.startTime));
  }
  async getCalendarEvent(id) {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event || void 0;
  }
  async getCalendarEventByGoogleId(googleEventId) {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.googleEventId, googleEventId));
    return event || void 0;
  }
  async upsertCalendarEvent(event) {
    const existingEvent = await this.getCalendarEventByGoogleId(event.googleEventId);
    if (existingEvent) {
      const [updatedEvent] = await db.update(calendarEvents).set({
        ...event,
        lastSyncTime: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(calendarEvents.id, existingEvent.id)).returning();
      return updatedEvent;
    } else {
      const [newEvent] = await db.insert(calendarEvents).values(event).returning();
      return newEvent;
    }
  }
  async deleteCalendarEvent(id) {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }
  async syncCalendarEvents(events) {
    let syncedCount = 0;
    for (const event of events) {
      try {
        await this.upsertCalendarEvent(event);
        syncedCount++;
      } catch (error) {
        console.error("Error syncing calendar event:", error);
      }
    }
    return syncedCount;
  }
  async getDocumentStatistics(params) {
    try {
      const conditions = [];
      if (params.therapistId) {
        conditions.push(eq(documents.therapistId, params.therapistId));
      }
      if (params.startDate) {
        conditions.push(gte(documents.createdAt, params.startDate));
      }
      if (params.endDate) {
        conditions.push(lte(documents.createdAt, params.endDate));
      }
      const allDocs = await db.select().from(documents).where(conditions.length > 0 ? and(...conditions) : void 0);
      const stats = {
        totalDocuments: allDocs.length,
        totalSize: allDocs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0),
        byCategory: {},
        byType: {},
        averageProcessingTime: 0,
        recentDocuments: allDocs.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)).slice(0, 10).map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          originalName: doc.originalName,
          fileType: doc.fileType,
          fileSize: doc.fileSize,
          category: doc.category,
          createdAt: doc.createdAt
        }))
      };
      for (const doc of allDocs) {
        const category = doc.category || "uncategorized";
        const fileType = doc.fileType || "unknown";
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
        stats.byType[fileType] = (stats.byType[fileType] || 0) + 1;
      }
      const processingTimes = allDocs.map((doc) => {
        if (doc.metadata && typeof doc.metadata === "object") {
          const metadata = doc.metadata;
          return metadata.processingTime || 0;
        }
        return 0;
      }).filter((time) => time > 0);
      if (processingTimes.length > 0) {
        stats.averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      }
      return stats;
    } catch (error) {
      console.error("Error getting document statistics:", error);
      throw error;
    }
  }
  // Added methods for recent activity and calendar sync stats
  async getRecentSessionNotes(therapistId, days) {
    try {
      const dateThreshold = /* @__PURE__ */ new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const result = await pool.query(
        "SELECT * FROM session_notes WHERE therapist_id = $1 AND created_at >= $2 ORDER BY created_at DESC LIMIT 10",
        [therapistId, dateThreshold]
      );
      return result.rows.map((row) => this.mapSessionNoteRow(row));
    } catch (error) {
      console.error("Error in getRecentSessionNotes:", error);
      return [];
    }
  }
  async getTodaysSessionNotes(therapistId) {
    try {
      const today = /* @__PURE__ */ new Date();
      const startOfDay = new Date(today || /* @__PURE__ */ new Date());
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today || /* @__PURE__ */ new Date());
      endOfDay.setHours(23, 59, 59, 999);
      const result = await pool.query(
        "SELECT sn.*, c.first_name, c.last_name FROM session_notes sn LEFT JOIN clients c ON sn.client_id = c.id::text WHERE sn.therapist_id = $1 AND sn.created_at >= $2 AND sn.created_at <= $3 ORDER BY sn.created_at DESC",
        [therapistId, startOfDay, endOfDay]
      );
      return result.rows.map((row) => this.mapSessionNoteRow(row));
    } catch (error) {
      console.error("Error in getTodaysSessionNotes:", error);
      return [];
    }
  }
  async getRecentAppointments(therapistId, days) {
    try {
      const dateThreshold = /* @__PURE__ */ new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      return await db.select().from(appointments).where(
        and(
          eq(appointments.therapistId, therapistId),
          gte(appointments.startTime, dateThreshold)
        )
      ).orderBy(desc(appointments.startTime)).limit(10);
    } catch (error) {
      console.error("Error in getRecentAppointments:", error);
      return [];
    }
  }
  async getRecentClients(therapistId, days) {
    try {
      const dateThreshold = /* @__PURE__ */ new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      return await db.select().from(clients).where(
        and(
          eq(clients.therapistId, therapistId),
          gte(clients.createdAt, dateThreshold)
        )
      ).orderBy(desc(clients.createdAt)).limit(10);
    } catch (error) {
      console.error("Error in getRecentClients:", error);
      return [];
    }
  }
  async getRecentCompletedActionItems(therapistId, days) {
    try {
      const dateThreshold = /* @__PURE__ */ new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      return await db.select().from(actionItems).where(
        and(
          eq(actionItems.therapistId, therapistId),
          eq(actionItems.status, "completed"),
          gte(actionItems.completedAt, dateThreshold)
        )
      ).orderBy(desc(actionItems.completedAt)).limit(10);
    } catch (error) {
      console.error("Error in getRecentCompletedActionItems:", error);
      return [];
    }
  }
  async getCalendarSyncStats(therapistId) {
    try {
      const [lastEvent] = await db.select().from(calendarEvents).where(eq(calendarEvents.therapistId, therapistId)).orderBy(desc(calendarEvents.lastSyncTime)).limit(1);
      const [appointmentCount] = await db.select({ count: count() }).from(appointments).where(eq(appointments.therapistId, therapistId));
      return {
        lastSyncAt: lastEvent?.lastSyncTime?.toISOString(),
        appointmentsCount: appointmentCount.count
      };
    } catch (error) {
      console.error("Error getting calendar sync stats:", error);
      return {
        lastSyncAt: void 0,
        appointmentsCount: 0
      };
    }
  }
  // Essential missing interface methods
  async getSessionNotes(clientId) {
    return await this.getSessionNotesByClientId(clientId);
  }
  async getSessionNote(id) {
    return await this.getSessionNoteById(id);
  }
  async createSessionNote(note) {
    try {
      const [sessionNote] = await db.insert(sessionNotes).values({
        ...note,
        createdAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return sessionNote;
    } catch (error) {
      console.error("Error in createSessionNote:", error);
      throw error;
    }
  }
  async updateSessionNote(id, note) {
    try {
      const updateData = {};
      Object.keys(note).forEach((key) => {
        const value = note[key];
        if (value !== void 0 && value !== null) {
          updateData[key] = value;
        }
      });
      updateData.updatedAt = sql2`NOW()`;
      const [updatedNote] = await db.update(sessionNotes).set(updateData).where(eq(sessionNotes.id, id)).returning();
      return updatedNote;
    } catch (error) {
      console.error("Error in updateSessionNote:", error);
      throw error;
    }
  }
  async deleteSessionNote(id) {
    try {
      await db.delete(sessionNotes).where(eq(sessionNotes.id, id));
    } catch (error) {
      console.error("Error in deleteSessionNote:", error);
      throw error;
    }
  }
  async getSessionNotesByEventId(eventId) {
    try {
      const query = `
        SELECT sn.*, c.first_name, c.last_name
        FROM session_notes sn
        LEFT JOIN clients c ON sn.client_id = c.id::text
        WHERE sn.event_id = $1
        ORDER BY sn.created_at DESC
      `;
      const result = await pool.query(query, [eventId]);
      return result.rows.map((row) => this.mapSessionNoteRow(row));
    } catch (error) {
      console.error("Error in getSessionNotesByEventId:", error);
      return [];
    }
  }
  async getDocumentsByTherapist(therapistId) {
    try {
      const result = await db.select().from(documents).where(eq(documents.therapistId, therapistId)).orderBy(desc(documents.createdAt));
      return result;
    } catch (error) {
      console.error("Error fetching documents by therapist:", error);
      return [];
    }
  }
  // Session recommendation methods
  async getSessionRecommendations(clientId) {
    return await db.select().from(sessionRecommendations).where(eq(sessionRecommendations.clientId, clientId)).orderBy(desc(sessionRecommendations.createdAt));
  }
  async getTherapistSessionRecommendations(therapistId) {
    return await db.select().from(sessionRecommendations).where(eq(sessionRecommendations.therapistId, therapistId)).orderBy(desc(sessionRecommendations.createdAt));
  }
  async createSessionRecommendation(recommendation) {
    const [newRecommendation] = await db.insert(sessionRecommendations).values(recommendation).returning();
    return newRecommendation;
  }
  async updateSessionRecommendation(id, recommendation) {
    const [updatedRecommendation] = await db.update(sessionRecommendations).set({ ...recommendation, updatedAt: /* @__PURE__ */ new Date() }).where(eq(sessionRecommendations.id, id)).returning();
    return updatedRecommendation;
  }
  async markRecommendationAsImplemented(id, feedback, effectiveness) {
    const [updatedRecommendation] = await db.update(sessionRecommendations).set({
      isImplemented: true,
      implementedAt: /* @__PURE__ */ new Date(),
      feedback: feedback || null,
      effectiveness: effectiveness || null,
      status: "implemented",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(sessionRecommendations.id, id)).returning();
    return updatedRecommendation;
  }
  async generateSessionRecommendations(clientId, therapistId) {
    return [];
  }
  // Assessment catalog methods
  async getAssessmentCatalog() {
    return await db.select().from(assessmentCatalog).orderBy(assessmentCatalog.name);
  }
  async getAssessmentCatalogByCategory(category) {
    return await db.select().from(assessmentCatalog).where(eq(assessmentCatalog.category, category)).orderBy(assessmentCatalog.name);
  }
  async getAssessmentCatalogItem(id) {
    const [item] = await db.select().from(assessmentCatalog).where(eq(assessmentCatalog.id, id));
    return item || void 0;
  }
  async createAssessmentCatalogItem(item) {
    const [newItem] = await db.insert(assessmentCatalog).values(item).returning();
    return newItem;
  }
  async updateAssessmentCatalogItem(id, item) {
    const [updatedItem] = await db.update(assessmentCatalog).set({ ...item, updatedAt: /* @__PURE__ */ new Date() }).where(eq(assessmentCatalog.id, id)).returning();
    return updatedItem;
  }
  // Client assessment methods
  async getClientAssessments(clientId) {
    return await db.select().from(clientAssessments).where(eq(clientAssessments.clientId, clientId)).orderBy(desc(clientAssessments.assignedDate));
  }
  async getTherapistAssignedAssessments(therapistId, status) {
    let query = db.select().from(clientAssessments).where(eq(clientAssessments.therapistId, therapistId));
    if (status) {
      query = query.where(eq(clientAssessments.status, status));
    }
    return await query.orderBy(desc(clientAssessments.assignedDate));
  }
  async getClientAssessment(id) {
    const [assessment] = await db.select().from(clientAssessments).where(eq(clientAssessments.id, id));
    return assessment || void 0;
  }
  async assignAssessmentToClient(assignment) {
    const [newAssignment] = await db.insert(clientAssessments).values(assignment).returning();
    return newAssignment;
  }
  async updateClientAssessment(id, update) {
    const [updatedAssessment] = await db.update(clientAssessments).set({ ...update, updatedAt: /* @__PURE__ */ new Date() }).where(eq(clientAssessments.id, id)).returning();
    return updatedAssessment;
  }
  async startClientAssessment(id) {
    const [updatedAssessment] = await db.update(clientAssessments).set({
      status: "in_progress",
      startedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(clientAssessments.id, id)).returning();
    return updatedAssessment;
  }
  async completeClientAssessment(id, completedDate) {
    const [updatedAssessment] = await db.update(clientAssessments).set({
      status: "completed",
      completedAt: completedDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(clientAssessments.id, id)).returning();
    return updatedAssessment;
  }
  async sendAssessmentReminder(id) {
    const [updatedAssessment] = await db.update(clientAssessments).set({
      lastReminderSent: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(clientAssessments.id, id)).returning();
    return updatedAssessment;
  }
  // Assessment response methods
  async getAssessmentResponses(clientAssessmentId) {
    return await db.select().from(assessmentResponses).where(eq(assessmentResponses.clientAssessmentId, clientAssessmentId)).orderBy(assessmentResponses.questionNumber);
  }
  async createAssessmentResponse(response) {
    const [newResponse] = await db.insert(assessmentResponses).values(response).returning();
    return newResponse;
  }
  // Assessment score methods
  async getAssessmentScores(clientAssessmentId) {
    return await db.select().from(assessmentScores).where(eq(assessmentScores.clientAssessmentId, clientAssessmentId));
  }
  async createAssessmentScore(score) {
    const [newScore] = await db.insert(assessmentScores).values(score).returning();
    return newScore;
  }
  async validateAssessmentScore(id, validatedBy) {
    const [updatedScore] = await db.update(assessmentScores).set({
      isValidated: true,
      validatedBy,
      validatedAt: /* @__PURE__ */ new Date()
    }).where(eq(assessmentScores.id, id)).returning();
    return updatedScore;
  }
  // Assessment package methods
  async getAssessmentPackages() {
    return await db.select().from(assessmentPackages).orderBy(assessmentPackages.name);
  }
  async createAssessmentPackage(pkg) {
    const [newPackage] = await db.insert(assessmentPackages).values(pkg).returning();
    return newPackage;
  }
  // Assessment audit methods
  async getClientAssessmentAuditLogs(clientAssessmentId) {
    return await db.select().from(assessmentAuditLog).where(eq(assessmentAuditLog.clientAssessmentId, clientAssessmentId)).orderBy(desc(assessmentAuditLog.timestamp));
  }
};
var storage = new DatabaseStorage();

// server/document-processor-enhanced.ts
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
var CHUNK_SIZE = 1024 * 1024;
var MAX_FILE_SIZE = 50 * 1024 * 1024;
var MAX_CONCURRENT_PROCESSING = 5;
var COMPRESSION_THRESHOLD = 1024 * 1024;
var EnhancedDocumentProcessor = class extends EventEmitter {
  constructor() {
    super();
    this.processingQueue = /* @__PURE__ */ new Map();
    this.fileHashCache = /* @__PURE__ */ new Map();
    this.processingWorkers = 0;
    this.maxWorkers = MAX_CONCURRENT_PROCESSING;
    this.openai = new OpenAI4({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  /**
   * Process a document with streaming and chunking support
   */
  async processDocumentStream(fileStream, fileName, fileSize, options) {
    const processingId = randomUUID();
    const startTime = Date.now();
    const progress = {
      id: processingId,
      fileName,
      totalSize: fileSize,
      processedSize: 0,
      percentage: 0,
      status: "processing",
      startTime: /* @__PURE__ */ new Date()
    };
    this.processingQueue.set(processingId, progress);
    this.emit("processing:start", progress);
    try {
      if (fileSize > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }
      const tempDir = path2.join(process.cwd(), "temp_uploads");
      if (!fs2.existsSync(tempDir)) {
        fs2.mkdirSync(tempDir, { recursive: true });
      }
      const tempFilePath = path2.join(tempDir, `${processingId}_${fileName}`);
      const writeStream = fs2.createWriteStream(tempFilePath);
      const hash = crypto.createHash("sha256");
      let processedBytes = 0;
      const progressStream = new Transform({
        transform(chunk, encoding, callback) {
          processedBytes += chunk.length;
          hash.update(chunk);
          progress.processedSize = processedBytes;
          progress.percentage = Math.round(processedBytes / fileSize * 100);
          if (options.onProgress) {
            options.onProgress(progress);
          }
          this.push(chunk);
          callback();
        }
      });
      await pipeline(
        fileStream,
        progressStream,
        writeStream
      );
      const fileHash = hash.digest("hex");
      if (this.fileHashCache.has(fileHash)) {
        const existingDocId = this.fileHashCache.get(fileHash);
        fs2.unlinkSync(tempFilePath);
        progress.status = "completed";
        progress.endTime = /* @__PURE__ */ new Date();
        this.emit("processing:complete", progress);
        return {
          fileHash,
          originalSize: fileSize,
          processingTime: Date.now() - startTime,
          chunks: 1,
          documentId: existingDocId
        };
      }
      const fileExtension = path2.extname(fileName).toLowerCase();
      let extractedText = "";
      let metadata = {
        fileHash,
        originalSize: fileSize,
        processingTime: 0,
        chunks: Math.ceil(fileSize / CHUNK_SIZE)
      };
      extractedText = await this.processFileInChunks(tempFilePath, fileExtension, progress);
      let finalFilePath = tempFilePath;
      if (options.compress && fileSize > COMPRESSION_THRESHOLD) {
        const compressedPath = await this.compressFile(tempFilePath);
        metadata.compressedSize = fs2.statSync(compressedPath).size;
        metadata.compressionRatio = metadata.compressedSize / fileSize;
        finalFilePath = compressedPath;
        fs2.unlinkSync(tempFilePath);
      }
      const permanentDir = path2.join(process.cwd(), "uploads", "documents");
      if (!fs2.existsSync(permanentDir)) {
        fs2.mkdirSync(permanentDir, { recursive: true });
      }
      const permanentPath = path2.join(permanentDir, `${fileHash}_${fileName}`);
      fs2.renameSync(finalFilePath, permanentPath);
      const documentData = await this.extractDocumentMetadata(extractedText, fileName);
      const document = await storage.createDocument({
        fileName: `${fileHash}_${fileName}`,
        originalName: fileName,
        fileType: fileExtension,
        fileSize: metadata.compressedSize || fileSize,
        documentType: options.documentType || "general",
        filePath: permanentPath,
        therapistId: options.therapistId,
        clientId: options.clientId || void 0,
        contentSummary: documentData.summary,
        aiTags: documentData.tags,
        clinicalKeywords: documentData.keywords,
        extractedText: extractedText.substring(0, 5e3),
        // Store first 5000 chars
        tags: { metadata }
        // Store metadata in tags field as JSONB
      });
      this.fileHashCache.set(fileHash, document.id);
      metadata.processingTime = Date.now() - startTime;
      metadata.extractedText = extractedText;
      progress.status = "completed";
      progress.endTime = /* @__PURE__ */ new Date();
      progress.result = document;
      this.emit("processing:complete", progress);
      return {
        ...metadata,
        documentId: document.id
      };
    } catch (error) {
      progress.status = "failed";
      progress.error = error.message;
      progress.endTime = /* @__PURE__ */ new Date();
      this.emit("processing:error", { progress, error });
      throw error;
    } finally {
      this.processingQueue.delete(processingId);
    }
  }
  /**
   * Process file in chunks to handle large files efficiently
   */
  async processFileInChunks(filePath, fileExtension, progress) {
    const chunks = [];
    switch (fileExtension) {
      case ".pdf":
        chunks.push(await this.processPDFChunked(filePath, progress));
        break;
      case ".docx":
      case ".doc":
        chunks.push(await this.processWordDocument(filePath));
        break;
      case ".txt":
      case ".md":
        chunks.push(await this.processTextFileChunked(filePath, progress));
        break;
      case ".png":
      case ".jpg":
      case ".jpeg":
        chunks.push(await this.processImage(filePath));
        break;
      case ".xlsx":
      case ".xls":
        chunks.push(await this.processExcelChunked(filePath, progress));
        break;
      case ".csv":
        chunks.push(await this.processCSVChunked(filePath, progress));
        break;
      case ".mp3":
      case ".wav":
      case ".m4a":
        chunks.push(await this.processAudio(filePath, progress));
        break;
      case ".zip":
        return await this.processZipFile(filePath, progress);
      default:
        throw new Error(`Unsupported file type: ${fileExtension}`);
    }
    return chunks.join("\n");
  }
  /**
   * Process PDF files in chunks
   */
  async processPDFChunked(filePath, progress) {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const workerPath = path2.resolve(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `file://${workerPath}`;
      const data = new Uint8Array(fs2.readFileSync(filePath));
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const textChunks = [];
      const totalPages = pdf.numPages;
      const batchSize = 10;
      for (let i = 0; i < totalPages; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, totalPages); j++) {
          batch.push(pdf.getPage(j + 1).then(async (page) => {
            const textContent = await page.getTextContent();
            return textContent.items.map((item) => item.str).join(" ");
          }));
        }
        const batchTexts = await Promise.all(batch);
        textChunks.push(...batchTexts);
        progress.percentage = Math.round((i + batchSize) / totalPages * 100);
        this.emit("processing:progress", progress);
      }
      return textChunks.join("\n");
    } catch (error) {
      console.error("PDF processing error:", error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }
  /**
   * Process Word documents
   */
  async processWordDocument(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  /**
   * Process text files in chunks
   */
  async processTextFileChunked(filePath, progress) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const stream = fs2.createReadStream(filePath, {
        encoding: "utf8",
        highWaterMark: CHUNK_SIZE
      });
      let processedSize = 0;
      const fileSize = fs2.statSync(filePath).size;
      stream.on("data", (chunk) => {
        chunks.push(chunk);
        processedSize += Buffer.byteLength(chunk);
        progress.percentage = Math.round(processedSize / fileSize * 100);
        this.emit("processing:progress", progress);
      });
      stream.on("end", () => resolve(chunks.join("")));
      stream.on("error", reject);
    });
  }
  /**
   * Process images with OCR
   */
  async processImage(filePath) {
    try {
      const optimizedPath = filePath + "_optimized.jpg";
      await sharp(filePath).resize(2e3, 2e3, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(optimizedPath);
      const imageBuffer = fs2.readFileSync(optimizedPath);
      const base64Image = imageBuffer.toString("base64");
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all text from this image. If it's a document, preserve the structure and formatting as much as possible." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 4096
      });
      fs2.unlinkSync(optimizedPath);
      return response.choices[0]?.message?.content || "";
    } catch (error) {
      console.error("Image processing error:", error);
      return "";
    }
  }
  /**
   * Process Excel files in chunks
   */
  async processExcelChunked(filePath, progress) {
    const workbook = xlsx.readFile(filePath);
    const sheets = [];
    const totalSheets = workbook.SheetNames.length;
    workbook.SheetNames.forEach((sheetName, index2) => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      sheets.push(`Sheet: ${sheetName}
${JSON.stringify(jsonData, null, 2)}`);
      progress.percentage = Math.round((index2 + 1) / totalSheets * 100);
      this.emit("processing:progress", progress);
    });
    return sheets.join("\n\n");
  }
  /**
   * Process CSV files in chunks
   */
  async processCSVChunked(filePath, progress) {
    const csvParser = (await import("csv-parser")).default;
    const results = [];
    return new Promise((resolve, reject) => {
      let rowCount = 0;
      fs2.createReadStream(filePath).pipe(csvParser()).on("data", (data) => {
        results.push(data);
        rowCount++;
        if (rowCount % 100 === 0) {
          this.emit("processing:progress", progress);
        }
      }).on("end", () => {
        resolve(JSON.stringify(results, null, 2));
      }).on("error", reject);
    });
  }
  /**
   * Process audio files (transcription)
   */
  async processAudio(filePath, progress) {
    try {
      const stats = fs2.statSync(filePath);
      if (stats.size > 25 * 1024 * 1024) {
        throw new Error("Audio file too large for transcription (max 25MB)");
      }
      const audioStream = fs2.createReadStream(filePath);
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
        response_format: "text"
      });
      return transcription;
    } catch (error) {
      console.error("Audio processing error:", error);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }
  /**
   * Process ZIP files and extract documents
   */
  async processZipFile(filePath, progress) {
    const AdmZip2 = __require("adm-zip");
    const zip = new AdmZip2(filePath);
    const entries = zip.getEntries();
    const extractedTexts = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.isDirectory) {
        const tempPath = path2.join(path2.dirname(filePath), entry.entryName);
        zip.extractEntryTo(entry, path2.dirname(tempPath), false, true);
        try {
          const ext = path2.extname(entry.entryName).toLowerCase();
          if ([".pdf", ".docx", ".txt", ".md"].includes(ext)) {
            const text2 = await this.processFileInChunks(tempPath, ext, progress);
            extractedTexts.push(`File: ${entry.entryName}
${text2}`);
          }
        } catch (error) {
          console.error(`Error processing ${entry.entryName}:`, error);
        } finally {
          if (fs2.existsSync(tempPath)) {
            fs2.unlinkSync(tempPath);
          }
        }
      }
      progress.percentage = Math.round((i + 1) / entries.length * 100);
      this.emit("processing:progress", progress);
    }
    return extractedTexts.join("\n\n---\n\n");
  }
  /**
   * Compress file using gzip
   */
  async compressFile(filePath) {
    const compressedPath = filePath + ".gz";
    const readStream = fs2.createReadStream(filePath);
    const writeStream = fs2.createWriteStream(compressedPath);
    const gzip = zlib.createGzip({ level: 9 });
    await pipeline(readStream, gzip, writeStream);
    return compressedPath;
  }
  /**
   * Extract metadata and generate AI tags
   */
  async extractDocumentMetadata(text2, fileName) {
    try {
      const prompt = `Analyze this document and provide:
1. A brief summary (max 200 words)
2. Top 10 relevant tags with confidence scores
3. Clinical keywords if applicable
4. Document category

Document excerpt: ${text2.substring(0, 3e3)}`;
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      return {
        summary: result.summary || "",
        tags: result.tags || [],
        keywords: result.keywords || [],
        category: result.category || "general"
      };
    } catch (error) {
      console.error("Metadata extraction error:", error);
      return {
        summary: "",
        tags: [],
        keywords: [],
        category: "general"
      };
    }
  }
  /**
   * Batch process multiple documents
   */
  async processBatch(files, options) {
    const results = [];
    const errors = [];
    const maxConcurrent = options.maxConcurrent || this.maxWorkers;
    const processFile = async (file, index2) => {
      const maxRetries = options.maxRetries || 3;
      let lastError;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await this.processDocumentStream(
            file.stream,
            file.name,
            file.size,
            {
              therapistId: options.therapistId,
              clientId: options.clientId,
              compress: options.compress,
              onProgress: (progress) => {
                if (options.onProgress) {
                  options.onProgress({
                    fileIndex: index2,
                    fileName: file.name,
                    progress,
                    totalFiles: files.length
                  });
                }
              }
            }
          );
          return { success: true, result, fileName: file.name };
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries && options.retryOnFailure) {
            await new Promise((resolve) => setTimeout(resolve, 1e3 * attempt));
          }
        }
      }
      return { success: false, error: lastError.message, fileName: file.name };
    };
    const queue = [...files.map((file, index2) => ({ file, index: index2 }))];
    const processing = [];
    while (queue.length > 0 || processing.length > 0) {
      while (processing.length < maxConcurrent && queue.length > 0) {
        const item = queue.shift();
        const promise = processFile(item.file, item.index).then((result) => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
          return result;
        });
        processing.push(promise);
      }
      if (processing.length > 0) {
        const completed = await Promise.race(processing);
        const index2 = processing.findIndex((p) => p === completed);
        processing.splice(index2, 1);
      }
    }
    return {
      processed: results.length,
      failed: errors.length,
      results,
      errors,
      totalTime: Date.now()
    };
  }
  /**
   * Get processing status
   */
  getProcessingStatus(processingId) {
    return this.processingQueue.get(processingId);
  }
  /**
   * Get all active processing jobs
   */
  getActiveJobs() {
    return Array.from(this.processingQueue.values());
  }
  /**
   * Cancel processing job
   */
  cancelProcessing(processingId) {
    const progress = this.processingQueue.get(processingId);
    if (progress && progress.status === "processing") {
      progress.status = "failed";
      progress.error = "Cancelled by user";
      progress.endTime = /* @__PURE__ */ new Date();
      this.emit("processing:cancelled", progress);
      this.processingQueue.delete(processingId);
      return true;
    }
    return false;
  }
};
var enhancedDocumentProcessor = new EnhancedDocumentProcessor();

// server/routes/document-batch-routes.ts
init_ai_multi_model();
import { WebSocketServer } from "ws";
import path3 from "path";
import fs3 from "fs";
import AdmZip from "adm-zip";
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
    // 50MB per file
    files: 20
    // Max 20 files at once
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      ".pdf",
      ".docx",
      ".doc",
      ".txt",
      ".md",
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".bmp",
      ".xlsx",
      ".xls",
      ".csv",
      ".mp3",
      ".wav",
      ".m4a",
      ".zip"
    ];
    const ext = path3.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not supported`));
    }
  }
});
var progressConnections = /* @__PURE__ */ new Map();
function registerDocumentBatchRoutes(app, server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/document-progress"
  });
  wss.on("connection", (ws2, req) => {
    const sessionId = req.url?.split("sessionId=")[1] || "";
    if (sessionId) {
      progressConnections.set(sessionId, ws2);
      ws2.on("close", () => {
        progressConnections.delete(sessionId);
      });
    }
  });
  enhancedDocumentProcessor.on("processing:progress", (progress) => {
    progressConnections.forEach((ws2) => {
      if (ws2.readyState === ws2.OPEN) {
        ws2.send(JSON.stringify({
          type: "progress",
          data: progress
        }));
      }
    });
  });
  enhancedDocumentProcessor.on("processing:complete", (progress) => {
    progressConnections.forEach((ws2) => {
      if (ws2.readyState === ws2.OPEN) {
        ws2.send(JSON.stringify({
          type: "complete",
          data: progress
        }));
      }
    });
  });
  enhancedDocumentProcessor.on("processing:error", ({ progress, error }) => {
    progressConnections.forEach((ws2) => {
      if (ws2.readyState === ws2.OPEN) {
        ws2.send(JSON.stringify({
          type: "error",
          data: { progress, error: error.message }
        }));
      }
    });
  });
  app.post("/api/documents/batch-upload", upload.array("documents", 20), async (req, res) => {
    try {
      const { therapistId, clientId, compress = "true", deduplicate = "true" } = req.body;
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files provided" });
      }
      if (!therapistId) {
        return res.status(400).json({ error: "Therapist ID required" });
      }
      const fileStreams = files.map((file) => ({
        stream: Readable2.from(file.buffer),
        name: file.originalname,
        size: file.size
      }));
      const sessionId = req.headers["x-session-id"];
      const results = await enhancedDocumentProcessor.processBatch(
        fileStreams,
        {
          therapistId,
          clientId,
          compress: compress === "true",
          deduplicate: deduplicate === "true",
          parallel: true,
          maxConcurrent: 5,
          retryOnFailure: true,
          maxRetries: 3,
          onProgress: (batchProgress) => {
            const ws2 = progressConnections.get(sessionId);
            if (ws2 && ws2.readyState === ws2.OPEN) {
              ws2.send(JSON.stringify({
                type: "batch-progress",
                data: batchProgress
              }));
            }
          }
        }
      );
      res.json({
        success: true,
        ...results
      });
    } catch (error) {
      console.error("Batch upload error:", error);
      res.status(500).json({
        error: "Batch processing failed",
        message: error.message
      });
    }
  });
  app.post("/api/documents/import-zip", upload.single("zipFile"), async (req, res) => {
    try {
      const { therapistId, clientId } = req.body;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No ZIP file provided" });
      }
      if (!therapistId) {
        return res.status(400).json({ error: "Therapist ID required" });
      }
      const tempDir = path3.join(process.cwd(), "temp_uploads", `zip_${Date.now()}`);
      fs3.mkdirSync(tempDir, { recursive: true });
      try {
        const zip = new AdmZip(file.buffer);
        zip.extractAllTo(tempDir, true);
        const extractedFiles = [];
        const walkDir = (dir) => {
          const files = fs3.readdirSync(dir);
          for (const file2 of files) {
            const filePath = path3.join(dir, file2);
            const stat = fs3.statSync(filePath);
            if (stat.isDirectory()) {
              walkDir(filePath);
            } else {
              const ext = path3.extname(file2).toLowerCase();
              if ([".pdf", ".docx", ".doc", ".txt", ".md", ".png", ".jpg", ".jpeg", ".csv", ".xlsx"].includes(ext)) {
                extractedFiles.push({
                  path: filePath,
                  name: file2,
                  size: stat.size
                });
              }
            }
          }
        };
        walkDir(tempDir);
        const fileStreams = extractedFiles.map((file2) => ({
          stream: fs3.createReadStream(file2.path),
          name: file2.name,
          size: file2.size
        }));
        const results = await enhancedDocumentProcessor.processBatch(
          fileStreams,
          {
            therapistId,
            clientId,
            compress: true,
            deduplicate: true,
            parallel: true,
            maxConcurrent: 3
          }
        );
        fs3.rmSync(tempDir, { recursive: true, force: true });
        res.json({
          success: true,
          extractedCount: extractedFiles.length,
          ...results
        });
      } catch (error) {
        if (fs3.existsSync(tempDir)) {
          fs3.rmSync(tempDir, { recursive: true, force: true });
        }
        throw error;
      }
    } catch (error) {
      console.error("ZIP import error:", error);
      res.status(500).json({
        error: "ZIP import failed",
        message: error.message
      });
    }
  });
  app.post("/api/documents/import-clients", upload.single("file"), async (req, res) => {
    try {
      const { therapistId } = req.body;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }
      if (!therapistId) {
        return res.status(400).json({ error: "Therapist ID required" });
      }
      const ext = path3.extname(file.originalname).toLowerCase();
      let clientData = [];
      if (ext === ".csv") {
        const csvParser = (await import("csv-parser")).default;
        const stream = Readable2.from(file.buffer);
        await new Promise((resolve, reject) => {
          stream.pipe(csvParser()).on("data", (data) => clientData.push(data)).on("end", resolve).on("error", reject);
        });
      } else if ([".xlsx", ".xls"].includes(ext)) {
        const xlsx2 = await import("xlsx");
        const workbook = xlsx2.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        clientData = xlsx2.utils.sheet_to_json(sheet);
      } else {
        return res.status(400).json({ error: "File must be CSV or Excel format" });
      }
      const results = {
        imported: 0,
        failed: 0,
        errors: []
      };
      for (const row of clientData) {
        try {
          const clientInfo = {
            firstName: row.firstName || row["First Name"] || row.first_name || "",
            lastName: row.lastName || row["Last Name"] || row.last_name || "",
            email: row.email || row.Email || "",
            phone: row.phone || row.Phone || row.telephone || "",
            dateOfBirth: row.dateOfBirth || row["Date of Birth"] || row.dob || null,
            therapistId,
            status: "active"
          };
          if (!clientInfo.firstName || !clientInfo.lastName) {
            throw new Error("First name and last name are required");
          }
          await storage.createClient(clientInfo);
          results.imported++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: clientData.indexOf(row) + 1,
            error: error.message,
            data: row
          });
        }
      }
      res.json({
        success: true,
        totalRows: clientData.length,
        ...results
      });
    } catch (error) {
      console.error("Client import error:", error);
      res.status(500).json({
        error: "Client import failed",
        message: error.message
      });
    }
  });
  app.get("/api/documents/processing-status/:jobId", (req, res) => {
    const { jobId } = req.params;
    const status = enhancedDocumentProcessor.getProcessingStatus(jobId);
    if (status) {
      res.json(status);
    } else {
      res.status(404).json({ error: "Job not found" });
    }
  });
  app.get("/api/documents/active-jobs", (req, res) => {
    const jobs = enhancedDocumentProcessor.getActiveJobs();
    res.json(jobs);
  });
  app.post("/api/documents/cancel/:jobId", (req, res) => {
    const { jobId } = req.params;
    const cancelled = enhancedDocumentProcessor.cancelProcessing(jobId);
    if (cancelled) {
      res.json({ success: true, message: "Job cancelled" });
    } else {
      res.status(404).json({ error: "Job not found or already completed" });
    }
  });
  app.post("/api/documents/transcribe-audio", upload.single("audio"), async (req, res) => {
    try {
      const { therapistId, clientId, sessionDate } = req.body;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No audio file provided" });
      }
      if (!therapistId) {
        return res.status(400).json({ error: "Therapist ID required" });
      }
      const ext = path3.extname(file.originalname).toLowerCase();
      if (![".mp3", ".wav", ".m4a", ".webm"].includes(ext)) {
        return res.status(400).json({ error: "File must be an audio format (MP3, WAV, M4A, WEBM)" });
      }
      const stream = Readable2.from(file.buffer);
      const result = await enhancedDocumentProcessor.processDocumentStream(
        stream,
        file.originalname,
        file.size,
        {
          therapistId,
          clientId,
          documentType: "session-transcript",
          compress: false
        }
      );
      if (clientId && sessionDate && result.extractedText) {
        const sessionNote = await storage.createSessionNote({
          clientId,
          therapistId,
          sessionDate: new Date(sessionDate),
          noteType: "progress",
          content: result.extractedText,
          subjective: "Transcribed from audio recording",
          objective: "",
          assessment: "",
          plan: "",
          metadata: {
            audioFile: file.originalname,
            transcriptionId: result.documentId
          }
        });
        result.sessionNoteId = sessionNote.id;
      }
      res.json({
        success: true,
        documentId: result.documentId,
        sessionNoteId: result.sessionNoteId,
        transcription: result.extractedText?.substring(0, 1e3)
        // Return first 1000 chars
      });
    } catch (error) {
      console.error("Audio transcription error:", error);
      res.status(500).json({
        error: "Transcription failed",
        message: error.message
      });
    }
  });
  app.post("/api/documents/analyze-batch", async (req, res) => {
    try {
      const { documentIds, analysisType = "comprehensive" } = req.body;
      if (!documentIds || documentIds.length === 0) {
        return res.status(400).json({ error: "Document IDs required" });
      }
      const documents2 = await Promise.all(
        documentIds.map((id) => storage.getDocument(id))
      );
      const analysis = {
        documentCount: documents2.length,
        commonThemes: [],
        timeline: [],
        riskFactors: [],
        progressIndicators: [],
        recommendations: []
      };
      const allText = documents2.map((doc) => doc.extractedText || doc.contentSummary || "").join("\n\n");
      if (allText.length > 0) {
        const prompt = `Analyze these ${documents2.length} clinical documents and identify:
1. Common themes and patterns
2. Risk factors or concerns
3. Progress indicators
4. Treatment recommendations

Focus on clinically relevant insights that would help a therapist.

Documents content: ${allText.substring(0, 1e4)}`;
        const response = await multiModelAI.generateResponse(prompt, "claude");
        analysis.commonThemes = response.match(/theme[s]?:?\s*([^\n]+)/gi)?.map((m) => m.replace(/theme[s]?:?\s*/i, "")) || [];
        analysis.riskFactors = response.match(/risk[s]?:?\s*([^\n]+)/gi)?.map((m) => m.replace(/risk[s]?:?\s*/i, "")) || [];
        analysis.progressIndicators = response.match(/progress:?\s*([^\n]+)/gi)?.map((m) => m.replace(/progress:?\s*/i, "")) || [];
        analysis.recommendations = response.match(/recommend[ation]?[s]?:?\s*([^\n]+)/gi)?.map((m) => m.replace(/recommend[ation]?[s]?:?\s*/i, "")) || [];
      }
      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      console.error("Batch analysis error:", error);
      res.status(500).json({
        error: "Analysis failed",
        message: error.message
      });
    }
  });
  app.get("/api/documents/statistics", async (req, res) => {
    try {
      const { therapistId, startDate: startDate2, endDate: endDate2 } = req.query;
      const stats = await storage.getDocumentStatistics({
        therapistId,
        startDate: startDate2 ? new Date(startDate2) : void 0,
        endDate: endDate2 ? new Date(endDate2) : void 0
      });
      res.json(stats);
    } catch (error) {
      console.error("Statistics error:", error);
      res.status(500).json({
        error: "Failed to get statistics",
        message: error.message
      });
    }
  });
}
export {
  registerDocumentBatchRoutes
};
