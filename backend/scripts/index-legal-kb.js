#!/usr/bin/env node
/**
 * Index Legal Knowledge Base
 * Chunks legal documents, generates embeddings, and stores in vector DB
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const EmbeddingsService = require('../rag/embeddings');
const RAGConfiguration = require('../rag/config');

async function indexLegalKB() {
  console.log('\n📇 Indexing Legal Knowledge Base\n');

  try {
    const config = RAGConfiguration.getConfig();
    const embeddingService = new EmbeddingsService(config.embeddings);
    
    const actsDir = path.join(__dirname, '../legal-kb/acts');
    const actFiles = fs.readdirSync(actsDir).filter(f => f.endsWith('.json'));

    console.log(`Found ${actFiles.length} legal documents to index\n`);

    let totalChunks = 0;
    let totalEmbeddings = 0;

    for (const file of actFiles) {
      const filePath = path.join(actsDir, file);
      const actData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`📚 Indexing: ${actData.name}`);

      // Chunk the document
      const chunks = EmbeddingsService.chunkLegalDocument(actData);
      console.log(`   Chunks created: ${chunks.length}`);

      // Prepare texts for embedding
      const texts = chunks.map(c => 
        EmbeddingsService.prepareForEmbedding(c)
      );

      // Generate embeddings
      try {
        console.log(`   Generating embeddings...`);
        const embeddings = await embeddingService.generateEmbeddings(texts);
        
        console.log(`   ✓ Generated ${embeddings.length} embeddings`);
        
        // In production: upsert to vector DB
        // await vectorDB.upsert({
        //   vectors: embeddings.map((emb, idx) => ({
        //     id: `${file}-chunk-${idx}`,
        //     values: emb,
        //     metadata: chunks[idx].metadata
        //   }))
        // });
        
        totalChunks += chunks.length;
        totalEmbeddings += embeddings.length;

      } catch (error) {
        console.warn(`   ⚠️  Error indexing ${file}: ${error.message}`);
      }
    }

    console.log(`\n✅ Indexing Complete!`);
    console.log(`Total chunks: ${totalChunks}`);
    console.log(`Total embeddings: ${totalEmbeddings}`);
    console.log('\nNote: In production, embeddings are stored in vector DB (Pinecone/ChromaDB/Weaviate)');
    console.log('\n');

  } catch (error) {
    console.error('❌ Indexing failed:', error.message);
    process.exit(1);
  }
}

indexLegalKB();
