# NyaySetu — Complete Legal AI Architecture

## 🎯 System Overview

```
User Query (Multiple Languages)
    ↓
Query Understanding & Language Detection
    ↓
Legal Domain Classification
    ↓
Semantic Search in Vector Database
    ↓
Retrieve Relevant Legal Acts/Sections
    ↓
Legal Reasoning Engine
    ↓
Hallucination Prevention & Validation
    ↓
Safe Legal Response Generation
    ↓
Citation & Evidence Integration
    ↓
Lawyer Escalation (if needed)
    ↓
User Response (Multilingual)
```

## 📁 Directory Structure

```
backend/
├── rag/                              # RAG Pipeline
│   ├── embeddings.js                 # Embedding generation
│   ├── retriever.js                  # Vector search & retrieval
│   ├── legalReasoning.js             # Legal logic engine
│   └── hallucination-prevention.js   # Safety & validation
├── legal-kb/                         # Legal Knowledge Base
│   ├── acts/                         # Indian Legal Acts (JSON)
│   │   ├── bns.json                  # Bharatiya Nyaya Sanhita
│   │   ├── bnss.json                 # BNSS
│   │   ├── bsa.json                  # BSA (Evidence)
│   │   ├── consumer-act.json
│   │   ├── rti-act.json
│   │   ├── it-act.json
│   │   ├── labor-laws.json
│   │   ├── family-law.json
│   │   ├── property-law.json
│   │   └── [15+ more Indian laws]
│   ├── procedures/                   # Legal Procedures
│   │   ├── fir-filing.json
│   │   ├── bail-process.json
│   │   ├── consumer-complaint.json
│   │   └── [more procedures]
│   └── categories.json               # Legal domain classification
├── vectors/                          # Vector Storage
│   └── legal-embeddings.index        # Pinecone/ChromaDB index
├── models/
│   ├── LegalKB.js                    # Knowledge Base model
│   ├── LegalCase.js                  # Case memory system
│   └── EscalationLog.js              # Escalation tracking
├── services/
│   ├── legal-chat.js                 # Main chat service
│   ├── document-generator.js         # Document creation
│   ├── lawyer-matcher.js             # Lawyer escalation
│   ├── multilingual.js               # Language processing
│   └── safety-engine.js              # AI safety rules
├── routes/
│   ├── chat.js                       # Chat endpoints
│   ├── legal-kb.js                   # Knowledge base access
│   └── escalation.js                 # Escalation endpoints
└── config/
    ├── legal-domains.js              # Domain mappings
    └── embeddings-config.js          # Embedding config
```

## 🔑 Key Components

### 1. Legal Domain Classification
- Criminal Law (BNS, BNSS, BSA)
- Civil Law
- Property Law
- Family Law
- Consumer Law
- Cyber Law
- Labour Law
- Corporate Law
- Constitutional Rights
- Motor Vehicle Law
- Tax Law
- Intellectual Property

### 2. Retrieval-Augmented Generation
- Semantic search using embeddings
- Document chunking by section/clause
- Metadata-based filtering
- Relevance ranking
- Multi-level retrieval (acts → sections → subsections)

### 3. Hallucination Prevention
- Source verification layer
- Confidence scoring
- Citation injection
- Answer validation
- Uncertainty flagging

### 4. Lawyer Escalation
- Case complexity detection
- Automatic escalation triggers
- Lawyer matching by specialization
- Priority case routing

### 5. Multilingual Support
- EN, HI, UR, MR, TA, TE, BN, KN, PA, ML, GU
- Query understanding in 11 languages
- Response generation in user language
- Legal term preservation

## 🚀 Implementation Stack

- **Backend**: Node.js + Express
- **Vector DB**: Pinecone / ChromaDB / Weaviate
- **Embeddings**: OpenAI / Gemini / Instructor
- **LLM**: GROQ / Claude / Gemini
- **Database**: MongoDB (case memory + escalation logs)
- **Cache**: Redis (for frequent queries)
- **Search**: Elasticsearch (optional, for hybrid search)

## 📊 Data Flow

1. **Query Input** → Language Detection + Preprocessing
2. **Understanding** → Intent Classification + Domain Detection  
3. **Retrieval** → Semantic Search → Top 5-10 Documents
4. **Reasoning** → Legal Logic Engine → Evidence Assembly
5. **Validation** → Hallucination Check → Confidence Scoring
6. **Response** → Citation Integration → Safe Formatting
7. **Escalation** → Complexity Check → Lawyer Matching (if needed)

## ✅ Safety Rules

- ❌ Never fabricate laws or sections
- ❌ Never guarantee court outcomes
- ❌ Never impersonate advocates
- ❌ Always cite sources
- ❌ Flag uncertainty clearly
- ✅ Always recommend lawyer for serious matters
- ✅ Always include disclaimers
- ✅ Always provide alternative options

## 📈 Performance Targets

- Query Response: < 3 seconds
- Vector Search: < 500ms
- Document Retrieval: < 1 second
- Total Chat Response: 2-4 seconds
- Concurrent Users: 1000+
- Uptime: 99.9%

## 🔄 Future Enhancements

- Court judgment search
- AI legal research engine
- Lawyer collaboration tools
- Case tracking system
- Hearing reminders
- Legal analytics dashboard
- AI case summarization
