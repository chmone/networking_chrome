/**
 * Centralized State Management System
 * Prevents data inconsistencies and manages the complete application state
 * CRITICAL: Fixes V2 issue where stale user profile data is sent to N8N
 */

class StateManager {
  constructor() {
    this.state = {
      analysis: {
        status: 'idle', // 'idle', 'scraping', 'analyzing', 'complete', 'error'
        progress: 0,
        currentStep: null,
        results: null,
        error: null,
        startTime: null,
        endTime: null
      },
      user: {
        profile: null,
        profileFreshness: null, // Timestamp when profile was last scraped
        preferences: {},
        tier: 'free', // 'free', 'premium', 'development'
        consent: false,
        consentVersion: null
      },
      target: {
        profile: null,
        profileFreshness: null,
        url: null,
        analysisResults: null
      },
      security: {
        rateLimitStatus: null,
        authStatus: null,
        lastRequestTime: null
      },
      diagnostic: {
        enabled: false,
        logs: [],
        performance: {},
        debugData: {}
      },
      ui: {
        currentView: 'loading',
        modals: [],
        notifications: []
      }
    };

    this.listeners = new Map();
    this.persistence = new StatePersistence();
    this.validator = new StateValidator();

    // Data freshness thresholds
    this.FRESHNESS_THRESHOLDS = {
      userProfile: 24 * 60 * 60 * 1000, // 24 hours
      targetProfile: 60 * 60 * 1000,    // 1 hour
      analysisResults: 30 * 60 * 1000   // 30 minutes
    };
  }

  /**
   * Initialize state manager and load persisted data
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log('StateManager: Initializing...');

      // Load persisted state
      const persistedState = await this.persistence.loadState();
      if (persistedState) {
        this.mergeState(persistedState);
      }

      // Validate data freshness
      await this.validateDataFreshness();

      // Initialize security status
      await this.updateSecurityStatus();

      console.log('StateManager: Initialized successfully');
      return true;
    } catch (error) {
      console.error('StateManager: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Subscribe to state changes
   * @param {string} event - Event name or state path
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => this.listeners.get(event).delete(callback);
  }

  /**
   * Emit state change event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`StateManager: Listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Update state at specified path
   * @param {string} path - State path (e.g., 'user.profile')
   * @param {*} value - New value
   * @param {Object} options - Update options
   * @returns {Promise<boolean>} Success status
   */
  async updateState(path, value, options = {}) {
    try {
      const oldValue = this.getState(path);
      this.setState(path, value);

      // Emit change event
      this.emit(`state.${path}`, { oldValue, newValue: value, path });
      this.emit('state.changed', { path, oldValue, newValue: value });

      // Persist if required
      if (options.persist !== false) {
        await this.persistence.saveState(this.state);
      }

      // Log if diagnostic mode is enabled
      if (this.state.diagnostic.enabled) {
        this.addDiagnosticLog('state_update', { path, oldValue, newValue: value });
      }

      return true;
    } catch (error) {
      console.error('StateManager: Update failed:', error);
      return false;
    }
  }

  /**
   * Get state value at path
   * @param {string} path - State path
   * @returns {*} State value
   */
  getState(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.state);
  }

  /**
   * Set state value at path
   * @param {string} path - State path
   * @param {*} value - New value
   */
  setState(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.state);

    target[lastKey] = value;
  }

  /**
   * Update user profile with freshness validation
   * CRITICAL: This fixes the V2 issue of stale user data
   * @param {Object} profileData - User profile data
   * @param {boolean} force - Force update even if data seems fresh
   * @returns {Promise<boolean>} Success status
   */
  async updateUserProfile(profileData, force = false) {
    try {
      // Validate profile data
      if (!this.validator.validateUserProfile(profileData)) {
        throw new Error('Invalid user profile data');
      }

      const now = Date.now();
      const currentFreshness = this.getState('user.profileFreshness');

      // Check if we need to update (force or data is stale)
      if (!force && currentFreshness &&
        (now - currentFreshness) < this.FRESHNESS_THRESHOLDS.userProfile) {
        console.log('StateManager: User profile is still fresh, skipping update');
        return true;
      }

      // Assign avatar before storing user profile
      if (window.avatarManager) {
        window.avatarManager.assignAvatarToProfile(profileData, 'user');
      }

      // Update profile and freshness timestamp
      await this.updateState('user.profile', profileData);
      await this.updateState('user.profileFreshness', now);

      // Clear any cached analysis results (user profile changed)
      await this.updateState('target.analysisResults', null);

      console.log('StateManager: User profile updated successfully');
      this.emit('user.profile.updated', profileData);

      return true;
    } catch (error) {
      console.error('StateManager: User profile update failed:', error);
      await this.updateState('analysis.error', {
        type: 'user_profile_update_failed',
        message: error.message,
        timestamp: Date.now()
      });
      return false;
    }
  }

  /**
   * Update target profile with validation
   * @param {Object} profileData - Target profile data
   * @param {string} profileUrl - Profile URL
   * @returns {Promise<boolean>} Success status
   */
  async updateTargetProfile(profileData, profileUrl) {
    try {
      // Validate profile data
      if (!this.validator.validateTargetProfile(profileData)) {
        throw new Error('Invalid target profile data');
      }

      const now = Date.now();

      // Assign avatar before storing target profile
      if (window.avatarManager) {
        window.avatarManager.assignAvatarToProfile(profileData, 'target');
      }

      // Update target profile data
      await this.updateState('target.profile', profileData);
      await this.updateState('target.profileFreshness', now);
      await this.updateState('target.url', profileUrl);

      console.log('StateManager: Target profile updated successfully');
      this.emit('target.profile.updated', { profileData, profileUrl });

      return true;
    } catch (error) {
      console.error('StateManager: Target profile update failed:', error);
      await this.updateState('analysis.error', {
        type: 'target_profile_update_failed',
        message: error.message,
        timestamp: Date.now()
      });
      return false;
    }
  }

  /**
   * Get fresh user profile data (re-scrape if necessary)
   * CRITICAL: This ensures we never send stale data to N8N
   * @param {boolean} forceFresh - Force fresh scraping
   * @returns {Promise<Object|null>} Fresh user profile data
   */
  async getFreshUserProfile(forceFresh = false) {
    try {
      const currentProfile = this.getState('user.profile');
      const profileFreshness = this.getState('user.profileFreshness');
      const now = Date.now();

      // Check if current profile is fresh enough
      if (!forceFresh && currentProfile && profileFreshness &&
        (now - profileFreshness) < this.FRESHNESS_THRESHOLDS.userProfile) {
        console.log('StateManager: Using cached user profile (still fresh)');
        return currentProfile;
      }

      console.log('StateManager: User profile stale or missing, need fresh data');

      // Emit event to trigger fresh scraping
      this.emit('user.profile.refresh_required', {
        reason: forceFresh ? 'force_refresh' : 'stale_data',
        lastFreshness: profileFreshness
      });

      // Return current profile for now (UI will handle refresh)
      return currentProfile;
    } catch (error) {
      console.error('StateManager: Error getting fresh user profile:', error);
      return null;
    }
  }

  /**
   * Prepare data for N8N transmission
   * CRITICAL: This is the final validation before sending to N8N
   * @returns {Promise<Object|null>} Validated data for N8N
   */
  async prepareN8NData() {
    try {
      const userProfile = await this.getFreshUserProfile();
      const targetProfile = this.getState('target.profile');

      // Validate both profiles exist and are valid
      if (!userProfile) {
        throw new Error('User profile is missing or invalid');
      }

      if (!targetProfile) {
        throw new Error('Target profile is missing or invalid');
      }

      // Validate data freshness
      const userFreshness = this.getState('user.profileFreshness');
      const targetFreshness = this.getState('target.profileFreshness');
      const now = Date.now();

      if (!userFreshness || (now - userFreshness) > this.FRESHNESS_THRESHOLDS.userProfile) {
        throw new Error('User profile data is too stale');
      }

      if (!targetFreshness || (now - targetFreshness) > this.FRESHNESS_THRESHOLDS.targetProfile) {
        throw new Error('Target profile data is too stale');
      }

      // Create N8N payload with metadata
      const n8nData = {
        userProfile: {
          ...userProfile,
          dataFreshness: userFreshness,
          profileSource: 'linkedin_scraper_v3'
        },
        targetProfile: {
          ...targetProfile,
          dataFreshness: targetFreshness,
          profileSource: 'linkedin_scraper_v3'
        },
        analysisMetadata: {
          requestTime: now,
          userTier: this.getState('user.tier'),
          analysisType: 'networking_compatibility',
          version: '3.0'
        }
      };

      // Final validation
      if (!this.validator.validateN8NPayload(n8nData)) {
        throw new Error('N8N payload validation failed');
      }

      console.log('StateManager: N8N data prepared and validated');
      return n8nData;
    } catch (error) {
      console.error('StateManager: N8N data preparation failed:', error);
      await this.updateState('analysis.error', {
        type: 'n8n_data_preparation_failed',
        message: error.message,
        timestamp: Date.now()
      });
      return null;
    }
  }

  /**
   * Update analysis state
   * @param {Object} analysisData - Analysis state data
   * @returns {Promise<boolean>} Success status
   */
  async updateAnalysisState(analysisData) {
    try {
      const validStates = ['idle', 'scraping', 'analyzing', 'complete', 'error'];

      if (analysisData.status && !validStates.includes(analysisData.status)) {
        throw new Error(`Invalid analysis status: ${analysisData.status}`);
      }

      // Update analysis state
      for (const [key, value] of Object.entries(analysisData)) {
        await this.updateState(`analysis.${key}`, value);
      }

      this.emit('analysis.state.updated', analysisData);
      return true;
    } catch (error) {
      console.error('StateManager: Analysis state update failed:', error);
      return false;
    }
  }

  /**
   * Validate data freshness for all profiles
   * @returns {Promise<Object>} Freshness validation result
   */
  async validateDataFreshness() {
    try {
      const now = Date.now();
      const userFreshness = this.getState('user.profileFreshness');
      const targetFreshness = this.getState('target.profileFreshness');

      const validation = {
        user: {
          fresh: userFreshness && (now - userFreshness) < this.FRESHNESS_THRESHOLDS.userProfile,
          age: userFreshness ? now - userFreshness : null,
          threshold: this.FRESHNESS_THRESHOLDS.userProfile
        },
        target: {
          fresh: targetFreshness && (now - targetFreshness) < this.FRESHNESS_THRESHOLDS.targetProfile,
          age: targetFreshness ? now - targetFreshness : null,
          threshold: this.FRESHNESS_THRESHOLDS.targetProfile
        }
      };

      await this.updateState('diagnostic.dataFreshness', validation);
      return validation;
    } catch (error) {
      console.error('StateManager: Data freshness validation failed:', error);
      return null;
    }
  }

  /**
   * Update security status
   * @returns {Promise<boolean>} Success status
   */
  async updateSecurityStatus() {
    try {
      // Get consent status
      if (window.consentManager) {
        const consentStatus = await window.consentManager.getConsentStatus();
        await this.updateState('user.consent', consentStatus.granted);
        await this.updateState('user.consentVersion', consentStatus.version);
      }

      // Get rate limit status
      if (window.rateLimiter) {
        const userTier = await window.rateLimiter.getUserTier();
        const usageStats = await window.rateLimiter.getUsageStats(userTier);
        await this.updateState('user.tier', userTier);
        await this.updateState('security.rateLimitStatus', usageStats);
      }

      // Get auth status
      if (window.cryptoService) {
        const authStatus = await window.cryptoService.getAuthStatus();
        await this.updateState('security.authStatus', authStatus);
      }

      return true;
    } catch (error) {
      console.error('StateManager: Security status update failed:', error);
      return false;
    }
  }

  /**
   * Add diagnostic log entry
   * @param {string} type - Log type
   * @param {Object} data - Log data
   */
  addDiagnosticLog(type, data) {
    if (this.state.diagnostic.enabled) {
      const logEntry = {
        type,
        data,
        timestamp: Date.now(),
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
      };

      const logs = this.getState('diagnostic.logs') || [];
      logs.push(logEntry);

      // Keep only last 100 log entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }

      this.setState('diagnostic.logs', logs);
      this.emit('diagnostic.log.added', logEntry);
    }
  }

  /**
   * Enable diagnostic mode
   * @param {boolean} enabled - Enable/disable diagnostic mode
   */
  async enableDiagnosticMode(enabled = true) {
    await this.updateState('diagnostic.enabled', enabled);
    console.log(`StateManager: Diagnostic mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current state summary
   * @returns {Object} State summary
   */
  getStateSummary() {
    return {
      analysis: this.getState('analysis.status'),
      userProfile: !!this.getState('user.profile'),
      targetProfile: !!this.getState('target.profile'),
      consent: this.getState('user.consent'),
      tier: this.getState('user.tier'),
      diagnostic: this.getState('diagnostic.enabled')
    };
  }

  /**
   * Merge state from external source
   * @param {Object} externalState - External state to merge
   */
  mergeState(externalState) {
    // Safely merge state without overwriting critical runtime data
    const safePaths = [
      'user.profile', 'user.profileFreshness', 'user.preferences',
      'user.tier', 'user.consent', 'user.consentVersion',
      'target.profile', 'target.profileFreshness', 'target.url'
    ];

    safePaths.forEach(path => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], externalState);
      if (value !== undefined) {
        this.setState(path, value);
      }
    });
  }
}

/**
 * State Persistence Helper
 */
class StatePersistence {
  constructor() {
    this.STORAGE_KEY = 'appState';
  }

  async saveState(state) {
    try {
      // Only persist certain parts of state
      const persistableState = {
        user: state.user,
        target: state.target,
        diagnostic: { enabled: state.diagnostic.enabled }
      };

      await chrome.storage.local.set({
        [this.STORAGE_KEY]: persistableState
      });
      return true;
    } catch (error) {
      console.error('StatePersistence: Save failed:', error);
      return false;
    }
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || null;
    } catch (error) {
      console.error('StatePersistence: Load failed:', error);
      return null;
    }
  }
}

/**
 * State Validator
 */
class StateValidator {
  validateUserProfile(profile) {
    return profile &&
      typeof profile === 'object' &&
      profile.name &&
      profile.headline;
  }

  validateTargetProfile(profile) {
    return profile &&
      typeof profile === 'object' &&
      profile.name &&
      profile.headline;
  }

  validateN8NPayload(payload) {
    return payload &&
      payload.userProfile &&
      payload.targetProfile &&
      payload.analysisMetadata &&
      this.validateUserProfile(payload.userProfile) &&
      this.validateTargetProfile(payload.targetProfile);
  }
}

// Export for use in other modules
window.StateManager = StateManager;
window.StatePersistence = StatePersistence;
window.StateValidator = StateValidator;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.stateManager = new StateManager();
} 