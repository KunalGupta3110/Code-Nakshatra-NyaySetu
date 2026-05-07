# 🚀 NyaySetu Legal AI - Deployment & Integration Checklist

## Pre-Deployment Checklist

### Environment Setup
- [ ] Node.js 16+ installed
- [ ] MongoDB installed and running
- [ ] All environment variables in `.env`
  - [ ] `EMBEDDING_API_KEY` set
  - [ ] `LLM_API_KEY` set
  - [ ] `MONGO_URI` set
  - [ ] `VECTOR_DB_API_KEY` set (if using Pinecone)

### Dependencies
- [ ] Run `npm install` in `/backend`
- [ ] All packages installed successfully
- [ ] No security vulnerabilities (`npm audit`)

### Legal Knowledge Base
- [ ] Legal acts JSON files in `backend/legal-kb/acts/`
  - [ ] `bns.json` - Bharatiya Nyaya Sanhita
  - [ ] `consumer-act.json` - Consumer Protection
  - [ ] At least 5+ legal acts for testing
- [ ] Categories configured in `categories.json`
- [ ] Domain mappings verified

---

## Development Setup

### Initialize RAG System
```bash
cd backend
npm run init:rag
```
- [ ] No errors during initialization
- [ ] RAG components confirmed initialized
- [ ] Vector DB connection successful

### Index Legal Documents
```bash
npm run index:legal-kb
```
- [ ] Documents chunked successfully
- [ ] Embeddings generated (or mocked)
- [ ] Chunks indexed to vector DB
- [ ] Ready for queries

### Start Development Server
```bash
npm run dev
# or
npm start
```
- [ ] Server starts without errors
- [ ] Listening on port 5000
- [ ] MongoDB connection established
- [ ] RAG system ready

---

## Testing Phase

### Unit Tests
```bash
npm test
```
- [ ] Embedding service tests pass
- [ ] Retriever tests pass
- [ ] Hallucination prevention tests pass
- [ ] Coverage > 80%

### Integration Tests
- [ ] Chat endpoint responds
- [ ] Legal domain classification works
- [ ] Lawyer matching functions
- [ ] Multilingual translation works

### Manual Testing

#### Test Criminal Law Query
```bash
curl -X POST http://localhost:5000/rag-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What should I do if arrested?", "language": "en"}'
```
- [ ] Response generated
- [ ] Confidence score present
- [ ] Citations included
- [ ] No hallucinations

#### Test Hallucination Detection
```bash
# This should be caught:
curl -X POST http://localhost:5000/rag-chat \
  -d '{"message": "Under Section 999 of the IPC..."}'
```
- [ ] Low confidence score
- [ ] Warning flagged
- [ ] Disclaimer added

#### Test Multilingual
```bash
curl -X POST http://localhost:5000/rag-chat \
  -d '{"message": "मुझे गिरफ्तार कर दिया गया", "language": "hi"}'
```
- [ ] Hindi query understood
- [ ] Response in Hindi
- [ ] Legal terms preserved

#### Test Lawyer Escalation
```bash
curl -X POST http://localhost:5000/rag-chat \
  -d '{"message": "I was arrested and in custody", "language": "en"}'
```
- [ ] Escalation triggered
- [ ] Lawyer matching works
- [ ] Case created with priority

---

## Deployment to Production

### Pre-Deployment

#### Security
- [ ] Remove sensitive data from config
- [ ] Enable HTTPS/SSL
- [ ] Set rate limiting
- [ ] Configure CORS properly
- [ ] Enable request validation
- [ ] Set up authentication/authorization

#### Performance
- [ ] Enable Redis caching
- [ ] Optimize vector DB queries
- [ ] Set up CDN for static assets
- [ ] Configure load balancer
- [ ] Enable compression
- [ ] Optimize database indexes

#### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging (Pino/Winston)
- [ ] Set up performance monitoring
- [ ] Configure uptime monitoring
- [ ] Create alerting rules

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy --prod
```
- [ ] Build succeeds
- [ ] Environment variables set in Vercel
- [ ] Deployment URL works
- [ ] All endpoints accessible

### Deploy to Heroku

```bash
# Install Heroku CLI
brew tap heroku/brew && brew install heroku

# Login
heroku login

# Create app
heroku create nyaysetu-legal-ai

# Set environment variables
heroku config:set EMBEDDING_API_KEY=sk_...
heroku config:set LLM_API_KEY=gsk_...
heroku config:set MONGO_URI=mongodb+srv://...

# Deploy
git push heroku main
```
- [ ] App created
- [ ] Environment variables set
- [ ] MongoDB connected
- [ ] Deployed successfully

### Deploy to AWS

- [ ] Create RDS instance for MongoDB
- [ ] Create Lambda functions for APIs
- [ ] Set up API Gateway
- [ ] Configure CloudFront CDN
- [ ] Set up CloudWatch monitoring
- [ ] Configure auto-scaling

### Deploy to Docker

```bash
# Build image
docker build -t nyaysetu-legal-ai .

# Run container
docker run -e EMBEDDING_API_KEY=sk_... -p 5000:5000 nyaysetu-legal-ai
```
- [ ] Docker image builds successfully
- [ ] Container runs without errors
- [ ] API endpoints accessible on :5000

---

## Post-Deployment Validation

### Functionality Tests
- [ ] Chat endpoint working
- [ ] Legal queries processed correctly
- [ ] Hallucination detection active
- [ ] Lawyer escalation functional
- [ ] Multilingual support operational

### Performance Metrics
- [ ] Response time < 4 seconds
- [ ] Uptime > 99%
- [ ] Error rate < 0.1%
- [ ] Vector DB latency < 500ms

### Security Checks
- [ ] No sensitive data in logs
- [ ] HTTPS enabled
- [ ] Rate limiting active
- [ ] Authentication working
- [ ] CORS configured

### Monitoring
- [ ] Error tracking working
- [ ] Logs being collected
- [ ] Performance metrics visible
- [ ] Alerts configured

---

## Integration with Frontend

### Update Chat Endpoint

In `js/chat.js` or similar:
```javascript
// Change endpoint from /chat to /rag-chat
const baseUrl = 'http://localhost:5000';
const response = await fetch(`${baseUrl}/rag-chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userQuery,
    language: getCurrentLanguage(),
    sessionId: getSessionId()
  })
});
```

- [ ] Frontend updated with new endpoint
- [ ] Language parameter sent
- [ ] Session tracking working
- [ ] Responses displayed correctly

### Display Metadata

In response handling:
```javascript
function displayResponse(data) {
  // Display main response
  appendMessage('ai', data.response);
  
  // Show metadata
  if (data.metadata.confidence < 0.7) {
    showConfidenceWarning(data.metadata.confidence);
  }
  
  if (data.metadata.shouldEscalate) {
    showLawyerOption(data.metadata.domain);
  }
}
```

- [ ] Confidence score displayed
- [ ] Citations shown
- [ ] Escalation button appears when needed
- [ ] User understands AI limitations

### Handle Escalation

In escalation handler:
```javascript
async function escalateToLawyer(caseId) {
  const response = await fetch(`/escalate-case`, {
    method: 'POST',
    body: JSON.stringify({ caseId, domain })
  });
  // Show lawyer matching results
}
```

- [ ] Escalation endpoint integrated
- [ ] Lawyer matches displayed
- [ ] Case created successfully
- [ ] User can select lawyer

---

## Monitoring & Maintenance

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review user feedback
- [ ] Check API quotas

### Weekly
- [ ] Review performance metrics
- [ ] Check hallucination rates
- [ ] Verify lawyer escalations working
- [ ] Update knowledge base if needed

### Monthly
- [ ] Add new legal acts/procedures
- [ ] Reindex knowledge base
- [ ] Review confidence scores
- [ ] Update system prompts if needed
- [ ] Analyze user queries for gaps

### Quarterly
- [ ] Major system updates
- [ ] Expand language support
- [ ] Improve domain coverage
- [ ] Performance optimization
- [ ] Security audit

---

## Troubleshooting

### Issue: Low Confidence Scores
**Solution**: Add more legal documents to knowledge base
```bash
npm run index:legal-kb
```

### Issue: Slow Responses
**Solution**: Optimize vector DB
- Check vector DB latency
- Increase batch size
- Enable caching with Redis

### Issue: Hallucinations Not Detected
**Solution**: Review hallucination patterns
- Check forbidden patterns list
- Lower confidence threshold
- Add more validation checks

### Issue: Translation Errors
**Solution**: Verify translation API
- Check API key and credentials
- Review legal term dictionary
- Test with different texts

### Issue: Lawyer Matching Not Working
**Solution**: Populate lawyer database
- Add lawyers to database with specializations
- Verify location and language data
- Test matching algorithm

---

## Rollback Plan

If deployment fails:

1. **Immediate Rollback**
   ```bash
   # Vercel
   vercel rollback
   
   # Heroku
   heroku rollback
   ```

2. **Revert Database Changes**
   - Backup current data
   - Restore from previous backup

3. **Communication**
   - Notify users of issue
   - Post status update
   - Provide ETA for fix

---

## Sign-Off Checklist

- [ ] All tests passing
- [ ] Production environment verified
- [ ] Monitoring active
- [ ] Backups configured
- [ ] Documentation updated
- [ ] Team trained
- [ ] Launch approval obtained
- [ ] Users notified

---

## Success Criteria

✅ **System is Production Ready when:**
- Response time < 4 seconds for 95% of queries
- Hallucination detection rate > 95%
- Uptime > 99.5%
- Error rate < 0.5%
- User satisfaction > 4.5/5 stars
- Lawyer escalation working for 100% of cases
- All 11 languages operational
- No security vulnerabilities

---

**Last Updated**: May 2026  
**Version**: 1.0  
**Status**: Ready for Deployment ✅

