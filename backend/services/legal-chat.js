/**
 * Legal Chat Service - Main orchestration for RAG-based legal AI
 * Coordinates embeddings, retrieval, reasoning, and validation
 */

const EmbeddingsService = require('./embeddings');
const LegalRetriever = require('./retriever');
const LegalReasoningEngine = require('./legalReasoning');
const HallucinationPrevention = require('./hallucination-prevention');

class LegalChatService {
  constructor(config = {}) {
    this.embeddingService = new EmbeddingsService(config.embeddings);
    this.retriever = new LegalRetriever(config.vectorDB, config.retriever);
    this.reasoningEngine = new LegalReasoningEngine(config.reasoning);
    this.hallucinationPrevention = new HallucinationPrevention(config.safety);
    this.categoriesDB = config.categoriesDB || {};
    this.logger = config.logger || console;
  }

  /**
   * Main chat interface - orchestrates full RAG pipeline
   */
  async chat(userQuery, context = {}) {
    try {
      const startTime = Date.now();
      const sessionId = context.sessionId || this._generateId();

      this.logger.info(`[${sessionId}] Processing query: ${userQuery.substring(0, 100)}...`);

      // Step 1: Understand query and detect domain
      const understanding = await this._understandQuery(userQuery, context);

      // Step 2: Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbeddings(userQuery);

      // Step 3: Retrieve relevant legal documents
      const retrievedDocs = await this._retrieveLegalDocuments(
        queryEmbedding[0],
        understanding.domains,
        understanding.keywords
      );

      this.logger.debug(`[${sessionId}] Retrieved ${retrievedDocs.length} documents`);

      // Step 4: Generate legal response
      const responseData = await this.reasoningEngine.generateLegalResponse(
        userQuery,
        retrievedDocs,
        {
          language: context.language || 'en',
          category: understanding.primaryDomain,
          sessionId
        }
      );

      // Step 5: Validate response and check for hallucinations
      const validation = await this.hallucinationPrevention.validateResponse(
        responseData.response,
        retrievedDocs,
        userQuery
      );

      // Step 6: Inject disclaimers if needed
      let finalResponse = responseData.response;
      if (validation.issues.length > 0 || validation.warnings.length > 0) {
        const severity = this._determineSeverity(understanding.primaryDomain, validation);
        finalResponse = this.hallucinationPrevention.injectDisclaimer(finalResponse, severity);
      }

      // Step 7: Check if escalation is needed
      const shouldEscalate = this.hallucinationPrevention.shouldEscalate(finalResponse, validation) ||
                           understanding.escalationRequired;

      const processingTime = Date.now() - startTime;

      return {
        success: validation.isValid,
        response: finalResponse,
        metadata: {
          sessionId,
          domain: understanding.primaryDomain,
          confidence: validation.confidenceScore,
          citations: LegalReasoningEngine.extractCitations(finalResponse),
          retrievedDocuments: retrievedDocs.length,
          processingTimeMs: processingTime,
          shouldEscalate,
          validation: {
            issues: validation.issues,
            warnings: validation.warnings,
            confidence: validation.confidenceScore
          }
        }
      };

    } catch (error) {
      this.logger.error('Chat error:', error);
      return {
        success: false,
        response: 'I encountered an error processing your query. Please try again or consult a qualified lawyer.',
        error: error.message,
        metadata: {
          error: true
        }
      };
    }
  }

  /**
   * Understand query and classify legal domain
   */
  async _understandQuery(query, context = {}) {
    const lowerQuery = query.toLowerCase();
    const words = lowerQuery.split(/\s+/);

    // Detect language
    const language = context.language || this._detectLanguage(query);

    // Classify into legal domains
    const domainScores = {};
    for (const [domain, info] of Object.entries(this.categoriesDB.domains || {})) {
      let score = 0;
      
      // Keyword matching
      for (const keyword of info.keywords || []) {
        if (lowerQuery.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }

      // Category mapping
      for (const cat of this.categoriesDB.categoryMapping?.[domain] || []) {
        if (lowerQuery.includes(cat)) {
          score += 5;
        }
      }

      if (score > 0) {
        domainScores[domain] = score;
      }
    }

    // Get top domains
    const sortedDomains = Object.entries(domainScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([domain]) => domain);

    const primaryDomain = sortedDomains[0] || 'civil';
    const domainInfo = this.categoriesDB.domains?.[primaryDomain] || {};

    return {
      primaryDomain,
      domains: sortedDomains,
      keywords: words.slice(0, 5),
      language,
      escalationRequired: domainInfo.escalationRequired || false,
      urgencyLevel: domainInfo.urgencyLevel || 'medium'
    };
  }

  /**
   * Retrieve legal documents
   */
  async _retrieveLegalDocuments(queryEmbedding, domains, keywords) {
    try {
      // Hybrid search combining semantic and keyword search
      const results = await this.retriever.hybridSearch(
        null,
        queryEmbedding,
        keywords,
        domains[0]
      );

      return results.slice(0, 10); // Top 10 results
    } catch (error) {
      this.logger.warn('Retrieval error:', error);
      return [];
    }
  }

  /**
   * Detect language from text
   */
  _detectLanguage(text) {
    // Simple language detection based on script
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0600-\u06FF]/.test(text)) return 'ur'; // Urdu
    return 'en'; // English (default)
  }

  /**
   * Determine severity level for disclaimer
   */
  _determineSeverity(domain, validation) {
    if (validation.issues.length > 1) return 'serious';
    if (domain === 'criminal') return 'criminal';
    if (domain === 'constitutional') return 'constitutional';
    if (domain === 'family') return 'serious';
    if (validation.confidenceScore < 0.5) return 'serious';
    return 'standard';
  }

  /**
   * Generate session ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Save chat for case memory
   */
  async saveChatMemory(sessionId, query, response, metadata = {}) {
    try {
      return {
        sessionId,
        query,
        summary: response.substring(0, 500),
        domain: metadata.domain,
        citations: metadata.citations || [],
        timestamp: new Date().toISOString(),
        savedAt: new Date()
      };
    } catch (error) {
      this.logger.error('Error saving chat memory:', error);
      return null;
    }
  }

  /**
   * Get legal guidance for a domain
   */
  async getGuidance(domain, subtopic = null) {
    const domainInfo = this.categoriesDB.domains?.[domain];
    if (!domainInfo) {
      return { error: 'Domain not found' };
    }

    return {
      domain,
      name: domainInfo.name,
      description: domainInfo.description,
      applicableLaws: domainInfo.applicableLaws,
      keywords: domainInfo.keywords,
      urgencyLevel: domainInfo.urgencyLevel,
      escalationRequired: domainInfo.escalationRequired,
      examples: domainInfo.examples
    };
  }
}

module.exports = LegalChatService;
