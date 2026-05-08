/**
 * Real Data Fetchers - Integrate real legal data from Indian courts
 * Sources: E-court, Supreme Court, High Courts, Indian Kanoon
 */

const fetch = require('node-fetch');
const CourtJudgment = require('../models/CourtJudgment');

class RealDataFetchers {
  
  /**
   * Fetch from E-Court System (ecourts.gov.in)
   * Note: E-court has limited public API - this uses available endpoints
   */
  static async fetchFromECourt(caseNumber, courtCode = null) {
    try {
      // E-court case information API
      const url = `https://services.ecourts.gov.in/ecourtindiaapi/api/caseinfo`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'NyaySetu-Legal-AI/1.0'
        },
        body: JSON.stringify({
          caseNo: caseNumber,
          courtCode: courtCode
        })
      });

      if (!response.ok) {
        console.error('E-court API error:', response.statusText);
        return null;
      }

      const data = await response.json();
      
      // Parse E-court response into CourtJudgment model
      return new CourtJudgment({
        caseNumber: data.caseNo,
        title: data.caseName,
        court: data.courtName,
        petitioner: data.petitioner,
        respondent: data.respondent,
        dateOfJudgment: data.judgmentDate,
        reasoning: data.orderCopy || data.courtOrder,
        judgment: data.judgmentCopy,
        source: 'ecourt',
        sourceUrl: data.sourceUrl,
        sourceId: data.caseId,
        applicableLaws: data.applicableSections || []
      });
    } catch (error) {
      console.error('Error fetching from E-court:', error);
      return null;
    }
  }

  /**
   * Fetch Supreme Court Judgments from JUDIS (judis.nic.in)
   */
  static async fetchFromSupremeCourt(caseNumber) {
    try {
      // Supreme Court of India - JUDIS portal API
      const url = `https://www.judis.nic.in/judis/v2.1/api/sc/caseinfo`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          caseNo: caseNumber
        })
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      return new CourtJudgment({
        caseNumber: data.caseNo,
        title: data.caseName,
        court: 'Supreme Court of India',
        judge: data.judges || [],
        petitioner: data.petitioner,
        respondent: data.respondent,
        dateOfJudgment: data.judgmentDate,
        citationNumber: data.citationNo,
        reportedIn: data.reportedIn,
        headnotes: data.headnotes,
        facts: data.facts,
        legalQuestion: data.legalQuestions,
        reasoning: data.judgment,
        judgment: data.finalOrder,
        applicableLaws: data.lawsCited || [],
        relatedCases: data.relatedJudgments || [],
        precedentValue: 'binding',
        source: 'supreme-court',
        sourceUrl: `https://www.judis.nic.in/${data.caseId}`,
        sourceId: data.caseId
      });
    } catch (error) {
      console.error('Error fetching from Supreme Court:', error);
      return null;
    }
  }

  /**
   * Fetch High Court Judgments
   * Common endpoints: Delhi HC, Bombay HC, Calcutta HC, Madras HC, etc.
   */
  static async fetchFromHighCourt(caseNumber, highCourtCode = 'DEL') {
    try {
      // Different high courts have different portals
      const highCourtUrls = {
        'DEL': 'https://delhihighcourt.nic.in/api/judgment',
        'BOM': 'https://www.court.nic.in/judis/bom/api',
        'CAL': 'https://www.calcuttahighcourt.nic.in/api/judgment',
        'MAD': 'https://www.madras.nic.in/api/judgment',
        'CHD': 'https://www.chd.nic.in/api/judgment'
      };

      const url = highCourtUrls[highCourtCode] || highCourtUrls['DEL'];
      
      const response = await fetch(`${url}/${caseNumber}`, {
        headers: { 'User-Agent': 'NyaySetu-Legal-AI/1.0' }
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      return new CourtJudgment({
        caseNumber: data.caseNo,
        title: data.caseName,
        court: `High Court - ${highCourtCode}`,
        judge: data.judges || [],
        petitioner: data.petitioner,
        respondent: data.respondent,
        dateOfJudgment: data.judgmentDate,
        reasoning: data.judgment,
        judgment: data.order,
        applicableLaws: data.lawsCited || [],
        precedentValue: 'binding',
        source: 'high-court',
        sourceUrl: data.sourceUrl,
        sourceId: data.caseId
      });
    } catch (error) {
      console.error('Error fetching from High Court:', error);
      return null;
    }
  }

  /**
   * Fetch from Indian Kanoon (indiankanoon.org)
   * Comprehensive source of Indian laws and judgments
   */
  static async fetchFromIndianKanoon(query, docType = 'judgment') {
    try {
      // Indian Kanoon API
      const url = `https://indiankanoon.org/api/search`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          doctype: docType,
          limit: 10
        })
      });

      if (!response.ok) return [];

      const data = await response.json();
      const results = [];

      // Parse results into CourtJudgment objects
      for (const doc of data.docs || []) {
        try {
          results.push(new CourtJudgment({
            caseNumber: doc.caseNo || doc.docId,
            title: doc.title || doc.caseName,
            court: doc.court || 'Indian Courts',
            dateOfJudgment: doc.judgmentDate || doc.publishDate,
            reasoning: doc.content || doc.headnotes,
            judgment: doc.judgment || doc.content,
            applicableLaws: RealDataFetchers._extractLawsFromText(doc.content),
            source: 'indian-kanoon',
            sourceUrl: doc.url,
            sourceId: doc.docId,
            domain: doc.category
          }));
        } catch (e) {
          console.warn('Error parsing Indian Kanoon result:', e);
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching from Indian Kanoon:', error);
      return [];
    }
  }

  /**
   * Fetch actual Indian Legal Acts and Amendments
   * Sources: indiacode.nic.in, egazette.nic.in
   */
  static async fetchIndianLegalActs(actName) {
    try {
      // India Code official repository
      const url = `https://www.indiacode.nic.in/api/acts`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'NyaySetu-Legal-AI/1.0' }
      });

      if (!response.ok) return null;

      const data = await response.json();
      
      // Find matching act
      const act = data.acts.find(a => a.name.includes(actName));
      if (!act) return null;

      return {
        name: act.name,
        year: act.year,
        sections: act.sections || [],
        schedules: act.schedules || [],
        amendments: act.amendments || [],
        fullText: act.fullText,
        source: 'india-code',
        sourceUrl: act.url,
        lastUpdated: act.lastUpdated
      };
    } catch (error) {
      console.error('Error fetching legal acts:', error);
      return null;
    }
  }

  /**
   * Extract laws cited from text
   */
  static _extractLawsFromText(text) {
    const patterns = [
      /Section\s+(\d+[\w-]*)\s+(?:of\s+)?(?:the\s+)?([\w\s&]+(?:Act|Code|Regulation))/gi,
      /Article\s+(\d+)\s+(?:of\s+)?(?:the\s+)?(Constitution)/gi,
      /Rule\s+(\d+[\w-]*)\s+(?:of\s+)?(?:the\s+)?([\w\s&]+)/gi
    ];

    const laws = [];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        laws.push({
          section: match[1],
          act: match[2],
          reference: match[0]
        });
      }
    }

    return laws;
  }

  /**
   * Batch fetch and sync multiple cases
   */
  static async batchFetchCases(caseNumbers, sources = ['ecourt', 'supreme-court', 'high-court']) {
    const results = [];
    
    for (const caseNum of caseNumbers) {
      const judgment = {};
      
      if (sources.includes('ecourt')) {
        const ecourt = await this.fetchFromECourt(caseNum);
        if (ecourt) judgment.ecourt = ecourt;
      }
      
      if (sources.includes('supreme-court')) {
        const sc = await this.fetchFromSupremeCourt(caseNum);
        if (sc) judgment.supremeCourt = sc;
      }
      
      if (sources.includes('high-court')) {
        const hc = await this.fetchFromHighCourt(caseNum);
        if (hc) judgment.highCourt = hc;
      }
      
      if (Object.keys(judgment).length > 0) {
        results.push({ caseNumber: caseNum, data: judgment });
      }
    }
    
    return results;
  }
}

module.exports = RealDataFetchers;
