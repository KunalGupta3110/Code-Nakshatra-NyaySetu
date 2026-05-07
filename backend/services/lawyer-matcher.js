/**
 * Lawyer Escalation System - Handle complex cases and lawyer matching
 * Routes cases to appropriate qualified lawyers
 */

class LawyerEscalationSystem {
  constructor(config = {}) {
    this.lawyerDB = config.lawyerDB;
    this.casesDB = config.casesDB;
    this.escalationThresholds = config.escalationThresholds || this._getDefaultThresholds();
    this.logger = config.logger || console;
  }

  /**
   * Default escalation thresholds
   */
  _getDefaultThresholds() {
    return {
      criminal: {
        immediate: ['arrest', 'police custody', 'detention', 'bail'],
        urgent: ['fir filed', 'charges framed', 'sexual assault'],
        standard: ['legal advice', 'documentation']
      },
      family: {
        immediate: ['domestic violence', 'child abuse', 'custody emergency'],
        urgent: ['divorce ongoing', 'alimony dispute'],
        standard: ['marriage registration', 'separation']
      },
      property: {
        immediate: ['encroachment', 'forcible eviction', 'illegal occupation'],
        urgent: ['property dispute', 'registry issue'],
        standard: ['property transfer']
      },
      consumer: {
        immediate: ['health hazard', 'dangerous product'],
        urgent: ['significant financial loss'],
        standard: ['product complaint']
      },
      cyber: {
        immediate: ['active ongoing attack', 'identity theft'],
        urgent: ['data breach', 'online fraud'],
        standard: ['privacy concern']
      }
    };
  }

  /**
   * Determine escalation need and priority
   */
  assessEscalation(query, domain, confidenceScore) {
    let priority = 'low';
    let needsEscalation = false;

    if (confidenceScore < 0.5) {
      priority = 'high';
      needsEscalation = true;
    }

    // Check domain-specific escalation triggers
    const triggers = this.escalationThresholds[domain] || {};
    
    const lowerQuery = query.toLowerCase();
    
    if (Object.values(triggers.immediate || []).some(t => lowerQuery.includes(t))) {
      priority = 'urgent';
      needsEscalation = true;
    } else if (Object.values(triggers.urgent || []).some(t => lowerQuery.includes(t))) {
      priority = 'high';
      needsEscalation = true;
    } else if (Object.values(triggers.standard || []).some(t => lowerQuery.includes(t))) {
      priority = 'medium';
      needsEscalation = true;
    }

    return {
      needsEscalation,
      priority,
      domain,
      assessedAt: new Date().toISOString()
    };
  }

  /**
   * Match case to appropriate lawyers
   */
  async matchLawyers(caseData, lawyerPool = []) {
    const matches = [];

    for (const lawyer of lawyerPool) {
      let score = 0;

      // Specialization match
      if (lawyer.specializations && lawyer.specializations.includes(caseData.domain)) {
        score += 100;
      }

      // Experience in similar cases
      if (lawyer.experienceYears && lawyer.experienceYears >= 5) {
        score += 50;
      } else if (lawyer.experienceYears && lawyer.experienceYears >= 2) {
        score += 30;
      }

      // Location match
      if (lawyer.jurisdiction && lawyer.jurisdiction.includes(caseData.location)) {
        score += 30;
      }

      // Language match
      if (lawyer.languages && lawyer.languages.includes(caseData.language || 'en')) {
        score += 20;
      }

      // Availability
      if (lawyer.available) {
        score += 25;
      }

      // Success rate
      if (lawyer.successRate) {
        score += lawyer.successRate / 2;
      }

      // Recent activity
      if (lawyer.lastActive) {
        const daysSinceActive = Math.floor(
          (Date.now() - new Date(lawyer.lastActive)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceActive < 7) score += 15;
      }

      // Case load consideration
      if (lawyer.currentCases) {
        if (lawyer.currentCases < 5) score += 20;
        else if (lawyer.currentCases > 20) score -= 30;
      }

      if (score > 0) {
        matches.push({
          ...lawyer,
          matchScore: score,
          recommendationReason: this._generateRecommendationReason(lawyer, caseData)
        });
      }
    }

    // Sort by match score
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  /**
   * Generate recommendation reason
   */
  _generateRecommendationReason(lawyer, caseData) {
    const reasons = [];

    if (lawyer.specializations?.includes(caseData.domain)) {
      reasons.push(`Specializes in ${caseData.domain} law`);
    }

    if (lawyer.experienceYears && lawyer.experienceYears >= 10) {
      reasons.push(`${lawyer.experienceYears}+ years of experience`);
    }

    if (lawyer.successRate && lawyer.successRate > 80) {
      reasons.push(`${lawyer.successRate}% success rate`);
    }

    if (lawyer.languages?.includes(caseData.language || 'en')) {
      reasons.push(`Fluent in ${caseData.language || 'English'}`);
    }

    if (lawyer.jurisdiction?.includes(caseData.location)) {
      reasons.push(`Practices in ${caseData.location}`);
    }

    return reasons.join(' • ');
  }

  /**
   * Create escalation case
   */
  async createEscalationCase(query, domain, caseContext = {}) {
    const escalationCase = {
      id: this._generateId(),
      query,
      domain,
      status: 'pending_lawyer_assignment',
      priority: caseContext.priority || 'medium',
      context: {
        userId: caseContext.userId,
        language: caseContext.language || 'en',
        location: caseContext.location,
        sessionId: caseContext.sessionId
      },
      createdAt: new Date().toISOString(),
      assignedLawyerId: null,
      lawyerMatches: [],
      aiSummary: caseContext.aiSummary,
      confidenceScore: caseContext.confidenceScore
    };

    try {
      // Save to database
      if (this.casesDB && this.casesDB.save) {
        await this.casesDB.save(escalationCase);
      }
    } catch (error) {
      this.logger.error('Error saving escalation case:', error);
    }

    return escalationCase;
  }

  /**
   * Create escalation notification
   */
  generateEscalationNotification(escalationCase, matchedLawyers) {
    return {
      type: 'lawyer_escalation',
      title: `Your case needs a lawyer's review`,
      message: `We've identified that your ${escalationCase.domain} case requires professional legal assistance. We've found ${matchedLawyers.length} qualified lawyers who can help.`,
      caseId: escalationCase.id,
      priority: escalationCase.priority,
      suggestedLawyers: matchedLawyers.slice(0, 3).map(l => ({
        id: l.id,
        name: l.name,
        specialization: l.specializations?.[0],
        rating: l.rating,
        recommendationReason: l.recommendationReason
      })),
      action: {
        type: 'escalate_case',
        text: 'Connect with a Lawyer',
        caseId: escalationCase.id
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Escalate case to lawyer
   */
  async escalateToLawyer(caseId, lawyerId) {
    try {
      // Update case with lawyer assignment
      if (this.casesDB && this.casesDB.update) {
        await this.casesDB.update(caseId, {
          assignedLawyerId: lawyerId,
          status: 'assigned_to_lawyer',
          assignedAt: new Date().toISOString()
        });
      }

      // Notify lawyer about new case
      return {
        success: true,
        message: 'Case escalated to lawyer',
        caseId,
        lawyerId,
        nextSteps: 'The lawyer will review your case and contact you within 24-48 hours'
      };
    } catch (error) {
      this.logger.error('Error escalating case:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if case is urgent
   */
  isUrgent(domain, query) {
    const urgentKeywords = [
      'arrest', 'jail', 'custody', 'emergency', 'urgent', 'immediate',
      'police', 'fir', 'domestic violence', 'assault', 'threat',
      'eviction', 'encroachment', 'hack', 'fraud', 'theft'
    ];

    const lowerQuery = query.toLowerCase();
    return urgentKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Generate ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Get escalation statistics
   */
  async getEscalationStats(domain = null, days = 30) {
    try {
      const stats = {
        total: 0,
        byDomain: {},
        byPriority: {
          urgent: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        assignmentRate: 0,
        avgTimeToAssign: 0
      };

      // This would query the database for actual stats
      return stats;
    } catch (error) {
      this.logger.error('Error getting escalation stats:', error);
      return null;
    }
  }
}

module.exports = LawyerEscalationSystem;
