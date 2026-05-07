#!/usr/bin/env node
/**
 * Initialize RAG System
 * Sets up vector DB, loads legal documents, and validates configuration
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const RAGConfiguration = require('../rag/config');
const EmbeddingsService = require('../rag/embeddings');

async function initRAG() {
  console.log('\n🚀 NyaySetu RAG System Initialization\n');

  try {
    // Step 1: Validate environment
    console.log('📋 Checking environment variables...');
    const config = RAGConfiguration.getConfig();
    
    const requiredVars = [
      'EMBEDDING_API_KEY',
      'LLM_API_KEY',
      'MONGO_URI'
    ];
    
    const missing = requiredVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    console.log('✓ Environment validated');

    // Step 2: Initialize RAG system
    console.log('\n⚙️  Initializing RAG components...');
    const ragSystem = await RAGConfiguration.initializeRAG(config);
    console.log('✓ RAG system initialized');

    // Step 3: Check legal knowledge base
    console.log('\n📚 Checking legal knowledge base...');
    const actsDir = path.join(__dirname, '../legal-kb/acts');
    
    if (!fs.existsSync(actsDir)) {
      fs.mkdirSync(actsDir, { recursive: true });
      console.log('✓ Created legal acts directory');
    }

    const actFiles = fs.readdirSync(actsDir).filter(f => f.endsWith('.json'));
    console.log(`✓ Found ${actFiles.length} legal documents`);
    
    if (actFiles.length === 0) {
      console.warn('⚠️  No legal documents found. Add JSON files to legal-kb/acts/');
    }

    // Step 4: Index sample documents
    console.log('\n📇 Preparing to index legal documents...');
    console.log('Run: npm run index:legal-kb');

    // Step 5: Summary
    console.log('\n✅ RAG Initialization Complete!\n');
    console.log('Next steps:');
    console.log('1. Add legal documents to backend/legal-kb/acts/');
    console.log('2. Run: npm run index:legal-kb');
    console.log('3. Start server: npm start');
    console.log('\nConfiguration:');
    console.log(`- Embeddings: ${config.embeddings.provider}`);
    console.log(`- LLM: ${config.reasoning.llmProvider}`);
    console.log(`- Vector DB: ${config.vectorDB.provider}`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    process.exit(1);
  }
}

initRAG();
