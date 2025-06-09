/**
 * Rate Limiting System
 * Prevents LinkedIn rate limiting detection and enforces freemium model
 * CRITICAL: Required to avoid LinkedIn account suspension
 */

class RateLimiter {
  constructor() {
    this.limits = {
      free: {
        profilesPerDay: 50,
        requestDelay: 2000, // 2 seconds between requests
        batchLimit: 5,      // Max 5 profiles per batch
        resetTime: 24 * 60 * 60 * 1000, // 24 hours
        maxConsecutive: 3   // Max 3 consecutive requests
      },
      premium: {
        profilesPerDay: 500,
        requestDelay: 1000, // 1 second between requests
        batchLimit: 20,     // Max 20 profiles per batch
        resetTime: 24 * 60 * 60 * 1000,
        maxConsecutive: 10  // Max 10 consecutive requests
      },
      development: {
        profilesPerDay: 10000,
        requestDelay: 100,
        batchLimit: 100,
        resetTime: 24 * 60 * 60 * 1000,
        maxConsecutive: 50
      }
    };

    this.STORAGE_KEYS = {
      USAGE_DATA: 'rateLimitUsage',
      USER_TIER: 'userTier',
      LAST_REQUEST: 'lastRequestTime',
      CONSECUTIVE_COUNT: 'consecutiveRequests'
    };
  }

  /**
   * Check if request is allowed under current rate limits
   * @param {string} userTier - User tier (free, premium, development)
   * @returns {Promise<Object>} Rate limit check result
   */
  async checkLimit(userTier = 'free') {
    try {
      const today = this.getTodayKey();
      const limit = this.limits[userTier];

      if (!limit) {
        throw new Error(`Invalid user tier: ${userTier}`);
      }

      // Get current usage data
      const usageData = await this.getUsageData(today);
      const lastRequestTime = await this.getLastRequestTime();
      const consecutiveCount = await this.getConsecutiveCount();

      // Check daily limit
      if (usageData.count >= limit.profilesPerDay) {
        return {
          allowed: false,
          reason: 'daily_limit_exceeded',
          limit: limit.profilesPerDay,
          used: usageData.count,
          resetTime: usageData.resetTime,
          timeUntilReset: usageData.resetTime - Date.now()
        };
      }

      // Check request delay
      const timeSinceLastRequest = Date.now() - lastRequestTime;
      if (lastRequestTime > 0 && timeSinceLastRequest < limit.requestDelay) {
        return {
          allowed: false,
          reason: 'request_too_soon',
          delayRequired: limit.requestDelay,
          timeSinceLastRequest,
          waitTime: limit.requestDelay - timeSinceLastRequest
        };
      }

      // Check consecutive request limit
      if (consecutiveCount >= limit.maxConsecutive) {
        const cooldownPeriod = 60000; // 1 minute cooldown
        return {
          allowed: false,
          reason: 'consecutive_limit_exceeded',
          consecutiveCount,
          maxConsecutive: limit.maxConsecutive,
          cooldownRequired: cooldownPeriod
        };
      }

      // Request is allowed
      return {
        allowed: true,
        remaining: limit.profilesPerDay - usageData.count,
        resetTime: usageData.resetTime,
        currentTier: userTier
      };
    } catch (error) {
      console.error('RateLimiter: Error checking limit:', error);
      return { allowed: false, reason: 'error', error: error.message };
    }
  }

  /**
   * Record a successful request
   * @param {string} userTier - User tier
   * @param {Object} requestMetadata - Additional request data
   * @returns {Promise<boolean>} Success status
   */
  async recordUsage(userTier = 'free', requestMetadata = {}) {
    try {
      const today = this.getTodayKey();
      const usageData = await this.getUsageData(today);
      const consecutiveCount = await this.getConsecutiveCount();

      // Update usage count
      const newUsageData = {
        count: usageData.count + 1,
        lastReset: usageData.lastReset,
        resetTime: usageData.resetTime,
        requests: [
          ...(usageData.requests || []).slice(-50), // Keep last 50 requests
          {
            timestamp: Date.now(),
            userTier,
            metadata: requestMetadata
          }
        ]
      };

      // Update consecutive count
      const newConsecutiveCount = consecutiveCount + 1;

      // Store updated data
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.USAGE_DATA]: {
          [today]: newUsageData
        },
        [this.STORAGE_KEYS.LAST_REQUEST]: Date.now(),
        [this.STORAGE_KEYS.CONSECUTIVE_COUNT]: newConsecutiveCount
      });

      console.log(`RateLimiter: Usage recorded - ${newUsageData.count}/${this.limits[userTier].profilesPerDay} today`);
      return true;
    } catch (error) {
      console.error('RateLimiter: Error recording usage:', error);
      return false;
    }
  }

  /**
   * Reset consecutive request counter (call after user takes a break)
   * @returns {Promise<boolean>} Success status
   */
  async resetConsecutiveCount() {
    try {
      await chrome.storage.local.set({
        [this.STORAGE_KEYS.CONSECUTIVE_COUNT]: 0
      });
      console.log('RateLimiter: Consecutive count reset');
      return true;
    } catch (error) {
      console.error('RateLimiter: Error resetting consecutive count:', error);
      return false;
    }
  }

  /**
   * Get current usage statistics
   * @param {string} userTier - User tier
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(userTier = 'free') {
    try {
      const today = this.getTodayKey();
      const usageData = await this.getUsageData(today);
      const limit = this.limits[userTier];
      const consecutiveCount = await this.getConsecutiveCount();
      const lastRequestTime = await this.getLastRequestTime();

      return {
        daily: {
          used: usageData.count,
          limit: limit.profilesPerDay,
          remaining: Math.max(0, limit.profilesPerDay - usageData.count),
          percentage: Math.round((usageData.count / limit.profilesPerDay) * 100)
        },
        consecutive: {
          current: consecutiveCount,
          limit: limit.maxConsecutive,
          remaining: Math.max(0, limit.maxConsecutive - consecutiveCount)
        },
        timing: {
          lastRequest: lastRequestTime,
          timeSinceLastRequest: lastRequestTime > 0 ? Date.now() - lastRequestTime : null,
          minimumDelay: limit.requestDelay
        },
        resetInfo: {
          resetTime: usageData.resetTime,
          timeUntilReset: usageData.resetTime - Date.now(),
          resetDate: new Date(usageData.resetTime).toLocaleString()
        },
        tier: userTier
      };
    } catch (error) {
      console.error('RateLimiter: Error getting usage stats:', error);
      return null;
    }
  }

  /**
   * Upgrade user tier
   * @param {string} newTier - New user tier
   * @returns {Promise<boolean>} Success status
   */
  async upgradeUserTier(newTier) {
    try {
      if (!this.limits[newTier]) {
        throw new Error(`Invalid tier: ${newTier}`);
      }

      await chrome.storage.local.set({
        [this.STORAGE_KEYS.USER_TIER]: newTier
      });

      console.log(`RateLimiter: User tier upgraded to ${newTier}`);
      return true;
    } catch (error) {
      console.error('RateLimiter: Error upgrading tier:', error);
      return false;
    }
  }

  /**
   * Get current user tier
   * @returns {Promise<string>} User tier
   */
  async getUserTier() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.USER_TIER);
      return result[this.STORAGE_KEYS.USER_TIER] || 'free';
    } catch (error) {
      console.error('RateLimiter: Error getting user tier:', error);
      return 'free';
    }
  }

  /**
   * Force reset daily limits (admin function)
   * @returns {Promise<boolean>} Success status
   */
  async forceResetLimits() {
    try {
      const today = this.getTodayKey();
      await chrome.storage.local.remove([
        this.STORAGE_KEYS.USAGE_DATA,
        this.STORAGE_KEYS.CONSECUTIVE_COUNT,
        this.STORAGE_KEYS.LAST_REQUEST
      ]);

      console.log('RateLimiter: Limits force reset');
      return true;
    } catch (error) {
      console.error('RateLimiter: Error force resetting limits:', error);
      return false;
    }
  }

  /**
   * Get today's date key for storage
   * @returns {string} Today's date key
   */
  getTodayKey() {
    return new Date().toDateString();
  }

  /**
   * Get usage data for a specific day
   * @param {string} dateKey - Date key
   * @returns {Promise<Object>} Usage data
   */
  async getUsageData(dateKey) {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.USAGE_DATA);
      const allUsageData = result[this.STORAGE_KEYS.USAGE_DATA] || {};

      if (!allUsageData[dateKey]) {
        const resetTime = this.getNextResetTime();
        allUsageData[dateKey] = {
          count: 0,
          lastReset: Date.now(),
          resetTime,
          requests: []
        };
      }

      // Check if reset is needed
      const usageData = allUsageData[dateKey];
      if (Date.now() >= usageData.resetTime) {
        usageData.count = 0;
        usageData.lastReset = Date.now();
        usageData.resetTime = this.getNextResetTime();
        usageData.requests = [];
      }

      return usageData;
    } catch (error) {
      console.error('RateLimiter: Error getting usage data:', error);
      const resetTime = this.getNextResetTime();
      return {
        count: 0,
        lastReset: Date.now(),
        resetTime,
        requests: []
      };
    }
  }

  /**
   * Get last request timestamp
   * @returns {Promise<number>} Last request timestamp
   */
  async getLastRequestTime() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.LAST_REQUEST);
      return result[this.STORAGE_KEYS.LAST_REQUEST] || 0;
    } catch (error) {
      console.error('RateLimiter: Error getting last request time:', error);
      return 0;
    }
  }

  /**
   * Get consecutive request count
   * @returns {Promise<number>} Consecutive request count
   */
  async getConsecutiveCount() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEYS.CONSECUTIVE_COUNT);
      return result[this.STORAGE_KEYS.CONSECUTIVE_COUNT] || 0;
    } catch (error) {
      console.error('RateLimiter: Error getting consecutive count:', error);
      return 0;
    }
  }

  /**
   * Get next reset time (midnight UTC)
   * @returns {number} Next reset timestamp
   */
  getNextResetTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Create rate limit UI warning
   * @param {Object} limitResult - Rate limit check result
   * @returns {HTMLElement} Warning element
   */
  createRateLimitWarning(limitResult) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 10px 0;
      border-radius: 4px; color: #856404; font-family: Arial, sans-serif;
    `;

    let message = '';
    switch (limitResult.reason) {
      case 'daily_limit_exceeded':
        message = `Daily limit reached (${limitResult.used}/${limitResult.limit}). Resets in ${Math.ceil(limitResult.timeUntilReset / (1000 * 60 * 60))} hours.`;
        break;
      case 'request_too_soon':
        message = `Please wait ${Math.ceil(limitResult.waitTime / 1000)} seconds before next request.`;
        break;
      case 'consecutive_limit_exceeded':
        message = `Take a break! Maximum consecutive requests reached. Wait 1 minute before continuing.`;
        break;
      default:
        message = 'Rate limit exceeded. Please try again later.';
    }

    warning.innerHTML = `
      <strong>⚠️ Rate Limit</strong><br>
      ${message}
    `;

    return warning;
  }
}

// Export for use in other modules
window.RateLimiter = RateLimiter;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.rateLimiter = new RateLimiter();
} 