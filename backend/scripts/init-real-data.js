/**
 * Initialize Real Data Ingestion
 * Run this to start fetching real legal data from Indian courts and databases
 */

const DataIngestionPipeline = require('./data-ingestion-pipeline');
require('dotenv').config();

async function initializeRealDataIngestion() {
  console.log('🚀 Initializing Real Data Ingestion for NyaySetu AI...\n');

  // Configure the ingestion pipeline
  const config = {
    embeddings: {
      provider: process.env.EMBEDDING_PROVIDER || 'openai',
      apiKey: process.env.EMBEDDING_API_KEY,
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small'
    },
    vectorDB: {
      provider: process.env.VECTOR_DB_PROVIDER || 'pinecone',
      apiKey: process.env.VECTOR_DB_API_KEY
    },
    batchSize: 20,
    chunkSize: 500
  };

  const pipeline = new DataIngestionPipeline(config);

  // Define ingestion options
  const ingestionOptions = {
    sources: ['ecourt', 'supreme-court', 'high-court', 'indian-kanoon'],
    
    // Common legal queries to fetch relevant cases
    ecourtQuery: 'bail procedure criminal case',
    scQuery: 'constitutional rights fundamental duties',
    hcQuery: 'property dispute land ownership',
    ikQuery: 'Indian Penal Code Bharatiya Nyaya Sanhita'
  };

  try {
    // Phase 1: Ingest real data
    console.log('Phase 1: Fetching Real Data from Courts...\n');
    const results = await pipeline.ingestRealData(ingestionOptions);

    console.log('\n📊 Ingestion Summary:');
    console.log(`   E-court cases: ${results.ecourtCases.length}`);
    console.log(`   Supreme Court cases: ${results.supremeCourtCases.length}`);
    console.log(`   High Court cases: ${results.highCourtCases.length}`);
    console.log(`   Total chunks created: ${results.chunksCreated}`);
    console.log(`   Embeddings generated: ${results.embeddingsGenerated}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach(err => console.log(`   - ${err}`));
    }

    // Phase 2: Get statistics
    console.log('\nPhase 2: Statistics...\n');
    const stats = await pipeline.getStatistics();
    if (stats) {
      console.log('Domain Distribution:');
      Object.entries(stats.domains || {}).forEach(([domain, count]) => {
        console.log(`   ${domain}: ${count}`);
      });

      console.log('\nSource Distribution:');
      Object.entries(stats.sources || {}).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });

      console.log('\nYear Distribution:');
      Object.entries(stats.years || {}).forEach(([year, count]) => {
        console.log(`   ${year}: ${count}`);
      });
    }

    console.log('\n✨ Real Data Ingestion Complete!');
    console.log('Your AI model is now trained on real Indian court judgments.');
    console.log('\nNext steps:');
    console.log('1. Configure your vector database (Pinecone, ChromaDB, Weaviate)');
    console.log('2. Set environment variables for API keys');
    console.log('3. Run periodic ingestion updates (daily/weekly)');
    console.log('4. Monitor embedding quality and relevance');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeRealDataIngestion().catch(console.error);
}

module.exports = initializeRealDataIngestion;
