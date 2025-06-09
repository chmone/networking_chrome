/**
 * Comprehensive Diagnostic and Logging Service
 * Provides detailed debugging capabilities for V3 implementation
 * CRITICAL: Essential for troubleshooting the new security and data pipeline
 */

class DiagnosticService {
  constructor() {
    this.logs = [];
    this.performance = {};
    this.diagnosticMode = false;
    this.maxLogs = 1000;

    this.LOG_LEVELS = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };

    this.LOG_CATEGORIES = {
      SECURITY: 'security',
      DATA_PIPELINE: 'data_pipeline',
      N8N_COMMUNICATION: 'n8n_communication',
      PROFILE_SCRAPING: 'profile_scraping',
      RATE_LIMITING: 'rate_limiting',
      STATE_MANAGEMENT: 'state_management',
      VALIDATION: 'validation',
      USER_INTERACTION: 'user_interaction',
      PERFORMANCE: 'performance',
      SYSTEM: 'system'
    };

    this.DIAGNOSTIC_CHECKS = {
      CONSENT_STATUS: 'consent_status',
      RATE_LIMITS: 'rate_limits',
      AUTH_STATUS: 'auth_status',
      DATA_FRESHNESS: 'data_freshness',
      N8N_CONNECTIVITY: 'n8n_connectivity',
      PROFILE_VALIDITY: 'profile_validity',
      STORAGE_HEALTH: 'storage_health',
      EXTENSION_HEALTH: 'extension_health'
    };

    // Initialize performance tracking
    this.initializePerformanceTracking();
  }

  /**
   * Initialize diagnostic service
   * @param {boolean} enableDiagnosticMode - Enable diagnostic mode
   * @returns {Promise<boolean>} Success status
   */
  async initialize(enableDiagnosticMode = false) {
    try {
      console.log('DiagnosticService: Initializing...');

      this.diagnosticMode = enableDiagnosticMode;

      // Load previous logs if any
      await this.loadLogs();

      // Set up error handlers
      this.setupErrorHandlers();

      // Log initialization
      this.log('DiagnosticService initialized successfully',
        this.LOG_LEVELS.INFO,
        this.LOG_CATEGORIES.SYSTEM);

      return true;
    } catch (error) {
      console.error('DiagnosticService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Log message with categorization and level
   * @param {string} message - Log message
   * @param {number} level - Log level
   * @param {string} category - Log category
   * @param {Object} data - Additional data
   */
  log(message, level = this.LOG_LEVELS.INFO, category = this.LOG_CATEGORIES.SYSTEM, data = null) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data: data ? this.sanitizeLogData(data) : null,
      stack: level >= this.LOG_LEVELS.ERROR ? new Error().stack : null
    };

    // Add to logs array
    this.logs.unshift(logEntry);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Console output in diagnostic mode or for errors
    if (this.diagnosticMode || level >= this.LOG_LEVELS.WARN) {
      const levelName = Object.keys(this.LOG_LEVELS)[level];
      const prefix = `[${levelName}] [${category}]`;

      switch (level) {
        case this.LOG_LEVELS.DEBUG:
        case this.LOG_LEVELS.INFO:
          console.log(prefix, message, data);
          break;
        case this.LOG_LEVELS.WARN:
          console.warn(prefix, message, data);
          break;
        case this.LOG_LEVELS.ERROR:
        case this.LOG_LEVELS.CRITICAL:
          console.error(prefix, message, data);
          break;
      }
    }

    // Emit log event
    this.emitLogEvent(logEntry);

    // Auto-save in diagnostic mode
    if (this.diagnosticMode) {
      this.saveLogs();
    }
  }

  /**
   * Log security event
   * @param {string} event - Security event type
   * @param {Object} details - Event details
   * @param {number} level - Log level
   */
  logSecurity(event, details = {}, level = this.LOG_LEVELS.INFO) {
    this.log(`Security Event: ${event}`, level, this.LOG_CATEGORIES.SECURITY, {
      event,
      details,
      timestamp: Date.now(),
      userAgent: navigator.userAgent
    });
  }

  /**
   * Log data pipeline event
   * @param {string} step - Pipeline step
   * @param {Object} data - Step data
   * @param {string} status - Step status
   */
  logDataPipeline(step, data = {}, status = 'info') {
    const level = status === 'error' ? this.LOG_LEVELS.ERROR :
      status === 'warning' ? this.LOG_LEVELS.WARN : this.LOG_LEVELS.INFO;

    this.log(`Data Pipeline: ${step}`, level, this.LOG_CATEGORIES.DATA_PIPELINE, {
      step,
      status,
      data: this.sanitizeLogData(data),
      timestamp: Date.now()
    });
  }

  /**
   * Log N8N communication event
   * @param {string} action - N8N action
   * @param {Object} details - Communication details
   * @param {string} status - Communication status
   */
  logN8NCommunication(action, details = {}, status = 'info') {
    const level = status === 'error' ? this.LOG_LEVELS.ERROR : this.LOG_LEVELS.INFO;

    this.log(`N8N Communication: ${action}`, level, this.LOG_CATEGORIES.N8N_COMMUNICATION, {
      action,
      status,
      details: this.sanitizeLogData(details),
      timestamp: Date.now()
    });
  }

  /**
   * Start performance measurement
   * @param {string} operation - Operation name
   * @returns {string} Performance ID
   */
  startPerformanceMeasurement(operation) {
    const perfId = `perf_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    this.performance[perfId] = {
      operation,
      startTime: performance.now(),
      startTimestamp: Date.now(),
      status: 'running'
    };

    this.log(`Performance measurement started: ${operation}`,
      this.LOG_LEVELS.DEBUG,
      this.LOG_CATEGORIES.PERFORMANCE,
      { perfId, operation });

    return perfId;
  }

  /**
   * End performance measurement
   * @param {string} perfId - Performance ID
   * @param {Object} additionalData - Additional measurement data
   */
  endPerformanceMeasurement(perfId, additionalData = {}) {
    if (!this.performance[perfId]) {
      this.log(`Performance measurement not found: ${perfId}`,
        this.LOG_LEVELS.WARN,
        this.LOG_CATEGORIES.PERFORMANCE);
      return;
    }

    const measurement = this.performance[perfId];
    measurement.endTime = performance.now();
    measurement.endTimestamp = Date.now();
    measurement.duration = measurement.endTime - measurement.startTime;
    measurement.status = 'completed';
    measurement.additionalData = additionalData;

    this.log(`Performance measurement completed: ${measurement.operation} (${measurement.duration.toFixed(2)}ms)`,
      this.LOG_LEVELS.INFO,
      this.LOG_CATEGORIES.PERFORMANCE,
      measurement);
  }

  /**
   * Run comprehensive diagnostic check
   * @returns {Promise<Object>} Diagnostic results
   */
  async runDiagnosticCheck() {
    console.log('DiagnosticService: Running comprehensive diagnostic check...');

    const diagnosticResults = {
      timestamp: Date.now(),
      overallHealth: 'unknown',
      checks: {},
      recommendations: [],
      criticalIssues: [],
      warnings: []
    };

    // Run all diagnostic checks
    for (const [checkName, checkKey] of Object.entries(this.DIAGNOSTIC_CHECKS)) {
      try {
        diagnosticResults.checks[checkKey] = await this.runSpecificCheck(checkKey);
      } catch (error) {
        diagnosticResults.checks[checkKey] = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };
        diagnosticResults.criticalIssues.push(`Diagnostic check failed: ${checkName}`);
      }
    }

    // Analyze results and determine overall health
    this.analyzeHealthStatus(diagnosticResults);

    // Log diagnostic results
    this.log('Comprehensive diagnostic check completed',
      this.LOG_LEVELS.INFO,
      this.LOG_CATEGORIES.SYSTEM,
      diagnosticResults);

    return diagnosticResults;
  }

  /**
   * Run specific diagnostic check
   * @param {string} checkType - Type of check to run
   * @returns {Promise<Object>} Check result
   */
  async runSpecificCheck(checkType) {
    const checkStart = performance.now();

    try {
      let result = {};

      switch (checkType) {
        case this.DIAGNOSTIC_CHECKS.CONSENT_STATUS:
          result = await this.checkConsentStatus();
          break;

        case this.DIAGNOSTIC_CHECKS.RATE_LIMITS:
          result = await this.checkRateLimits();
          break;

        case this.DIAGNOSTIC_CHECKS.AUTH_STATUS:
          result = await this.checkAuthStatus();
          break;

        case this.DIAGNOSTIC_CHECKS.DATA_FRESHNESS:
          result = await this.checkDataFreshness();
          break;

        case this.DIAGNOSTIC_CHECKS.N8N_CONNECTIVITY:
          result = await this.checkN8NConnectivity();
          break;

        case this.DIAGNOSTIC_CHECKS.PROFILE_VALIDITY:
          result = await this.checkProfileValidity();
          break;

        case this.DIAGNOSTIC_CHECKS.STORAGE_HEALTH:
          result = await this.checkStorageHealth();
          break;

        case this.DIAGNOSTIC_CHECKS.EXTENSION_HEALTH:
          result = await this.checkExtensionHealth();
          break;

        default:
          throw new Error(`Unknown diagnostic check: ${checkType}`);
      }

      result.duration = performance.now() - checkStart;
      result.timestamp = Date.now();

      return result;
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        duration: performance.now() - checkStart,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Check consent status
   * @returns {Promise<Object>} Consent check result
   */
  async checkConsentStatus() {
    if (!window.consentManager) {
      return { status: 'error', message: 'Consent manager not available' };
    }

    const consentStatus = await window.consentManager.getConsentStatus();
    const hasValidConsent = await window.consentManager.hasValidConsent();

    return {
      status: hasValidConsent ? 'healthy' : 'warning',
      hasValidConsent,
      consentDetails: consentStatus,
      message: hasValidConsent ? 'Valid consent exists' : 'Consent required'
    };
  }

  /**
   * Check rate limits
   * @returns {Promise<Object>} Rate limit check result
   */
  async checkRateLimits() {
    if (!window.rateLimiter) {
      return { status: 'error', message: 'Rate limiter not available' };
    }

    const userTier = await window.rateLimiter.getUserTier();
    const usageStats = await window.rateLimiter.getUsageStats(userTier);
    const limitCheck = await window.rateLimiter.checkLimit(userTier);

    const status = limitCheck.allowed ? 'healthy' : 'warning';

    return {
      status,
      userTier,
      usageStats,
      limitCheck,
      message: limitCheck.allowed ? 'Rate limits OK' : `Rate limit: ${limitCheck.reason}`
    };
  }

  /**
   * Check authentication status
   * @returns {Promise<Object>} Auth status check result
   */
  async checkAuthStatus() {
    if (!window.cryptoService) {
      return { status: 'error', message: 'Crypto service not available' };
    }

    const authStatus = await window.cryptoService.getAuthStatus();

    return {
      status: authStatus.initialized ? 'healthy' : 'error',
      authDetails: authStatus,
      message: authStatus.initialized ? 'Authentication ready' : 'Authentication not initialized'
    };
  }

  /**
   * Check data freshness
   * @returns {Promise<Object>} Data freshness check result
   */
  async checkDataFreshness() {
    if (!window.stateManager) {
      return { status: 'error', message: 'State manager not available' };
    }

    const freshness = await window.stateManager.validateDataFreshness();

    const issues = [];
    if (!freshness.user.fresh) issues.push('User profile stale');
    if (!freshness.target.fresh) issues.push('Target profile stale');

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      freshness,
      issues,
      message: issues.length === 0 ? 'Data freshness OK' : `Issues: ${issues.join(', ')}`
    };
  }

  /**
   * Check N8N connectivity
   * @returns {Promise<Object>} N8N connectivity check result
   */
  async checkN8NConnectivity() {
    if (!window.n8nService) {
      return { status: 'error', message: 'N8N service not available' };
    }

    try {
      const connectionTest = await window.n8nService.testConnection();

      return {
        status: connectionTest.success ? 'healthy' : 'error',
        connectionTest,
        message: connectionTest.success ? 'N8N connectivity OK' : 'N8N connection failed'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        message: 'N8N connection test failed'
      };
    }
  }

  /**
   * Check profile validity
   * @returns {Promise<Object>} Profile validity check result
   */
  async checkProfileValidity() {
    if (!window.stateManager || !window.dataValidators) {
      return { status: 'error', message: 'Required services not available' };
    }

    const userProfile = window.stateManager.getState('user.profile');
    const targetProfile = window.stateManager.getState('target.profile');

    const userValidation = userProfile ? window.dataValidators.validateUserProfile(userProfile) : null;
    const targetValidation = targetProfile ? window.dataValidators.validateTargetProfile(targetProfile) : null;

    const issues = [];
    if (!userValidation || !userValidation.valid) issues.push('Invalid user profile');
    if (targetProfile && (!targetValidation || !targetValidation.valid)) issues.push('Invalid target profile');

    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      userValidation,
      targetValidation,
      issues,
      message: issues.length === 0 ? 'Profile data valid' : `Issues: ${issues.join(', ')}`
    };
  }

  /**
   * Check storage health
   * @returns {Promise<Object>} Storage health check result
   */
  async checkStorageHealth() {
    try {
      // Test storage read/write
      const testKey = 'diagnostic_test';
      const testValue = { test: true, timestamp: Date.now() };

      await chrome.storage.local.set({ [testKey]: testValue });
      const retrieved = await chrome.storage.local.get(testKey);
      await chrome.storage.local.remove(testKey);

      const storageWorks = retrieved[testKey] && retrieved[testKey].test === true;

      // Get storage usage
      const bytesInUse = await chrome.storage.local.getBytesInUse();

      return {
        status: storageWorks ? 'healthy' : 'error',
        storageWorks,
        bytesInUse,
        message: storageWorks ? 'Storage healthy' : 'Storage read/write failed'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        message: 'Storage health check failed'
      };
    }
  }

  /**
   * Check extension health
   * @returns {Promise<Object>} Extension health check result
   */
  async checkExtensionHealth() {
    const issues = [];
    const details = {
      runtime: !!chrome.runtime,
      storage: !!chrome.storage,
      tabs: !!chrome.tabs,
      scripting: !!chrome.scripting
    };

    Object.entries(details).forEach(([api, available]) => {
      if (!available) issues.push(`Chrome ${api} API unavailable`);
    });

    return {
      status: issues.length === 0 ? 'healthy' : 'error',
      details,
      issues,
      message: issues.length === 0 ? 'Extension APIs healthy' : `Issues: ${issues.join(', ')}`
    };
  }

  /**
   * Analyze overall health status
   * @param {Object} diagnosticResults - Diagnostic results to analyze
   */
  analyzeHealthStatus(diagnosticResults) {
    const checks = Object.values(diagnosticResults.checks);
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    const errorCount = checks.filter(c => c.status === 'error').length;

    if (errorCount > 0) {
      diagnosticResults.overallHealth = 'critical';
      diagnosticResults.recommendations.push('Address critical errors before using the extension');
    } else if (warningCount > 2) {
      diagnosticResults.overallHealth = 'warning';
      diagnosticResults.recommendations.push('Several issues detected that may affect functionality');
    } else if (warningCount > 0) {
      diagnosticResults.overallHealth = 'good';
      diagnosticResults.recommendations.push('Minor issues detected, extension should work normally');
    } else {
      diagnosticResults.overallHealth = 'excellent';
      diagnosticResults.recommendations.push('All systems operating normally');
    }

    // Add specific recommendations
    if (errorCount > 0) {
      diagnosticResults.recommendations.push('Check console for detailed error messages');
    }
    if (warningCount > 0) {
      diagnosticResults.recommendations.push('Review warning details in diagnostic results');
    }
  }

  /**
   * Create diagnostic report
   * @returns {Promise<string>} Human-readable diagnostic report
   */
  async createDiagnosticReport() {
    const diagnosticResults = await this.runDiagnosticCheck();

    let report = `
=== LINKEDIN INSIGHT V3 DIAGNOSTIC REPORT ===
Generated: ${new Date(diagnosticResults.timestamp).toLocaleString()}
Overall Health: ${diagnosticResults.overallHealth.toUpperCase()}

`;

    // Add check results
    for (const [checkName, result] of Object.entries(diagnosticResults.checks)) {
      report += `${checkName.toUpperCase()}: ${result.status.toUpperCase()}`;
      if (result.message) report += ` - ${result.message}`;
      if (result.duration) report += ` (${result.duration.toFixed(2)}ms)`;
      report += '\n';
    }

    // Add recommendations
    if (diagnosticResults.recommendations.length > 0) {
      report += '\nRECOMMENDATIONS:\n';
      diagnosticResults.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    // Add recent errors
    const recentErrors = this.getRecentLogs(this.LOG_LEVELS.ERROR, 10);
    if (recentErrors.length > 0) {
      report += '\nRECENT ERRORS:\n';
      recentErrors.forEach(log => {
        report += `- ${new Date(log.timestamp).toLocaleString()}: ${log.message}\n`;
      });
    }

    return report;
  }

  /**
   * Get recent logs by level
   * @param {number} level - Minimum log level
   * @param {number} limit - Maximum number of logs
   * @returns {Array} Recent logs
   */
  getRecentLogs(level = this.LOG_LEVELS.INFO, limit = 50) {
    return this.logs
      .filter(log => log.level >= level)
      .slice(0, limit);
  }

  /**
   * Get logs by category
   * @param {string} category - Log category
   * @param {number} limit - Maximum number of logs
   * @returns {Array} Category logs
   */
  getLogsByCategory(category, limit = 50) {
    return this.logs
      .filter(log => log.category === category)
      .slice(0, limit);
  }

  /**
   * Export logs for debugging
   * @returns {Object} Exportable log data
   */
  exportLogs() {
    return {
      timestamp: Date.now(),
      version: '3.0',
      diagnosticMode: this.diagnosticMode,
      totalLogs: this.logs.length,
      logs: this.logs,
      performance: this.performance
    };
  }

  /**
   * Clear logs
   * @returns {Promise<boolean>} Success status
   */
  async clearLogs() {
    this.logs = [];
    this.performance = {};
    await this.saveLogs();
    this.log('Logs cleared', this.LOG_LEVELS.INFO, this.LOG_CATEGORIES.SYSTEM);
    return true;
  }

  /**
   * Enable/disable diagnostic mode
   * @param {boolean} enabled - Enable diagnostic mode
   */
  setDiagnosticMode(enabled) {
    this.diagnosticMode = enabled;
    this.log(`Diagnostic mode ${enabled ? 'enabled' : 'disabled'}`,
      this.LOG_LEVELS.INFO,
      this.LOG_CATEGORIES.SYSTEM);
  }

  // Private methods

  initializePerformanceTracking() {
    // Track overall extension performance
    if (typeof performance !== 'undefined') {
      this.performance.extensionStart = performance.now();
    }
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.log(`Global Error: ${event.message}`,
        this.LOG_LEVELS.ERROR,
        this.LOG_CATEGORIES.SYSTEM,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.log(`Unhandled Promise Rejection: ${event.reason}`,
        this.LOG_LEVELS.ERROR,
        this.LOG_CATEGORIES.SYSTEM,
        {
          reason: event.reason,
          stack: event.reason?.stack
        });
    });
  }

  sanitizeLogData(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive fields
    const sensitiveFields = ['password', 'secret', 'key', 'token', 'signature'];

    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;

      Object.keys(obj).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  emitLogEvent(logEntry) {
    // Emit to state manager if available
    if (window.stateManager) {
      window.stateManager.emit('diagnostic.log.added', logEntry);
    }
  }

  async loadLogs() {
    try {
      const result = await chrome.storage.local.get('diagnosticLogs');
      if (result.diagnosticLogs) {
        this.logs = result.diagnosticLogs.slice(0, this.maxLogs);
      }
    } catch (error) {
      console.warn('DiagnosticService: Failed to load logs:', error);
    }
  }

  async saveLogs() {
    try {
      await chrome.storage.local.set({
        diagnosticLogs: this.logs.slice(0, this.maxLogs)
      });
    } catch (error) {
      console.warn('DiagnosticService: Failed to save logs:', error);
    }
  }
}

// Export for use in other modules
window.DiagnosticService = DiagnosticService;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.diagnosticService = new DiagnosticService();
} 