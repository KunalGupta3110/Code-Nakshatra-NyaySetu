/**
 * Court Judgment Model - Real data from courts
 * Stores judgments from Supreme Court, High Courts, and lower courts
 */

class CourtJudgment {
  constructor(data = {}) {
    this.caseNumber = data.caseNumber; // e.g., "CIVIL APPEAL NO. 1234 OF 2023"
    this.title = data.title; // Case title
    this.court = data.court; // "Supreme Court", "High Court - Delhi", etc.
    this.judge = data.judge || []; // Array of judge names
    this.petitioner = data.petitioner; // Plaintiff/Petitioner
    this.respondent = data.respondent; // Defendant/Respondent
    this.dateOfJudgment = data.dateOfJudgment; // ISO date
    this.yearOfJudgment = new Date(data.dateOfJudgment).getFullYear();
    
    this.citationNumber = data.citationNumber; // e.g., "2023 SCC 234"
    this.reportedIn = data.reportedIn; // Law reports cited in
    
    // Core judgment content
    this.headnotes = data.headnotes; // Key points summary
    this.facts = data.facts; // Case facts
    this.legalQuestion = data.legalQuestion; // Main legal issues
    this.reasoning = data.reasoning; // Court's reasoning
    this.judgment = data.judgment; // Final judgment/order
    this.order = data.order; // Specific orders
    
    // Legal content
    this.applicableLaws = data.applicableLaws || []; // Acts/sections cited
    this.relatedCases = data.relatedCases || []; // Referred judgments
    this.precedentValue = data.precedentValue || 'persuasive'; // binding/persuasive
    this.domain = data.domain; // criminal, civil, property, family, etc.
    
    // Metadata
    this.source = data.source; // 'supreme-court', 'high-court', 'ecourt', 'indian-kanoon'
    this.sourceUrl = data.sourceUrl; // Original source URL
    this.sourceId = data.sourceId; // ID from source system
    this.fetchedAt = data.fetchedAt || new Date().toISOString();
    this.lastUpdated = data.lastUpdated || new Date().toISOString();
  }

  /**
   * Extract all sections of law cited in this judgment
   * @returns {Array} Array of section citations with context
   */
  extractSections() {
    const sectionPattern = /Section\s+(\d+[\w\-]*)\s+(?:of\s+)?(?:the\s+)?([\w\s&]+(?:Act|Code))/gi;
    const sections = [];
    
    const text = `${this.reasoning} ${this.judgment}`;
    let match;
    
    while ((match = sectionPattern.exec(text)) !== null) {
      sections.push({
        section: match[1],
        act: match[2],
        context: text.substring(Math.max(0, match.index - 100), match.index + 100)
      });
    }
    
    return sections;
  }

  /**
   * Get searchable text content
   */
  getSearchableText() {
    return `
      ${this.title}
      ${this.caseNumber}
      ${this.facts}
      ${this.legalQuestion}
      ${this.reasoning}
      ${this.judgment}
      ${this.headnotes}
    `.replace(/\s+/g, ' ').trim();
  }

  /**
   * Calculate legal domain based on content and applicable laws
   */
  identifyDomain() {
    const domainKeywords = {
      criminal: ['IPC', 'BNS', 'BNSS', 'criminal', 'offence', 'punishment', 'jail', 'bail', 'FIR'],
      civil: ['contract', 'civil', 'suit', 'damages', 'injunction', 'CPC'],
      property: ['property', 'land', 'building', 'lease', 'rent', 'Transfer of Property'],
      family: ['divorce', 'marriage', 'custody', 'maintenance', 'Hindu Marriage', 'succession'],
      consumer: ['consumer', 'defect', 'refund', 'warranty', 'Consumer Protection'],
      cyber: ['cyber', 'data', 'privacy', 'hacking', 'online', 'IT Act'],
      labour: ['labour', 'employment', 'salary', 'termination', 'gratuity', 'PF'],
      tax: ['tax', 'income', 'GST', 'financial', 'bank'],
      intellectual: ['trademark', 'copyright', 'patent', 'intellectual', 'brand']
    };

    const text = this.getSearchableText().toLowerCase();
    let maxMatches = 0;
    let identifiedDomain = 'civil';

    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      const matches = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        identifiedDomain = domain;
      }
    }

    return identifiedDomain;
  }

  /**
   * Validate judgment data completeness
   */
  validate() {
    const errors = [];
    
    if (!this.caseNumber) errors.push('Case number is required');
    if (!this.title) errors.push('Title is required');
    if (!this.court) errors.push('Court is required');
    if (!this.dateOfJudgment) errors.push('Date of judgment is required');
    if (!this.reasoning || !this.judgment) errors.push('Reasoning and judgment content is required');
    if (!this.source) errors.push('Source is required');
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Convert to JSON for storage
   */
  toJSON() {
    return {
      caseNumber: this.caseNumber,
      title: this.title,
      court: this.court,
      judge: this.judge,
      petitioner: this.petitioner,
      respondent: this.respondent,
      dateOfJudgment: this.dateOfJudgment,
      yearOfJudgment: this.yearOfJudgment,
      citationNumber: this.citationNumber,
      reportedIn: this.reportedIn,
      headnotes: this.headnotes,
      facts: this.facts,
      legalQuestion: this.legalQuestion,
      reasoning: this.reasoning,
      judgment: this.judgment,
      order: this.order,
      applicableLaws: this.applicableLaws,
      relatedCases: this.relatedCases,
      precedentValue: this.precedentValue,
      domain: this.domain || this.identifyDomain(),
      source: this.source,
      sourceUrl: this.sourceUrl,
      sourceId: this.sourceId,
      fetchedAt: this.fetchedAt,
      lastUpdated: this.lastUpdated
    };
  }
}

module.exports = CourtJudgment;
