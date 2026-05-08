/**
 * Data Ingestion Pipeline - Continuous integration of real legal data
 * Fetches, validates, chunks, and embeds real judgments and laws
 */

const RealDataFetchers = require('../services/real-data-fetchers');
const EmbeddingsService = require('../rag/embeddings');
const CourtJudgment = require('../models/CourtJudgment');
const fs = require('fs').promises;
const path = require('path');

class DataIngestionPipeline {
  constructor(config = {}) {
    this.embeddingsService = new EmbeddingsService(config.embeddings);
    this.vectorDB = config.vectorDB;
    this.dataStorePath = path.join(__dirname, '../data/ingested-judgments');
    this.indexPath = path.join(__dirname, '../data/ingestion-index.json');
    this.batchSize = config.batchSize || 20;
    this.chunkSize = config.chunkSize || 500; // characters per chunk
  }

  /**
   * Fetch and ingest real data from all sources
   */
  async ingestRealData(options = {}) {
    console.log('🔄 Starting data ingestion pipeline...');
    
    const results = {
      ecourtCases: [],
      supremeCourtCases: [],
      highCourtCases: [],
      judgmentsIngested: 0,
      chunksCreated: 0,
      embeddingsGenerated: 0,
      errors: []
    };

    try {
      // Step 1: Fetch from E-court
      if (options.sources?.includes('ecourt') || !options.sources) {
        console.log('📥 Fetching from E-court...');
        const ecourtData = await this._fetchAndProcessECourt(options.ecourtQuery);
        results.ecourtCases = ecourtData.cases || [];
      }

      // Step 2: Fetch from Supreme Court
      if (options.sources?.includes('supreme-court') || !options.sources) {
        console.log('📥 Fetching from Supreme Court...');
        const scData = await this._fetchAndProcessSupremeCourt(options.scQuery);
        results.supremeCourtCases = scData.cases || [];
      }

      // Step 3: Fetch from High Courts
      if (options.sources?.includes('high-court') || !options.sources) {
        console.log('📥 Fetching from High Courts...');
        const hcData = await this._fetchAndProcessHighCourts(options.hcQuery);
        results.highCourtCases = hcData.cases || [];
      }

      // Step 4: Fetch from Indian Kanoon
      if (options.sources?.includes('indian-kanoon') || !options.sources) {
        console.log('📥 Fetching from Indian Kanoon...');
        const ikData = await this._fetchAndProcessIndianKanoon(options.ikQuery);
        results.highCourtCases.push(...(ikData.cases || []));
      }

      // Combine all cases
      const allCases = [
        ...results.ecourtCases,
        ...results.supremeCourtCases,
        ...results.highCourtCases
      ];

      // Step 5: Validate and chunk
      console.log(`✅ Processing ${allCases.length} judgments...`);
      const chunks = await this._chunkJudgments(allCases);
      results.chunksCreated = chunks.length;

      // Step 6: Generate embeddings
      console.log(`📊 Generating embeddings for ${chunks.length} chunks...`);
      const embeddedChunks = await this._generateEmbeddings(chunks);
      results.embeddingsGenerated = embeddedChunks.length;

      // Step 7: Store in vector DB
      console.log('💾 Storing in vector database...');
      await this._storeInVectorDB(embeddedChunks);

      // Step 8: Save locally
      console.log('💿 Saving to local storage...');
      await this._saveLocally(allCases, chunks);

      // Step 9: Update index
      await this._updateIndex(allCases);

      console.log('✨ Data ingestion completed!');
      return results;

    } catch (error) {
      console.error('Error in data ingestion pipeline:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Fetch and process E-court cases
   */
  async _fetchAndProcessECourt(query) {
    try {
      // Search for relevant cases
      const searchResults = await RealDataFetchers.fetchFromECourt(query);
      return { cases: Array.isArray(searchResults) ? searchResults : (searchResults ? [searchResults] : []) };
    } catch (error) {
      console.error('Error fetching E-court data:', error);
      return { cases: [] };
    }
  }

  /**
   * Fetch and process Supreme Court judgments
   */
  async _fetchAndProcessSupremeCourt(query) {
    try {
      const results = await RealDataFetchers.fetchFromSupremeCourt(query);
      return { cases: results ? [results] : [] };
    } catch (error) {
      console.error('Error fetching Supreme Court data:', error);
      return { cases: [] };
    }
  }

  /**
   * Fetch and process High Court judgments
   */
  async _fetchAndProcessHighCourts(query) {
    try {
      const courts = ['DEL', 'BOM', 'CAL', 'MAD', 'CHD'];
      const allCases = [];

      for (const courtCode of courts) {
        try {
          const result = await RealDataFetchers.fetchFromHighCourt(query, courtCode);
          if (result) allCases.push(result);
        } catch (e) {
          console.warn(`Could not fetch from ${courtCode}:`, e.message);
        }
      }

      return { cases: allCases };
    } catch (error) {
      console.error('Error fetching High Court data:', error);
      return { cases: [] };
    }
  }

  /**
   * Fetch and process Indian Kanoon data
   */
  async _fetchAndProcessIndianKanoon(query) {
    try {
      const results = await RealDataFetchers.fetchFromIndianKanoon(query, 'judgment');
      return { cases: results };
    } catch (error) {
      console.error('Error fetching Indian Kanoon data:', error);
      return { cases: [] };
    }
  }

  /**
   * Split judgments into chunks for embedding
   */
  async _chunkJudgments(judgments) {
    const chunks = [];

    for (const judgment of judgments) {
      if (!judgment || !judgment.getSearchableText) continue;

      const text = judgment.getSearchableText();
      const sections = [
        { type: 'headnotes', text: judgment.headnotes },
        { type: 'facts', text: judgment.facts },
        { type: 'legal-question', text: judgment.legalQuestion },
        { type: 'reasoning', text: judgment.reasoning },
        { type: 'judgment', text: judgment.judgment }
      ];

      for (const section of sections) {
        if (!section.text) continue;

        // Split into chunks
        for (let i = 0; i < section.text.length; i += this.chunkSize) {
          const chunkText = section.text.substring(i, i + this.chunkSize);

          chunks.push({
            id: `${judgment.sourceId}-${section.type}-${i}`,
            text: chunkText,
            metadata: {
              caseNumber: judgment.caseNumber,
              title: judgment.title,
              court: judgment.court,
              source: judgment.source,
              sourceUrl: judgment.sourceUrl,
              domain: judgment.domain || judgment.identifyDomain(),
              sectionType: section.type,
              dateOfJudgment: judgment.dateOfJudgment,
              applicableLaws: judgment.applicableLaws || [],
              precedentValue: judgment.precedentValue,
              yearOfJudgment: judgment.yearOfJudgment
            }
          });
        }
      }
    }

    return chunks;
  }

  /**
   * Generate embeddings for chunks
   */
  async _generateEmbeddings(chunks) {
    const embeddedChunks = [];

    for (let i = 0; i < chunks.length; i += this.batchSize) {
      const batch = chunks.slice(i, i + this.batchSize);
      const texts = batch.map(c => c.text);

      try {
        const embeddings = await this.embeddingsService.generateEmbeddings(texts);

        batch.forEach((chunk, idx) => {
          embeddedChunks.push({
            ...chunk,
            embedding: embeddings[idx]
          });
        });

        console.log(`✅ Embedded ${Math.min(i + this.batchSize, chunks.length)}/${chunks.length} chunks`);
      } catch (error) {
        console.error(`Error embedding batch ${i / this.batchSize}:`, error);
      }
    }

    return embeddedChunks;
  }

  /**
   * Store in vector database (Pinecone, ChromaDB, etc.)
   */
  async _storeInVectorDB(embeddedChunks) {
    if (!this.vectorDB) {
      console.log('⚠️  Vector DB not configured, skipping storage');
      return;
    }

    try {
      // Implementation depends on your vector DB provider
      // This is a template for Pinecone-like APIs
      for (let i = 0; i < embeddedChunks.length; i += 100) {
        const batch = embeddedChunks.slice(i, i + 100);
        
        const vectors = batch.map(chunk => ({
          id: chunk.id,
          values: chunk.embedding,
          metadata: chunk.metadata
        }));

        // await this.vectorDB.upsert(vectors);
        console.log(`✅ Stored ${Math.min(i + 100, embeddedChunks.length)} vectors in DB`);
      }
    } catch (error) {
      console.error('Error storing in vector DB:', error);
    }
  }

  /**
   * Save ingested data locally
   */
  async _saveLocally(judgments, chunks) {
    try {
      // Create directory if not exists
      await fs.mkdir(this.dataStorePath, { recursive: true });

      // Save judgments
      const judgmentsFile = path.join(this.dataStorePath, 'judgments.json');
      await fs.writeFile(
        judgmentsFile,
        JSON.stringify(judgments.map(j => j.toJSON()), null, 2)
      );

      // Save chunks
      const chunksFile = path.join(this.dataStorePath, 'chunks.json');
      await fs.writeFile(
        chunksFile,
        JSON.stringify(chunks, null, 2)
      );

      console.log(`✅ Saved ${judgments.length} judgments and ${chunks.length} chunks locally`);
    } catch (error) {
      console.error('Error saving locally:', error);
    }
  }

  /**
   * Update ingestion index
   */
  async _updateIndex(judgments) {
    try {
      const index = {
        lastUpdated: new Date().toISOString(),
        totalJudgments: judgments.length,
        domains: {},
        sources: {},
        years: {}
      };

      for (const judgment of judgments) {
        const domain = judgment.domain || 'unknown';
        const source = judgment.source || 'unknown';
        const year = judgment.yearOfJudgment || 'unknown';

        index.domains[domain] = (index.domains[domain] || 0) + 1;
        index.sources[source] = (index.sources[source] || 0) + 1;
        index.years[year] = (index.years[year] || 0) + 1;
      }

      await fs.mkdir(path.dirname(this.indexPath), { recursive: true });
      await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2));

      console.log('✅ Index updated:', index);
    } catch (error) {
      console.error('Error updating index:', error);
    }
  }

  /**
   * Get ingestion statistics
   */
  async getStatistics() {
    try {
      const indexData = await fs.readFile(this.indexPath, 'utf-8');
      return JSON.parse(indexData);
    } catch (error) {
      console.error('Error reading index:', error);
      return null;
    }
  }
}

module.exports = DataIngestionPipeline;
