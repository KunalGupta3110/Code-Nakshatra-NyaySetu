/**
 * Embeddings Service - Generate and manage legal document embeddings
 * Supports multiple embedding providers (OpenAI, Gemini, Instructor)
 */

const fetch = require('node-fetch');

class EmbeddingsService {
  constructor(config = {}) {
    this.provider = config.provider || 'openai'; // 'openai' | 'gemini' | 'instructor'
    this.apiKey = config.apiKey;
    this.model = config.model || 'text-embedding-3-small';
    this.endpoint = config.endpoint;
    this.batchSize = config.batchSize || 100;
  }

  /**
   * Generate embeddings for a text
   * @param {string|string[]} texts - Text(s) to embed
   * @returns {Promise<number[][]>} Embeddings array
   */
  async generateEmbeddings(texts) {
    if (!Array.isArray(texts)) texts = [texts];
    
    if (this.provider === 'openai') {
      return this._generateOpenAIEmbeddings(texts);
    } else if (this.provider === 'gemini') {
      return this._generateGeminiEmbeddings(texts);
    } else if (this.provider === 'instructor') {
      return this._generateInstructorEmbeddings(texts);
    }
    throw new Error(`Unknown embedding provider: ${this.provider}`);
  }

  /**
   * Generate embeddings using OpenAI
   */
  async _generateOpenAIEmbeddings(texts) {
    const results = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            input: batch,
            model: this.model
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        results.push(...data.data.map(d => d.embedding));
      } catch (error) {
        console.error('OpenAI embedding error:', error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Generate embeddings using Google Gemini
   */
  async _generateGeminiEmbeddings(texts) {
    const results = [];
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: batch.map(text => ({
                model: 'models/embedding-001',
                content: { parts: [{ text }] }
              }))
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        results.push(...data.embeddings.map(e => e.values));
      } catch (error) {
        console.error('Gemini embedding error:', error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Generate embeddings using local Instructor model
   */
  async _generateInstructorEmbeddings(texts) {
    try {
      const response = await fetch(`${this.endpoint}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          texts: texts,
          instruction: 'Represent the following Indian legal text for semantic search:'
        })
      });

      if (!response.ok) {
        throw new Error(`Instructor API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.embeddings;
    } catch (error) {
      console.error('Instructor embedding error:', error);
      throw error;
    }
  }

  /**
   * Chunk legal document by sections and subsections
   */
  static chunkLegalDocument(document) {
    const chunks = [];
    
    if (document.sections && Array.isArray(document.sections)) {
      for (const section of document.sections) {
        // Main section
        chunks.push({
          text: `${section.number}. ${section.title}\n${section.content}`,
          metadata: {
            act: document.name,
            sectionNumber: section.number,
            sectionTitle: section.title,
            chunkType: 'section',
            category: document.category,
            keywords: section.keywords || [],
            jurisdiction: document.jurisdiction || 'India'
          }
        });

        // Subsections
        if (section.subsections && Array.isArray(section.subsections)) {
          for (const subsection of section.subsections) {
            chunks.push({
              text: `${section.number}.${subsection.number} ${subsection.title || ''}\n${subsection.content}`,
              metadata: {
                act: document.name,
                sectionNumber: `${section.number}.${subsection.number}`,
                sectionTitle: section.title,
                chunkType: 'subsection',
                category: document.category,
                keywords: subsection.keywords || [],
                jurisdiction: document.jurisdiction || 'India'
              }
            });
          }
        }

        // Explanations
        if (section.explanations && Array.isArray(section.explanations)) {
          chunks.push({
            text: `Explanation to Section ${section.number}:\n${section.explanations.join('\n')}`,
            metadata: {
              act: document.name,
              sectionNumber: section.number,
              chunkType: 'explanation',
              category: document.category,
              jurisdiction: document.jurisdiction || 'India'
            }
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Prepare document for embedding
   */
  static prepareForEmbedding(chunk) {
    const text = chunk.text || '';
    // Remove extra whitespace but preserve structure
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = EmbeddingsService;
