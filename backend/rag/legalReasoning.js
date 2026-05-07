/**
 * Legal Reasoning Engine - Generate safe, accurate legal responses
 * Combines retrieved legal documents with AI reasoning
 */

class LegalReasoningEngine {
  constructor(config = {}) {
    this.llmProvider = config.llmProvider || 'groq';
    this.apiKey = config.apiKey;
    this.model = config.model || 'mixtral-8x7b-32768';
    this.maxTokens = config.maxTokens || 1500;
    this.temperature = config.temperature || 0.3; // Low for legal consistency
  }

  /**
   * Generate legal response using retrieved documents
   */
  async generateLegalResponse(query, retrievedDocs, context = {}) {
    // Build context from retrieved documents
    const legalContext = this._buildLegalContext(retrievedDocs);
    
    // Create the prompt
    const prompt = this._createLegalPrompt(query, legalContext, context);
    
    // Call LLM
    const response = await this._callLLM(prompt);
    
    return {
      response,
      retrievedDocsUsed: retrievedDocs.length,
      context: legalContext
    };
  }

  /**
   * Build context from retrieved legal documents
   */
  _buildLegalContext(documents) {
    const context = {
      applicableLaws: new Map(),
      relevantSections: [],
      procedures: [],
      relatedCases: [],
      amendments: []
    };

    for (const doc of documents) {
      const metadata = doc.metadata || {};
      
      if (!context.applicableLaws.has(metadata.act)) {
        context.applicableLaws.set(metadata.act, {
          act: metadata.act,
          sections: [],
          category: metadata.category
        });
      }

      if (metadata.sectionNumber) {
        context.applicableLaws.get(metadata.act).sections.push(metadata.sectionNumber);
        context.relevantSections.push({
          act: metadata.act,
          section: metadata.sectionNumber,
          title: metadata.sectionTitle,
          chunkType: metadata.chunkType
        });
      }

      if (metadata.chunkType === 'procedure') {
        context.procedures.push({
          type: metadata.procedureType,
          content: doc.text
        });
      }

      if (metadata.chunkType === 'case-law') {
        context.relatedCases.push({
          court: metadata.court,
          year: metadata.year,
          summary: doc.text
        });
      }

      if (metadata.lastUpdated) {
        context.amendments.push({
          act: metadata.act,
          amendment: metadata.amendment,
          date: metadata.lastUpdated
        });
      }
    }

    return Object.fromEntries(context.applicableLaws);
  }

  /**
   * Create legal prompt for LLM
   */
  _createLegalPrompt(query, legalContext, context = {}) {
    const userLanguage = context.language || 'en';
    const category = context.category || 'General Legal';

    // Format applicable laws
    let lawsSection = '';
    for (const [act, info] of Object.entries(legalContext)) {
      lawsSection += `\n**${info.act}** (Category: ${info.category})\n`;
      if (info.sections && info.sections.length > 0) {
        lawsSection += `Relevant Sections: ${info.sections.slice(0, 5).join(', ')}\n`;
      }
    }

    return `You are NyaySetu Legal AI, a human-centered Indian legal reasoning assistant. Think like experienced legal counsel, a careful judge, and a structured legal researcher. Your responses must be thoughtful, evidence-based, and grounded in the law.

CRITICAL RULES:
1. Do not fabricate laws, sections, judgments, or procedures.
2. Do not guarantee legal outcomes.
3. Do not impersonate an advocate.
4. Do not offer reckless or emotionally manipulative guidance.
5. Always cite sources when available.
6. Make uncertainty explicit when facts are missing.
7. Always include a clear disclaimer that this is general legal information, not personal legal advice.

Before answering:
- Understand the issue and relevant facts.
- Identify the legal domain.
- Retrieve applicable laws and sections.
- Analyze the matter carefully.
- Distinguish facts from assumptions.
- Note any missing information or weak evidence.

USER QUERY (Category: ${category}):
${query}

RELEVANT INDIAN LAWS AND SECTIONS:
${lawsSection}

RESPONSE STRUCTURE:
1. Understanding of Issue
2. Relevant Indian Law
3. Legal Interpretation
4. Possible Rights/Options
5. Practical Next Steps
6. Risk/Uncertainty Note
7. When to Consult a Lawyer

If the issue is uncertain, moderate tone and avoid firm conclusions. If laws are unavailable for the question, explain the limitation instead of inventing answers. Provide a calm, professional, citizen-friendly response.

Response (in ${userLanguage}):`;
  }

  /**
   * Call LLM to generate response
   */
  async _callLLM(prompt) {
    try {
      if (this.llmProvider === 'groq') {
        return await this._callGroqAPI(prompt);
      } else if (this.llmProvider === 'claude') {
        return await this._callClaudeAPI(prompt);
      } else if (this.llmProvider === 'gemini') {
        return await this._callGeminiAPI(prompt);
      }
      throw new Error(`Unknown LLM provider: ${this.llmProvider}`);
    } catch (error) {
      console.error('LLM call error:', error);
      throw error;
    }
  }

  /**
   * Call GROQ API
   */
  async _callGroqAPI(prompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.maxTokens,
        temperature: this.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`GROQ API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Call Claude API
   */
  async _callClaudeAPI(prompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * Call Gemini API
   */
  async _callGeminiAPI(prompt) {
    const fetch = require('node-fetch');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: this.maxTokens,
            temperature: this.temperature
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Extract citations from response
   */
  static extractCitations(response) {
    const citations = [];
    
    // Section citations
    const sectionMatches = response.match(/section\s+(\d+(?:\.\d+)?)/gi) || [];
    sectionMatches.forEach(match => {
      citations.push({ type: 'section', value: match });
    });

    // Act citations
    const actMatches = response.match(/(Bharatiya Nyaya Sanhita|BNSS|Bharatiya Sakshya Adhiniyam|BSA|IPC|Consumer Protection Act|RTI Act|IT Act|Motor Vehicles Act|Labour Act)/gi) || [];
    actMatches.forEach(match => {
      citations.push({ type: 'act', value: match });
    });

    // Article citations (Constitution)
    const articleMatches = response.match(/article\s+(\d+)/gi) || [];
    articleMatches.forEach(match => {
      citations.push({ type: 'article', value: match });
    });

    return [...new Set(citations.map(c => c.value))];
  }

  /**
   * Format response with proper structure
   */
  static formatResponse(response, metadata = {}) {
    const formatted = {
      content: response,
      citations: this.extractCitations(response),
      metadata: {
        category: metadata.category || 'General Legal',
        language: metadata.language || 'en',
        generatedAt: new Date().toISOString(),
        sourceCount: metadata.sourceCount || 0
      }
    };

    return formatted;
  }

  /**
   * Generate case summary for memory
   */
  static generateCaseSummary(query, response) {
    return {
      query: query,
      summary: response.substring(0, 500) + '...',
      citations: this.extractCitations(response),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = LegalReasoningEngine;
