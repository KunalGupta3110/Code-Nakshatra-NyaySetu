/**
 * Multilingual Legal Support - Translate and handle 11+ Indian languages
 * Supports: EN, HI, UR, MR, TA, TE, BN, KN, PA, ML, GU
 */

class MultilingualService {
  constructor(config = {}) {
    this.translationProvider = config.translationProvider || 'google'; // 'google', 'azure', 'local'
    this.apiKey = config.apiKey;
    this.preserveLegalTerms = config.preserveLegalTerms !== false;
    this.supportedLanguages = {
      'en': { name: 'English', nativeName: 'English', script: 'Latin' },
      'hi': { name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari' },
      'ur': { name: 'Urdu', nativeName: 'اردو', script: 'Perso-Arabic' },
      'mr': { name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari' },
      'ta': { name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil' },
      'te': { name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu' },
      'bn': { name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
      'kn': { name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
      'pa': { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
      'ml': { name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam' },
      'gu': { name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' }
    };
    
    // Legal terminology dictionary (should be extensive in production)
    this.legalTermsDictionary = this._buildLegalTermsDictionary();
  }

  /**
   * Translate text to target language
   */
  async translate(text, targetLanguage, sourceLanguage = 'en') {
    try {
      if (sourceLanguage === targetLanguage) {
        return text;
      }

      if (!this.supportedLanguages[targetLanguage]) {
        throw new Error(`Unsupported language: ${targetLanguage}`);
      }

      // Preserve legal terms if enabled
      let processedText = text;
      let legalTerms = [];
      
      if (this.preserveLegalTerms) {
        const preservation = this._preserveLegalTerms(text, targetLanguage);
        processedText = preservation.text;
        legalTerms = preservation.terms;
      }

      // Translate
      let translated;
      if (this.translationProvider === 'google') {
        translated = await this._translateGoogle(processedText, sourceLanguage, targetLanguage);
      } else if (this.translationProvider === 'azure') {
        translated = await this._translateAzure(processedText, sourceLanguage, targetLanguage);
      } else {
        translated = await this._translateLocal(processedText, sourceLanguage, targetLanguage);
      }

      // Restore legal terms
      if (legalTerms.length > 0) {
        translated = this._restoreLegalTerms(translated, legalTerms);
      }

      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  }

  /**
   * Preserve legal terms during translation
   */
  _preserveLegalTerms(text, targetLanguage) {
    const terms = [];
    let processedText = text;
    let replacementIndex = 0;

    // Find and preserve legal acts/sections
    const legalPatterns = [
      /Section\s+\d+[\w.]*\s+of\s+[^,.;]*/gi,
      /Article\s+\d+\s+of\s+[^,.;]*/gi,
      /\bIPC\s+\d+/gi,
      /\bBNS\s+\d+/gi,
      /Bharatiya\s+\w+\s+\w+/gi,
      /High\s+Court|Supreme\s+Court/gi,
      /Consumer\s+Protection\s+Act/gi,
      /Constitution\s+of\s+India/gi
    ];

    for (const pattern of legalPatterns) {
      const matches = text.match(pattern) || [];
      matches.forEach(match => {
        const placeholder = `{{LEGAL_TERM_${replacementIndex}}}`;
        processedText = processedText.replace(match, placeholder);
        terms.push({ placeholder, original: match, translated: match });
        replacementIndex++;
      });
    }

    return { text: processedText, terms };
  }

  /**
   * Restore legal terms in translated text
   */
  _restoreLegalTerms(text, terms) {
    let result = text;
    terms.forEach(term => {
      result = result.replace(term.placeholder, term.original);
    });
    return result;
  }

  /**
   * Build legal terms dictionary
   */
  _buildLegalTermsDictionary() {
    return {
      'en': {
        'affidavit': 'affidavit',
        'petition': 'petition',
        'bail': 'bail',
        'suit': 'suit',
        'court': 'court',
        'judge': 'judge',
        'section': 'section',
        'act': 'act'
      },
      'hi': {
        'affidavit': 'हलफनामा',
        'petition': 'याचिका',
        'bail': 'जमानत',
        'suit': 'वाद',
        'court': 'न्यायालय',
        'judge': 'न्यायाधीश',
        'section': 'धारा',
        'act': 'अधिनियम'
      },
      'ta': {
        'affidavit': 'உறுதிமொழி',
        'petition': 'மனு',
        'bail': 'ஆமணம்',
        'suit': 'வழக்கு',
        'court': 'நீதிமன்றம்',
        'judge': 'நீதிபதி',
        'section': 'பிரிவு',
        'act': 'சட்டம்'
      }
    };
  }

  /**
   * Translate using Google Translate API
   */
  async _translateGoogle(text, sourceLang, targetLang) {
    const fetch = require('node-fetch');
    
    const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: text,
        source_language: sourceLang,
        target_language: targetLang,
        key: this.apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`Google Translate error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  }

  /**
   * Translate using Azure Translator
   */
  async _translateAzure(text, sourceLang, targetLang) {
    const fetch = require('node-fetch');
    
    const response = await fetch(
      `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=${sourceLang}&to=${targetLang}`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.apiKey,
          'Content-Type': 'application/xml'
        },
        body: `<string xmlns="http://schemas.microsoft.com/2003/10/Serialization/">${text}</string>`
      }
    );

    if (!response.ok) {
      throw new Error(`Azure Translator error: ${response.statusText}`);
    }

    const data = await response.json();
    return data[0].translations[0].text;
  }

  /**
   * Local translation (basic dictionary-based)
   */
  async _translateLocal(text, sourceLang, targetLang) {
    // This is a basic implementation - in production use proper ML models
    console.warn('Using basic local translation - consider using API for production');
    return text; // Return original for now
  }

  /**
   * Detect language from text
   */
  static detectLanguage(text) {
    // Detect by script/unicode ranges
    if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
    if (/[\u0980-\u09FF]/.test(text)) return 'bn'; // Bengali
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
    if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
    if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
    if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
    if (/[\u0600-\u06FF]/.test(text)) return 'ur'; // Urdu
    return 'en'; // Default to English
  }

  /**
   * Get supported languages list
   */
  getSupportedLanguages() {
    return Object.entries(this.supportedLanguages).map(([code, info]) => ({
      code,
      ...info
    }));
  }

  /**
   * Format response for language
   */
  formatForLanguage(response, language) {
    const formatting = {
      'en': { numberFormat: 'en-IN', dateFormat: 'DD/MM/YYYY' },
      'hi': { numberFormat: 'hi-IN', dateFormat: 'DD/MM/YYYY', direction: 'ltr' },
      'ur': { numberFormat: 'ur-IN', dateFormat: 'DD/MM/YYYY', direction: 'rtl' },
      'ta': { numberFormat: 'ta-IN', dateFormat: 'DD/MM/YYYY' },
      'te': { numberFormat: 'te-IN', dateFormat: 'DD/MM/YYYY' },
      'bn': { numberFormat: 'bn-IN', dateFormat: 'DD/MM/YYYY' },
      'kn': { numberFormat: 'kn-IN', dateFormat: 'DD/MM/YYYY' },
      'pa': { numberFormat: 'pa-IN', dateFormat: 'DD/MM/YYYY' },
      'ml': { numberFormat: 'ml-IN', dateFormat: 'DD/MM/YYYY' },
      'gu': { numberFormat: 'gu-IN', dateFormat: 'DD/MM/YYYY' },
      'mr': { numberFormat: 'mr-IN', dateFormat: 'DD/MM/YYYY' }
    };

    return {
      response,
      formatting: formatting[language] || formatting['en']
    };
  }

  /**
   * Translate legal response to language
   */
  async translateLegalResponse(response, targetLanguage, sourceLanguage = 'en') {
    try {
      const translated = await this.translate(response, targetLanguage, sourceLanguage);
      return this.formatForLanguage(translated, targetLanguage);
    } catch (error) {
      console.error('Error translating legal response:', error);
      return {
        response: response,
        error: 'Translation failed - returning original response',
        formatting: {}
      };
    }
  }
}

module.exports = MultilingualService;
