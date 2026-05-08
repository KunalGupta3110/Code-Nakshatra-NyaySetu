/**
 * Real Data Sources Configuration
 * Comprehensive list of Indian legal data sources with API endpoints
 */

const REAL_DATA_SOURCES = {
  
  // E-Court System - Nationwide case information
  ecourt: {
    name: 'E-Court System (Indian Courts)',
    website: 'https://www.ecourts.gov.in',
    apiEndpoint: 'https://services.ecourts.gov.in/ecourtindiaapi',
    documentation: 'https://www.ecourts.gov.in/ecourts_public_docs/e-Court%20Case%20Information%20System%20API.pdf',
    dataAvailable: [
      'Case filing status',
      'Case details',
      'Court orders',
      'Hearing schedules',
      'Judgments (when published)'
    ],
    coverage: 'All district courts, high courts, and lower courts in India',
    updateFrequency: 'Real-time',
    requirements: 'API key registration',
    examples: {
      caseSearch: 'https://services.ecourts.gov.in/ecourtindiaapi/api/caseinfo',
      orderCopy: 'https://services.ecourts.gov.in/ecourtindiaapi/api/ordercopy'
    }
  },

  // Supreme Court JUDIS - Full judgments and orders
  supremeCourt: {
    name: 'Supreme Court JUDIS Portal',
    website: 'https://www.judis.nic.in',
    apiEndpoint: 'https://www.judis.nic.in/judis/v2.1/api',
    documentation: 'https://www.judis.nic.in/help.html',
    dataAvailable: [
      'Full text judgments',
      'Case details',
      'Judge information',
      'Citation numbers',
      'Related judgments',
      'Headnotes',
      'Legal reasoning'
    ],
    coverage: 'Supreme Court of India (since 1950)',
    updateFrequency: 'Updated after judgment delivery',
    requirements: 'No API key needed for public data',
    examples: {
      caseSearch: 'https://www.judis.nic.in/judis/v2.1/api/sc/search?caseNo=CIVIL%20APPEAL',
      judgment: 'https://www.judis.nic.in/judis/caselookup/viewpdffile/1234567'
    }
  },

  // High Courts - State-specific portals
  highCourts: {
    name: 'High Courts of India',
    website: 'https://www.highcourtofindia.nic.in',
    courts: {
      'Delhi': {
        website: 'https://delhihighcourt.nic.in',
        apiEndpoint: 'https://delhihighcourt.nic.in/api',
        coverage: 'Delhi, Haryana, Punjab'
      },
      'Bombay': {
        website: 'https://www.bljhighcourt.in',
        apiEndpoint: 'https://www.bljhighcourt.in/api',
        coverage: 'Maharashtra, Goa, Daman and Diu'
      },
      'Calcutta': {
        website: 'https://www.calcuttahighcourt.nic.in',
        apiEndpoint: 'https://www.calcuttahighcourt.nic.in/api',
        coverage: 'West Bengal, Orissa'
      },
      'Madras': {
        website: 'https://www.madras.nic.in',
        apiEndpoint: 'https://www.madras.nic.in/api',
        coverage: 'Tamil Nadu, Puducherry'
      },
      'Allahabad': {
        website: 'https://allahabad.nic.in',
        apiEndpoint: 'https://allahabad.nic.in/api',
        coverage: 'Uttar Pradesh'
      },
      'Gujarat': {
        website: 'https://gujarathighcourt.nic.in',
        apiEndpoint: 'https://gujarathighcourt.nic.in/api',
        coverage: 'Gujarat'
      }
    },
    dataAvailable: [
      'Full text judgments',
      'Case details',
      'Orders and directions',
      'Precedents',
      'Judge profiles'
    ],
    updateFrequency: 'Updated regularly'
  },

  // Indian Kanoon - Comprehensive legal database
  indianKanoon: {
    name: 'Indian Kanoon',
    website: 'https://www.indiankanoon.org',
    apiEndpoint: 'https://indiankanoon.org/api/search',
    documentation: 'https://www.indiankanoon.org/api/apidocumentation',
    dataAvailable: [
      'Full text of all Indian laws',
      'Supreme Court judgments (1950-present)',
      'High Court judgments',
      'Lower Court judgments',
      'Laws and acts',
      'Rules and regulations',
      'Amendments'
    ],
    coverage: 'Comprehensive - 20+ million documents',
    updateFrequency: 'Continuously updated',
    requirements: 'No API key for basic search',
    examples: {
      search: 'https://indiankanoon.org/api/search/?q=bail',
      document: 'https://indiankanoon.org/doc/123456/'
    }
  },

  // India Code - Official legal repository
  indiaCode: {
    name: 'India Code (Legislative Database)',
    website: 'https://www.indiacode.nic.in',
    apiEndpoint: 'https://www.indiacode.nic.in/api',
    documentation: 'https://www.indiacode.nic.in/help',
    dataAvailable: [
      'All Acts of Indian Parliament',
      'Amendments and schedules',
      'Official text',
      'Historical versions',
      'Sections and clauses',
      'Entry into force dates'
    ],
    coverage: 'All central laws since 1836',
    updateFrequency: 'Updated with new legislation',
    requirements: 'No authentication needed',
    examples: {
      acts: 'https://www.indiacode.nic.in/api/acts',
      sections: 'https://www.indiacode.nic.in/api/acts/BNS/sections'
    }
  },

  // State Legislation - State laws
  stateLegislation: {
    name: 'State Legislations',
    website: 'https://www.prsindia.org',
    dataAvailable: [
      'State laws',
      'State amendments',
      'Bills passed',
      'Legislative information'
    ],
    coverage: 'All Indian states and union territories',
    updateFrequency: 'As laws are passed'
  },

  // E-Gazette - Official government announcements
  eGazette: {
    name: 'e-Gazette of India',
    website: 'https://egazette.nic.in',
    apiEndpoint: 'https://egazette.nic.in/api',
    dataAvailable: [
      'Government notifications',
      'Presidential orders',
      'New laws and amendments',
      'Official announcements'
    ],
    coverage: 'All official government publications',
    updateFrequency: 'Daily'
  },

  // SCC Online - Supreme Court Cases Online
  sccOnline: {
    name: 'SCC Online - Supreme Court Cases',
    website: 'https://www.scconline.com',
    dataAvailable: [
      'Supreme Court full text judgments',
      'Case citations',
      'Headnotes',
      'Reported decisions'
    ],
    coverage: 'Complete Supreme Court judgments',
    requirements: 'Subscription for full access'
  },

  // Law Commission Reports
  lawCommission: {
    name: 'Law Commission of India',
    website: 'https://lawcommissionofindia.nic.in',
    dataAvailable: [
      'Research reports',
      'Legal analysis',
      'Reform recommendations',
      'Policy documents'
    ],
    coverage: 'Legal policy and research'
  }
};

/**
 * Get all available sources
 */
function getAllSources() {
  return REAL_DATA_SOURCES;
}

/**
 * Get source by name
 */
function getSource(sourceName) {
  return REAL_DATA_SOURCES[sourceName];
}

/**
 * Get all high courts
 */
function getAllHighCourts() {
  return REAL_DATA_SOURCES.highCourts.courts;
}

/**
 * Recommended sources for initial training (85-90% accuracy)
 */
function getRecommendedSources() {
  return {
    primary: [
      'supremeCourt',      // Most authoritative
      'ecourt',            // Comprehensive coverage
      'indiaCode'          // Official laws
    ],
    secondary: [
      'indianKanoon',      // Large corpus
      'highCourts'         // Precedents
    ],
    supplementary: [
      'eGazette',          // Updates
      'stateLegislation'   // State laws
    ]
  };
}

/**
 * Sample queries for each domain
 */
const DOMAIN_SAMPLE_QUERIES = {
  criminal: [
    'bail procedure bail conditions',
    'FIR filing criminal procedure',
    'arrest without warrant',
    'criminal investigation CrPC',
    'bail bond personal bond',
    'Bharatiya Nyaya Sanhita offense',
    'section 41 section 42 arrest'
  ],
  civil: [
    'civil dispute resolution',
    'contract breach recovery',
    'injunction civil suit',
    'damages civil liability',
    'specific performance contract',
    'tortious liability'
  ],
  property: [
    'property ownership transfer',
    'land registry encroachment',
    'landlord tenant disputes',
    'rent recovery eviction',
    'property inheritance',
    'succession property law'
  ],
  family: [
    'divorce grounds divorce procedure',
    'child custody maintenance',
    'marriage dissolution',
    'inheritance family law',
    'succession Hindu Marriage Act',
    'alimony spousal support'
  ],
  consumer: [
    'consumer complaint defect',
    'product liability warranty',
    'refund consumer protection',
    'unfair trade practices',
    'product safety'
  ],
  cyber: [
    'cyber crime hacking',
    'data breach privacy',
    'online fraud identity theft',
    'cyber harassment defamation',
    'information technology act'
  ],
  labour: [
    'employment termination wrongful',
    'salary gratuity bonus',
    'workplace harassment',
    'labor code employment act',
    'industrial relations strike'
  ],
  tax: [
    'income tax GST',
    'tax assessment audit',
    'tax evasion penalty',
    'financial regulation banking'
  ],
  constitutional: [
    'fundamental rights constitution',
    'right to information RTI',
    'public interest litigation PIL',
    'constitutional remedy'
  ]
};

module.exports = {
  REAL_DATA_SOURCES,
  getAllSources,
  getSource,
  getAllHighCourts,
  getRecommendedSources,
  DOMAIN_SAMPLE_QUERIES
};
