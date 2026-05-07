/**
 * Legal Retriever - Search and retrieve relevant legal documents from vector database
 * Implements semantic search with metadata filtering and relevance ranking
 */

class LegalRetriever {
  constructor(vectorDB, config = {}) {
    this.vectorDB = vectorDB; // Pinecone, ChromaDB, or Weaviate instance
    this.indexName = config.indexName || 'legal-kb';
    this.topK = config.topK || 10;
    this.minSimilarity = config.minSimilarity || 0.6;
    this.enableCategoryFilter = config.enableCategoryFilter !== false;
  }

  /**
   * Retrieve legal documents by query embedding
   * @param {number[]} queryEmbedding - Query embedding vector
   * @param {Object} filters - Metadata filters
   * @returns {Promise<Object[]>} Retrieved documents with scores
   */
  async retrieve(queryEmbedding, filters = {}) {
    try {
      const queryRequest = {
        vector: queryEmbedding,
        topK: this.topK,
        includeMetadata: true,
        filter: this._buildMetadataFilter(filters)
      };

      const results = await this.vectorDB.query(this.indexName, queryRequest);
      
      // Filter by similarity threshold
      const validResults = results
        .filter(r => r.score >= this.minSimilarity)
        .map(r => ({
          text: r.metadata?.text || r.values,
          score: r.score,
          metadata: r.metadata || {},
          id: r.id
        }));

      return validResults;
    } catch (error) {
      console.error('Vector retrieval error:', error);
      throw error;
    }
  }

  /**
   * Retrieve by legal domain category
   */
  async retrieveByCategory(queryEmbedding, category, filters = {}) {
    const categoryFilter = {
      category: category,
      ...filters
    };
    return this.retrieve(queryEmbedding, categoryFilter);
  }

  /**
   * Retrieve specific act sections
   */
  async retrieveActSections(actName, sectionNumbers = [], queryEmbedding = null) {
    const actFilter = {
      act: actName,
      ...(sectionNumbers.length > 0 && { sectionNumber: { $in: sectionNumbers } })
    };

    if (queryEmbedding) {
      return this.retrieve(queryEmbedding, actFilter);
    }

    // Direct retrieval without embedding (hybrid search)
    return this.vectorDB.query(this.indexName, {
      filter: this._buildMetadataFilter(actFilter),
      topK: this.topK,
      includeMetadata: true
    });
  }

  /**
   * Hybrid search - combine keyword and semantic search
   */
  async hybridSearch(queryText, queryEmbedding, keywords = [], category = null) {
    // Semantic search
    const semanticResults = await this.retrieve(queryEmbedding, { category });

    // Keyword search (fallback/supplementary)
    const keywordFilters = keywords.length > 0 
      ? { keywords: { $in: keywords } }
      : {};
    
    if (category) keywordFilters.category = category;
    
    const keywordResults = await this.retrieve(queryEmbedding, keywordFilters);

    // Combine and deduplicate
    const combined = new Map();
    
    // Add semantic results with higher weight
    semanticResults.forEach(r => {
      combined.set(r.id, { ...r, weight: r.score * 1.5 });
    });

    // Add/merge keyword results
    keywordResults.forEach(r => {
      if (combined.has(r.id)) {
        combined.get(r.id).weight += r.score;
      } else {
        combined.set(r.id, { ...r, weight: r.score });
      }
    });

    // Sort by combined weight
    return Array.from(combined.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, this.topK);
  }

  /**
   * Build metadata filter for vector search
   */
  _buildMetadataFilter(filters = {}) {
    const mongoFilter = {};

    if (filters.category) {
      mongoFilter.category = filters.category;
    }
    if (filters.act) {
      mongoFilter.act = filters.act;
    }
    if (filters.sectionNumber) {
      mongoFilter.sectionNumber = filters.sectionNumber;
    }
    if (filters.chunkType) {
      mongoFilter.chunkType = filters.chunkType;
    }
    if (filters.keywords && Array.isArray(filters.keywords)) {
      mongoFilter.keywords = { $in: filters.keywords };
    }
    if (filters.jurisdiction) {
      mongoFilter.jurisdiction = filters.jurisdiction;
    }

    return Object.keys(mongoFilter).length > 0 ? mongoFilter : null;
  }

  /**
   * Retrieve relevant procedures/guidelines
   */
  async retrieveProcedures(procedureType, queryEmbedding) {
    return this.retrieve(queryEmbedding, {
      chunkType: 'procedure',
      procedureType: procedureType
    });
  }

  /**
   * Get related sections (by cross-references)
   */
  async getRelatedSections(sectionNumber, actName) {
    // Query vector DB for documents that cross-reference this section
    return this.vectorDB.query(this.indexName, {
      filter: {
        crossReferences: { $in: [`${actName}/${sectionNumber}`] }
      },
      topK: 5,
      includeMetadata: true
    });
  }

  /**
   * Retrieve recent amendments/changes
   */
  async retrieveRecentChanges(category, daysBack = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return this.vectorDB.query(this.indexName, {
      filter: {
        category: category,
        lastUpdated: { $gte: cutoffDate.toISOString() }
      },
      topK: this.topK,
      includeMetadata: true
    });
  }

  /**
   * Retrieve legal precedents/case law
   */
  async retrievePrecedents(legalTopic, queryEmbedding, court = null) {
    const filters = {
      chunkType: 'case-law',
      topic: legalTopic
    };
    
    if (court) filters.court = court;

    return this.retrieve(queryEmbedding, filters);
  }

  /**
   * Get explanations for a section
   */
  async getExplanations(actName, sectionNumber) {
    return this.vectorDB.query(this.indexName, {
      filter: {
        act: actName,
        sectionNumber: sectionNumber,
        chunkType: 'explanation'
      },
      topK: 5,
      includeMetadata: true
    });
  }
}

module.exports = LegalRetriever;
