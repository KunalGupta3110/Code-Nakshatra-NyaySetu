# RAG System Implementation Guide

## 📋 Table of Contents
1. [Setup Instructions](#setup)
2. [Environment Configuration](#env-config)
3. [Vector Database Setup](#vector-db)
4. [Integration Steps](#integration)
5. [API Endpoints](#api-endpoints)
6. [Testing](#testing)
7. [Deployment](#deployment)

---

## Setup Instructions {#setup}

### 1. Install Dependencies

```bash
cd backend
npm install openai google-generativeai pinecone-client chromadb node-fetch
npm install axios multer dotenv
```

### 2. Environment Variables

Create `.env` file:

```env
# Embeddings
EMBEDDING_PROVIDER=openai
EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small

# LLM (Legal Reasoning)
LLM_PROVIDER=groq
LLM_API_KEY=gsk_...
LLM_MODEL=mixtral-8x7b-32768
GROQ_API_KEY=gsk_...

# Vector Database
VECTOR_DB_PROVIDER=pinecone
VECTOR_DB_API_KEY=xxx...
VECTOR_DB_ENV=us-west1-gcp
VECTOR_DB_INDEX=legal-kb

# Translation (Optional)
TRANSLATION_PROVIDER=google
TRANSLATION_API_KEY=xxx...

# MongoDB
MONGO_URI=mongodb://localhost:27017/nyaysetu

# Server
NODE_ENV=development
PORT=5000
```

### 3. Initialize Vector Database

```javascript
// scripts/init-vector-db.js
const RAGConfiguration = require('./backend/rag/config');
const fs = require('fs');

async function initializeVectorDB() {
  const config = RAGConfiguration.getConfig();
  
  // Load legal acts
  const bns = JSON.parse(fs.readFileSync('./legal-kb/acts/bns.json'));
  const consumerAct = JSON.parse(fs.readFileSync('./legal-kb/acts/consumer-act.json'));
  
  // Chunk documents
  const embeddings = require('./backend/rag/embeddings');
  const bnsChunks = embeddings.chunkLegalDocument(bns);
  const consumerChunks = embeddings.chunkLegalDocument(consumerAct);
  
  // Generate embeddings and upsert to vector DB
  // This is done in batch to optimize costs
  console.log(`Upserting ${bnsChunks.length + consumerChunks.length} chunks to vector DB...`);
}

initializeVectorDB().catch(console.error);
```

---

## Vector Database Setup {#vector-db}

### Using Pinecone

```bash
# Install Pinecone SDK
npm install @pinecone-database/pinecone
```

```javascript
// backend/rag/vector-db-pinecone.js
const { Pinecone } = require('@pinecone-database/pinecone');

const pinecone = new Pinecone({
  apiKey: process.env.VECTOR_DB_API_KEY,
});

const index = pinecone.Index(process.env.VECTOR_DB_INDEX);

// Query example
async function query(embedding) {
  const results = await index.query({
    vector: embedding,
    topK: 10,
    includeMetadata: true
  });
  return results;
}
```

### Using ChromaDB

```bash
npm install chromadb
```

### Using Weaviate

```bash
npm install weaviate-client
```

---

## Integration Steps {#integration}

### Step 1: Update Backend Server

```javascript
// backend/server.js
const RAGConfiguration = require('./rag/config');

// Initialize RAG on startup
let ragSystem;

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Connected");
    
    // Initialize RAG system
    const config = RAGConfiguration.getConfig();
    ragSystem = await RAGConfiguration.initializeRAG(config);
  })
  .catch(err => console.error("Startup Error:", err));
```

### Step 2: Create RAG Chat Endpoint

```javascript
// backend/routes/rag-chat.js
const express = require('express');
const router = express.Router();

router.post('/rag-chat', async (req, res) => {
  try {
    const { message, sessionId, language } = req.body;
    
    const result = await ragSystem.legalChatService.chat(message, {
      sessionId,
      language: language || 'en'
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

### Step 3: Update Frontend Chat

```javascript
// js/chat-rag.js
async function handleRAGChat() {
  const message = document.getElementById('chatInput').value;
  
  const response = await fetch('/rag-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: getCurrentSessionId(),
      language: getCurrentLanguage()
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    displayResponse(data.response);
    showMetadata(data.metadata);
    
    if (data.metadata.shouldEscalate) {
      showLawyerEscalationOption();
    }
  }
}
```

---

## API Endpoints {#api-endpoints}

### POST /rag-chat
Legal AI chat with RAG

**Request:**
```json
{
  "message": "What are my rights if I'm wrongfully terminated?",
  "sessionId": "session-123",
  "language": "en"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Under Indian labour law...",
  "metadata": {
    "domain": "labour",
    "confidence": 0.85,
    "citations": ["Labour Code on Industrial Relations"],
    "shouldEscalate": true
  }
}
```

### POST /escalate-case
Escalate to lawyer

**Request:**
```json
{
  "caseId": "case-123",
  "domain": "labour",
  "priority": "high"
}
```

### GET /legal-guidance/:domain
Get domain guidance

### POST /rag-translate
Translate legal response

---

## Testing {#testing}

### Test RAG Pipeline

```javascript
// tests/rag.test.js
describe('RAG System', () => {
  it('should retrieve relevant legal documents', async () => {
    const query = 'What is bail procedure?';
    const results = await legalChatService.chat(query, { language: 'en' });
    
    expect(results.success).toBe(true);
    expect(results.metadata.domain).toBe('criminal');
    expect(results.metadata.citations.length).toBeGreaterThan(0);
  });

  it('should detect hallucinations', async () => {
    const badResponse = 'Section 999 of the IPC provides...';
    const validation = hallucinationPrevention.validateResponse(badResponse, []);
    
    expect(validation.isValid).toBe(false);
    expect(validation.issues.length).toBeGreaterThan(0);
  });

  it('should escalate to lawyer for urgent matters', async () => {
    const query = 'I was arrested yesterday. What should I do?';
    const results = await legalChatService.chat(query);
    
    expect(results.metadata.shouldEscalate).toBe(true);
  });
});
```

---

## Deployment {#deployment}

### Environment: Production

1. **Set production environment variables**
```bash
NODE_ENV=production
VECTOR_DB_PROVIDER=pinecone
EMBEDDING_PROVIDER=openai
LLM_PROVIDER=groq
```

2. **Index legal documents**
```bash
npm run index:legal-kb
```

3. **Enable caching**
```bash
REDIS_URL=redis://...
```

4. **Deploy to Vercel/Netlify**
```bash
# Vercel
vercel deploy --prod

# Or Netlify with serverless functions
netlify deploy --prod
```

### Scaling Considerations

- Vector DB: Use Pinecone for managed solution
- Embeddings: Batch requests to save costs
- Caching: Redis for frequent queries
- Rate limiting: 100 req/min per user
- Monitoring: Track RAG metrics

---

## Configuration Checklist

- [ ] Environment variables set
- [ ] Vector DB initialized with legal acts
- [ ] Embeddings configured
- [ ] LLM API key active
- [ ] MongoDB connection working
- [ ] Hallucination prevention enabled
- [ ] Lawyer escalation system configured
- [ ] Multilingual support set up
- [ ] Chat endpoints integrated
- [ ] Frontend updated
- [ ] Tests passing
- [ ] Rate limiting configured
- [ ] Monitoring enabled

---

## Legal Knowledge Base Expansion

To add more legal acts:

1. Create `backend/legal-kb/acts/[act-name].json`
2. Follow the structure in `bns.json`
3. Include sections, subsections, explanations
4. Run: `npm run index:legal-kb`

---

## Support & Troubleshooting

- **Low confidence scores**: Add more legal documents to knowledge base
- **Slow responses**: Optimize vector DB queries, increase batch size
- **Translation errors**: Check translation API credentials
- **Escalation not working**: Verify lawyer database populated

