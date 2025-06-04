/**
 * Profile Detection Module for LinkedIn Insight V2.1
 * Detects when user is viewing their own LinkedIn profile vs. other profiles
 * Handles various LinkedIn URL formats and edge cases
 */

class ProfileDetector {
  constructor() {
    this.userProfileUrl = null;
    this.currentUrl = null;
    this.detectionConfidence = 'unknown'; // 'high', 'medium', 'low', 'unknown'
  }

  /**
   * Initialize the profile detector with user's LinkedIn URL from storage
   * @returns {Promise<boolean>} Success of initialization
   */
  async initialize() {
    try {
      const result = await chrome.storage.local.get(['userLinkedInUrl', 'appSettings']);
      
      if (result.userLinkedInUrl) {
        this.userProfileUrl = this.normalizeLinkedInUrl(result.userLinkedInUrl);
        console.log('ProfileDetector initialized with user URL:', this.userProfileUrl);
        return true;
      } else if (result.appSettings && result.appSettings.userLinkedInUrl) {
        this.userProfileUrl = this.normalizeLinkedInUrl(result.appSettings.userLinkedInUrl);
        console.log('ProfileDetector initialized with user URL from appSettings:', this.userProfileUrl);
        return true;
      } else {
        console.warn('ProfileDetector: No user LinkedIn URL found in storage');
        return false;
      }
    } catch (error) {
      console.error('ProfileDetector initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect if the current tab is showing the user's own profile
   * @param {string} currentUrl - The current tab URL
   * @returns {Object} Detection result with confidence level
   */
  detectOwnProfile(currentUrl) {
    if (!currentUrl) {
      return { isOwnProfile: false, confidence: 'unknown', reason: 'No URL provided' };
    }

    this.currentUrl = currentUrl;

    // Check if it's a LinkedIn profile URL at all
    if (!this.isLinkedInProfileUrl(currentUrl)) {
      return { isOwnProfile: false, confidence: 'high', reason: 'Not a LinkedIn profile URL' };
    }

    // If we don't have the user's profile URL, we can't detect
    if (!this.userProfileUrl) {
      return { isOwnProfile: false, confidence: 'unknown', reason: 'User profile URL not available' };
    }

    const normalizedCurrentUrl = this.normalizeLinkedInUrl(currentUrl);
    const normalizedUserUrl = this.userProfileUrl;

    console.log('Comparing URLs:', { current: normalizedCurrentUrl, user: normalizedUserUrl });

    // Direct URL match (highest confidence)
    if (normalizedCurrentUrl === normalizedUserUrl) {
      return { isOwnProfile: true, confidence: 'high', reason: 'Direct URL match' };
    }

    // Extract username and compare (medium confidence)
    const currentUsername = this.extractLinkedInUsername(normalizedCurrentUrl);
    const userUsername = this.extractLinkedInUsername(normalizedUserUrl);

    if (currentUsername && userUsername && currentUsername === userUsername) {
      return { isOwnProfile: true, confidence: 'medium', reason: 'Username match' };
    }

    // If we reach here, it's likely not the user's own profile
    return { isOwnProfile: false, confidence: 'high', reason: 'Different profile detected' };
  }

  /**
   * Check if URL is a LinkedIn profile URL
   * @param {string} url - URL to check
   * @returns {boolean} True if it's a LinkedIn profile URL
   */
  isLinkedInProfileUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    const linkedInProfilePatterns = [
      /^https?:\/\/(www\.)?linkedin\.com\/in\/[^\/\?]+/i,
      /^https?:\/\/(www\.)?linkedin\.com\/pub\/[^\/\?]+/i,
      /^https?:\/\/[a-z]{2}\.linkedin\.com\/in\/[^\/\?]+/i, // International domains
    ];

    return linkedInProfilePatterns.some(pattern => pattern.test(url));
  }

  /**
   * Normalize LinkedIn URL for consistent comparison
   * @param {string} url - LinkedIn URL to normalize
   * @returns {string} Normalized URL
   */
  normalizeLinkedInUrl(url) {
    if (!url) return '';
    
    let normalized = url.toLowerCase().trim();
    
    // Remove trailing slashes
    normalized = normalized.replace(/\/+$/, '');
    
    // Remove query parameters and fragments
    normalized = normalized.split('?')[0].split('#')[0];
    
    // Standardize domain (remove www, normalize to main domain)
    normalized = normalized.replace(/^https?:\/\/(www\.)?/, 'https://www.');
    normalized = normalized.replace(/^https:\/\/[a-z]{2}\.linkedin\.com/, 'https://www.linkedin.com');
    
    // Ensure proper format
    if (normalized.includes('/pub/')) {
      // Convert old pub format to in format if possible
      normalized = normalized.replace('/pub/', '/in/');
    }
    
    return normalized;
  }

  /**
   * Extract username from LinkedIn URL
   * @param {string} url - LinkedIn URL
   * @returns {string|null} Username or null if not found
   */
  extractLinkedInUsername(url) {
    if (!url) return null;
    
    const patterns = [
      /\/in\/([^\/\?]+)/i,
      /\/pub\/([^\/\?]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1].toLowerCase();
      }
    }
    
    return null;
  }

  /**
   * Get current detection status
   * @returns {Object} Current detection status
   */
  getStatus() {
    return {
      userProfileUrl: this.userProfileUrl,
      currentUrl: this.currentUrl,
      confidence: this.detectionConfidence,
      initialized: !!this.userProfileUrl
    };
  }
}

// Export for use in popup_core.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileDetector;
} else {
  window.ProfileDetector = ProfileDetector;
} 