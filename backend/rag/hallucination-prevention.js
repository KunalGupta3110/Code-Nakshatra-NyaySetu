/**
 * Hallucination Prevention & Safety Layer
 * Ensures AI responses are grounded, accurate, and safe
 * Implements multiple validation checks before response generation
 */

class HallucinationPrevention {
  constructor(config = {}) {
    this.confidenceThreshold = config.confidenceThreshold || 0.65;
    this.citationRequired = config.citationRequired !== false;
    this.maxUncertainty = config.maxUncertainty || 0.35;
    this.forbiddenPatterns = config.forbiddenPatterns || this._getDefaultForbiddenPatterns();
  }

  /**
   * Get default forbidden patterns that indicate hallucination
   */
  _getDefaultForbiddenPatterns() {
    return [
      // Fake laws/acts
      /section\s+\d+\s+of\s+the\s+(indian|bharatiya)?\s*\w+\s+(act|sanhita|adhiniyam)\s*20\d{2}(?!\w)/gi,
      
      // Fabricated punishments
      /punishment\s+(?:up\s+to\s+)?(?:\d+|[a-z]+)\s+(?:years?|months?|days?|rupees?)(?:\s+and\/or)?/gi,
      
      // Guaranteed outcomes
      /you\s+(?:will|shall|must)\s+(?:definitely|definitely|certainly|surely)\s+(?:win|get|recover)/gi,
      /this\s+(?:will|shall)\s+definitely\s+(?:result in|lead to|guarantee)/gi,
      
      // Court predictions
      /the\s+court\s+(?:will|shall|is\s+likely\s+to)\s+(?:definitely|certainly|surely)/gi,
      
      // Advocate impersonation
      /i\s+(?:am|am\s+acting\s+as)\s+your?\s+(?:advocate|lawyer|attorney)/gi,
      /as\s+your?\s+(?:advocate|lawyer|attorney),\s+i\s+(?:advise|recommend|suggest)/gi,
      
      // False promises
      /guaranteed?\s+(?:result|outcome|success)/gi,
      /100%\s+(?:success|win)/gi
    ];
  }

  /**
   * Main validation pipeline
   * @returns {Object} Validation result with flags and recommendations
   */
  async validateResponse(response, retrievedDocs = [], userQuery = '') {
    const issues = [];
    const warnings = [];
    let confidenceScore = 1.0;

    // Check 1: Source grounding
    if (!this._isSourceGrounded(response, retrievedDocs)) {
      issues.push('Response not grounded in retrieved legal sources');
      confidenceScore *= 0.6;
    }

    // Check 2: Forbidden patterns
    const forbiddenMatches = this._findForbiddenPatterns(response);
    if (forbiddenMatches.length > 0) {
      issues.push(`Contains potentially fabricated information: ${forbiddenMatches.join(', ')}`);
      confidenceScore *= 0.3;
    }

    // Check 3: Citation verification
    if (this.citationRequired && !this._hasCitations(response)) {
      warnings.push('Response lacks citations - user should verify with lawyer');
      confidenceScore *= 0.8;
    }

    // Check 4: Uncertainty indicators
    const uncertaintyFactors = this._detectUncertainty(response);
    if (uncertaintyFactors.count > this.maxUncertainty * 100) {
      warnings.push('Response contains high uncertainty - recommend lawyer consultation');
      confidenceScore *= (1 - uncertaintyFactors.ratio);
    }

    // Check 5: Legal consistency
    const consistencyIssues = this._checkLegalConsistency(response, userQuery);
    if (consistencyIssues.length > 0) {
      warnings.push(...consistencyIssues);
      confidenceScore *= 0.85;
    }

    // Check 6: Appropriate disclaimers
    if (!this._hasAppropriateDisclaimer(response)) {
      warnings.push('Missing legal disclaimer - should be added');
    }

    return {
      isValid: issues.length === 0,
      confidenceScore: Math.max(0.1, confidenceScore),
      issues,
      warnings,
      requiresReview: issues.length > 0 || confidenceScore < this.confidenceThreshold,
      shouldEscalate: issues.length > 1 || confidenceScore < 0.5,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if response is grounded in retrieved documents
   */
  _isSourceGrounded(response, retrievedDocs) {
    if (!retrievedDocs || retrievedDocs.length === 0) {
      return false;
    }

    // Extract key legal terms and sections from response
    const sectionMatches = response.match(/section\s+\d+/gi) || [];
    const actMatches = response.match(/(?:act|sanhita|adhiniyam)\s+\d{4}/gi) || [];
    
    const allMatches = [...sectionMatches, ...actMatches];
    
    if (allMatches.length === 0) {
      // No legal citations - check if it's general guidance
      return response.toLowerCase().includes('you may') || 
             response.toLowerCase().includes('consider') ||
             response.toLowerCase().includes('generally');
    }

    // Check if cited laws appear in retrieved documents
    const docText = retrievedDocs.map(d => d.text || '').join(' ');
    const groundingMatches = allMatches.filter(match => docText.includes(match));
    
    return groundingMatches.length / allMatches.length >= 0.7;
  }

  /**
   * Find forbidden patterns in response
   */
  _findForbiddenPatterns(response) {
    const matches = [];
    
    for (const pattern of this.forbiddenPatterns) {
      if (pattern.test(response)) {
        matches.push(pattern.source.substring(0, 30) + '...');
      }
    }

    return matches;
  }

  /**
   * Check if response has proper citations
   */
  _hasCitations(response) {
    const citationPatterns = [
      /section\s+\d+/gi,
      /article\s+\d+/gi,
      /act,\s+\d{4}/gi,
      /IPC\s+\d{3}/gi,
      /Consumer\s+Protection\s+Act/gi,
      /Constitution\s+of\s+India/gi,
      /RTI\s+Act/gi
    ];

    return citationPatterns.some(pattern => pattern.test(response));
  }

  /**
   * Detect uncertainty in response
   */
  _detectUncertainty(response) {
    const uncertaintyWords = [
      'may', 'might', 'could', 'possibly', 'perhaps',
      'generally', 'typically', 'often', 'sometimes',
      'unclear', 'uncertain', 'depends', 'varies'
    ];

    const matches = [];
    const words = response.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (uncertaintyWords.includes(word.replace(/[^\w]/g, ''))) {
        matches.push(word);
      }
    }

    return {
      count: matches.length,
      ratio: matches.length / Math.max(1, words.length)
    };
  }

  /**
   * Check legal consistency
   */
  _checkLegalConsistency(response, userQuery) {
    const issues = [];

    // Check for contradictions
    if (response.includes('yes') && response.includes('no')) {
      issues.push('Response contains contradictory statements');
    }

    // Check for overgeneralization
    if (response.toLowerCase().includes('all cases') || response.toLowerCase().includes('always')) {
      issues.push('Response may be overgeneralizing - legal outcomes vary by case');
    }

    // Check for appropriate scope
    if (userQuery.length > 200 && response.length < 200) {
      issues.push('Response may be too brief for complex query');
    }

    return issues;
  }

  /**
   * Check if response has appropriate disclaimers
   */
  _hasAppropriateDisclaimer(response) {
    const disclaimerPatterns = [
      /not\s+(?:a\s+)?(?:legal|professional)\s+advice/gi,
      /consult\s+(?:a\s+)?(?:qualified\s+)?lawyer/gi,
      /not\s+liable/gi,
      /disclaimer/gi,
      /general\s+information\s+only/gi
    ];

    return disclaimerPatterns.some(pattern => pattern.test(response));
  }

  /**
   * Inject safety disclaimers
   */
  injectDisclaimer(response, severity = 'standard') {
    const disclaimers = {
      standard: '\n\n⚠️ **Legal Disclaimer**: This is general legal information, not personal legal advice. For specific legal guidance, consult a qualified advocate.',
      
      serious: '\n\n⚠️ **IMPORTANT**: This matter requires immediate consultation with a qualified lawyer. Do not delay in seeking professional legal counsel.',
      
      criminal: '\n\n⚠️ **URGENT**: If this involves criminal proceedings, consult an advocate immediately. NyaySetu cannot provide legal representation.',
      
      financial: '\n\n⚠️ **Financial/Legal Risk**: This may involve significant financial or legal consequences. Consult a qualified lawyer before taking action.',
      
      constitutional: '\n\n⚠️ **Constitutional Matter**: This involves fundamental rights. Consult an advocate experienced in constitutional law.'
    };

    const disclaimer = disclaimers[severity] || disclaimers.standard;
    
    // Check if disclaimer already exists
    if (response.includes('Disclaimer') || response.includes('disclaimer') || response.includes('⚠️')) {
      return response;
    }

    return response + disclaimer;
  }

  /**
   * Flag for lawyer escalation
   */
  shouldEscalate(response, validationResult) {
    const escalationFactors = [
      validationResult.issues.length > 0,
      validationResult.confidenceScore < this.confidenceThreshold,
      response.toLowerCase().includes('criminal'),
      response.toLowerCase().includes('court'),
      response.toLowerCase().includes('arrest'),
      response.toLowerCase().includes('property dispute'),
      response.toLowerCase().includes('divorce'),
      response.toLowerCase().includes('financial')
    ];

    return escalationFactors.filter(Boolean).length >= 2;
  }

  /**
   * Generate confidence feedback for user
   */
  generateConfidenceFeedback(validationResult) {
    const score = validationResult.confidenceScore;
    
    if (score >= 0.85) {
      return 'High confidence. This response is well-supported by Indian law.';
    } else if (score >= 0.7) {
      return 'Moderate confidence. Please verify key points with a lawyer.';
    } else if (score >= 0.5) {
      return 'Low confidence. Strongly recommend consulting a qualified lawyer before acting on this information.';
    } else {
      return 'Unable to provide reliable guidance on this matter. Professional legal consultation is essential.';
    }
  }
}

module.exports = HallucinationPrevention;
