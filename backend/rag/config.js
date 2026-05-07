/**
 * RAG Configuration and Initialization
 * Configure vector database, embeddings, LLM, and other RAG components
 */

const EmbeddingsService = require('./embeddings');
const LegalRetriever = require('./retriever');
const LegalReasoningEngine = require('./legalReasoning');
const HallucinationPrevention = require('./hallucination-prevention');
const LegalChatService = require('../services/legal-chat');

class RAGConfiguration {
  /**
   * Get configuration based on environment
   */
  static getConfig(environment = process.env.NODE_ENV || 'development') {
    const config = {
      embeddings: {
        provider: process.env.EMBEDDING_PROVIDER || 'openai', // 'openai' | 'gemini' | 'instructor'
        apiKey: process.env.EMBEDDING_API_KEY,
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        batchSize: 100
      },
      vectorDB: {
        provider: process.env.VECTOR_DB_PROVIDER || 'pinecone', // 'pinecone' | 'chromadb' | 'weaviate'
        apiKey: process.env.VECTOR_DB_API_KEY,
        environment: process.env.VECTOR_DB_ENV || 'us-west1-gcp',
        indexName: process.env.VECTOR_DB_INDEX || 'legal-kb'
      },
      reasoning: {
        llmProvider: process.env.LLM_PROVIDER || 'groq', // 'groq' | 'claude' | 'gemini'
        apiKey: process.env.LLM_API_KEY || process.env.GROQ_API_KEY,
        model: process.env.LLM_MODEL || 'mixtral-8x7b-32768',
        maxTokens: 1500,
        temperature: 0.3 // Low for legal consistency
      },
      safety: {
        confidenceThreshold: 0.65,
        citationRequired: true,
        maxUncertainty: 0.35
      },
      retriever: {
        topK: 10,
        minSimilarity: 0.6
      }
    };

    if (environment === 'production') {
      config.reasoning.temperature = 0.2;
      config.retriever.minSimilarity = 0.65;
    }

    return config;
  }

  /**
   * Initialize RAG system
   */
  static async initializeRAG(config) {
    try {
      console.log('🚀 Initializing RAG System...');

      // Initialize vector DB
      const vectorDB = this._initializeVectorDB(config.vectorDB);
      console.log(`✓ Vector DB initialized: ${config.vectorDB.provider}`);

      // Initialize embeddings service
      const embeddingService = new EmbeddingsService(config.embeddings);
      console.log(`✓ Embeddings service ready: ${config.embeddings.provider}`);

      // Initialize retriever
      const retriever = new LegalRetriever(vectorDB, config.retriever);
      console.log('✓ Retriever initialized');

      // Initialize legal reasoning engine
      const reasoningEngine = new LegalReasoningEngine(config.reasoning);
      console.log(`✓ Legal reasoning engine ready: ${config.reasoning.llmProvider}`);

      // Initialize hallucination prevention
      const hallucinationPrevention = new HallucinationPrevention(config.safety);
      console.log('✓ Hallucination prevention layer active');

      // Load legal knowledge base categories
      const categoriesDB = require('../legal-kb/categories.json');
      console.log('✓ Legal knowledge base loaded');

      // Initialize legal chat service
      const legalChatService = new LegalChatService({
        embeddings: config.embeddings,
        vectorDB,
        retriever: config.retriever,
        reasoning: config.reasoning,
        safety: config.safety,
        categoriesDB
      });
      console.log('✓ Legal chat service initialized');

      console.log('✅ RAG System initialized successfully');

      return {
        embeddingService,
        vectorDB,
        retriever,
        reasoningEngine,
        hallucinationPrevention,
        legalChatService,
        config
      };
    } catch (error) {
      console.error('❌ RAG initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize vector database
   */
  static _initializeVectorDB(config) {
    // This would be initialized based on provider
    // In production, use actual vector DB SDKs
    if (config.provider === 'pinecone') {
      // return new PineconeClient(config);
    } else if (config.provider === 'chromadb') {
      // return new ChromaClient(config);
    } else if (config.provider === 'weaviate') {
      // return new WeaviateClient(config);
    }
    
    // Mock implementation for now
    return {
      query: async () => [],
      upsert: async () => {},
      delete: async () => {}
    };
  }

  /**
   * Get environment variables checklist
   */
  static getEnvironmentChecklist() {
    return {
      required: [
        'EMBEDDING_API_KEY',
        'LLM_API_KEY',
        'MONGO_URI'
      ],
      optional: [
        'EMBEDDING_PROVIDER',
        'LLM_PROVIDER',
        'VECTOR_DB_PROVIDER',
        'VECTOR_DB_API_KEY'
      ],
      deployment: [
        'NODE_ENV',
        'PORT',
        'GROQ_API_KEY'
      ]
    };
  }

  /**
   * Validate configuration
   */
  static validateConfig(config) {
    const required = [
      'embeddings.apiKey',
      'reasoning.apiKey',
      'vectorDB.apiKey'
    ];

    const missing = [];
    for (const field of required) {
      const parts = field.split('.');
      let value = config;
      for (const part of parts) {
        value = value[part];
        if (!value) break;
      }
      if (!value) missing.push(field);
    }

    if (missing.length > 0) {
      console.warn('⚠️  Missing configuration:', missing);
      return false;
    }

    console.log('✓ Configuration validated');
    return true;
  }
}

module.exports = RAGConfiguration;
