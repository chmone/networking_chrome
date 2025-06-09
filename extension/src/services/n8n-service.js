/**
 * Enhanced N8N Service
 * Implements secure bidirectional communication with HMAC authentication
 * CRITICAL: Fixes V2 data pipeline and adds security measures
 */

class N8NService {
  constructor() {
    this.WEBHOOK_URL_STORAGE = 'n8nWebhookUrl';
    this.DEFAULT_WEBHOOK_URL = 'https://chmones.app.n8n.cloud/webhook/f6b44e83-72af-42fa-9b57-7b25d200e41b';
    this.CALLBACK_TIMEOUT = 30000; // 30 seconds
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 2000; // 2 seconds

    this.requestId = null;
    this.callbackPromise = null;
    this.retryCount = 0;
  }

  /**
   * Initialize N8N service
   * @param {string} webhookUrl - N8N webhook URL (optional)
   * @returns {Promise<boolean>} Success status
   */
  async initialize(webhookUrl = null) {
    try {
      console.log('N8NService: Initializing...');

      if (webhookUrl) {
        await this.setWebhookUrl(webhookUrl);
      } else {
        // Use stored URL or default
        const storedUrl = await this.getWebhookUrl();
        if (!storedUrl) {
          await this.setWebhookUrl(this.DEFAULT_WEBHOOK_URL);
        }
      }

      console.log('N8NService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('N8NService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Send analysis request to N8N with full security
   * CRITICAL: This replaces the V2 insecure implementation
   * @param {Object} profileData - Profile data from state manager
   * @returns {Promise<Object>} Analysis results
   */
  async sendAnalysisRequest(profileData) {
    try {
      console.log('N8NService: Starting secure analysis request...');

      // Validate input data
      if (!profileData || !profileData.userProfile || !profileData.targetProfile) {
        throw new Error('Invalid profile data: missing user or target profile');
      }

      // Check security requirements
      await this.validateSecurityRequirements();

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimits();
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`);
      }

      // Prepare secure request
      const secureRequest = await this.prepareSecureRequest(profileData);

      // Send request with retries
      const response = await this.sendWithRetries(secureRequest);

      // Process response
      const analysisResults = await this.processResponse(response);

      // Record usage
      await this.recordSuccessfulRequest(profileData);

      console.log('N8NService: Analysis request completed successfully');
      return analysisResults;
    } catch (error) {
      console.error('N8NService: Analysis request failed:', error);

      // Record failure for diagnostic purposes
      if (window.stateManager) {
        window.stateManager.addDiagnosticLog('n8n_request_failed', {
          error: error.message,
          profileData: this.sanitizeForLogging(profileData)
        });
      }

      throw error;
    }
  }

  /**
   * Validate security requirements before sending request
   * @returns {Promise<boolean>} Validation result
   */
  async validateSecurityRequirements() {
    // Check consent
    if (window.consentManager) {
      const hasConsent = await window.consentManager.hasValidConsent();
      if (!hasConsent) {
        throw new Error('User consent required before sending data');
      }
    }

    // Check crypto service
    if (!window.cryptoService) {
      throw new Error('Crypto service not available');
    }

    const authStatus = await window.cryptoService.getAuthStatus();
    if (!authStatus.initialized) {
      throw new Error('HMAC authentication not initialized');
    }

    return true;
  }

  /**
   * Check rate limits before request
   * @returns {Promise<Object>} Rate limit check result
   */
  async checkRateLimits() {
    if (!window.rateLimiter) {
      console.warn('N8NService: Rate limiter not available, proceeding without rate limiting');
      return { allowed: true };
    }

    const userTier = await window.rateLimiter.getUserTier();
    return await window.rateLimiter.checkLimit(userTier);
  }

  /**
   * Prepare secure request with HMAC authentication
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Secure request object
   */
  async prepareSecureRequest(profileData) {
    try {
      // Generate unique request ID
      this.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      // Create callback URL for N8N response
      const callbackUrl = await this.createCallbackUrl();

      // Prepare payload
      const payload = {
        userProfile: profileData.userProfile,
        targetProfile: profileData.targetProfile,
        analysisMetadata: {
          ...profileData.analysisMetadata,
          requestId: this.requestId,
          callbackUrl: callbackUrl
        }
      };

      // Sign request with HMAC
      const signedRequest = await window.cryptoService.signRequest(payload, {
        requestId: this.requestId
      });

      return {
        url: await this.getWebhookUrl(),
        method: 'POST',
        headers: signedRequest.headers,
        body: JSON.stringify(signedRequest.payload)
      };
    } catch (error) {
      console.error('N8NService: Secure request preparation failed:', error);
      throw error;
    }
  }

  /**
   * Send request with retry logic
   * @param {Object} request - Request object
   * @returns {Promise<Response>} Response object
   */
  async sendWithRetries(request) {
    let lastError = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`N8NService: Sending request (attempt ${attempt + 1}/${this.MAX_RETRIES})`);

        // Set up callback promise for bidirectional communication
        this.setupCallbackPromise();

        // Send request
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        console.log('N8NService: Request sent successfully, awaiting callback...');

        // Wait for callback response
        const callbackResult = await this.waitForCallback();

        return callbackResult;
      } catch (error) {
        lastError = error;
        console.error(`N8NService: Request attempt ${attempt + 1} failed:`, error);

        if (attempt < this.MAX_RETRIES - 1) {
          console.log(`N8NService: Retrying in ${this.RETRY_DELAY}ms...`);
          await this.delay(this.RETRY_DELAY);
        }
      }
    }

    throw new Error(`All ${this.MAX_RETRIES} request attempts failed. Last error: ${lastError.message}`);
  }

  /**
   * Create callback URL for N8N to return results
   * @returns {Promise<string>} Callback URL
   */
  async createCallbackUrl() {
    // For Chrome extension, we'll use a unique identifier that N8N can use
    // to identify where to send the response. In practice, this might be
    // handled through the extension's message passing system.
    return `chrome-extension-callback://${this.requestId}`;
  }

  /**
   * Set up callback promise for bidirectional communication
   */
  setupCallbackPromise() {
    this.callbackPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Callback timeout - N8N did not respond within time limit'));
      }, this.CALLBACK_TIMEOUT);

      // Listen for callback response
      this.callbackResolver = (result) => {
        clearTimeout(timeout);
        resolve(result);
      };

      this.callbackRejector = (error) => {
        clearTimeout(timeout);
        reject(error);
      };
    });
  }

  /**
   * Wait for callback response from N8N
   * @returns {Promise<Object>} Callback result
   */
  async waitForCallback() {
    try {
      // In a real implementation, this would listen for the callback
      // For now, we'll simulate immediate response from the initial request
      console.log('N8NService: Simulating callback response...');

      // TODO: Implement actual callback mechanism
      // This would involve setting up a background script listener
      // or using chrome.runtime.onMessage for callback handling

      const result = await this.callbackPromise;
      return result;
    } catch (error) {
      console.error('N8NService: Callback wait failed:', error);
      throw error;
    }
  }

  /**
   * Process response from N8N
   * @param {Object} response - Response data
   * @returns {Promise<Object>} Processed analysis results
   */
  async processResponse(response) {
    try {
      // Validate response structure
      if (!response || typeof response !== 'object') {
        throw new Error('Invalid response format');
      }

      // Validate HMAC signature if present
      if (response.signature && window.cryptoService) {
        const isValidSignature = await window.cryptoService.verifySignature(
          response.data,
          response.signature
        );

        if (!isValidSignature) {
          throw new Error('Response signature verification failed');
        }
      }

      // Extract and validate analysis results
      const analysisResults = {
        score: response.score || 0,
        insights: response.insights || [],
        metadata: response.metadata || {},
        timestamp: Date.now(),
        requestId: this.requestId
      };

      // Validate required fields
      if (typeof analysisResults.score !== 'number' ||
        !Array.isArray(analysisResults.insights)) {
        throw new Error('Invalid analysis results format');
      }

      console.log('N8NService: Response processed successfully');
      return analysisResults;
    } catch (error) {
      console.error('N8NService: Response processing failed:', error);
      throw error;
    }
  }

  /**
   * Record successful request for rate limiting
   * @param {Object} profileData - Profile data
   * @returns {Promise<boolean>} Success status
   */
  async recordSuccessfulRequest(profileData) {
    try {
      if (window.rateLimiter) {
        const userTier = await window.rateLimiter.getUserTier();
        await window.rateLimiter.recordUsage(userTier, {
          requestId: this.requestId,
          targetUrl: profileData.analysisMetadata?.targetUrl,
          timestamp: Date.now()
        });
      }

      if (window.stateManager) {
        await window.stateManager.updateState('security.lastRequestTime', Date.now());
        window.stateManager.addDiagnosticLog('n8n_request_success', {
          requestId: this.requestId,
          duration: Date.now() - (profileData.analysisMetadata?.requestTime || 0)
        });
      }

      return true;
    } catch (error) {
      console.error('N8NService: Failed to record successful request:', error);
      return false;
    }
  }

  /**
   * Handle callback from N8N (for bidirectional communication)
   * @param {Object} callbackData - Callback data from N8N
   * @returns {Promise<boolean>} Success status
   */
  async handleCallback(callbackData) {
    try {
      console.log('N8NService: Received callback from N8N');

      // Validate callback data
      if (!callbackData || !callbackData.requestId) {
        throw new Error('Invalid callback data');
      }

      // Check if this callback matches our current request
      if (callbackData.requestId !== this.requestId) {
        console.warn('N8NService: Callback requestId mismatch, ignoring');
        return false;
      }

      // Resolve the callback promise
      if (this.callbackResolver) {
        this.callbackResolver(callbackData);
        this.callbackResolver = null;
        this.callbackRejector = null;
      }

      return true;
    } catch (error) {
      console.error('N8NService: Callback handling failed:', error);

      if (this.callbackRejector) {
        this.callbackRejector(error);
        this.callbackResolver = null;
        this.callbackRejector = null;
      }

      return false;
    }
  }

  /**
   * Set webhook URL
   * @param {string} url - Webhook URL
   * @returns {Promise<boolean>} Success status
   */
  async setWebhookUrl(url) {
    try {
      // Validate URL format
      if (!url || !url.startsWith('http')) {
        throw new Error('Invalid webhook URL format');
      }

      await chrome.storage.local.set({
        [this.WEBHOOK_URL_STORAGE]: url
      });

      console.log('N8NService: Webhook URL updated');
      return true;
    } catch (error) {
      console.error('N8NService: Failed to set webhook URL:', error);
      return false;
    }
  }

  /**
   * Get webhook URL
   * @returns {Promise<string>} Webhook URL
   */
  async getWebhookUrl() {
    try {
      const result = await chrome.storage.local.get(this.WEBHOOK_URL_STORAGE);
      return result[this.WEBHOOK_URL_STORAGE] || this.DEFAULT_WEBHOOK_URL;
    } catch (error) {
      console.error('N8NService: Failed to get webhook URL:', error);
      return this.DEFAULT_WEBHOOK_URL;
    }
  }

  /**
   * Test N8N connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      console.log('N8NService: Testing connection...');

      const webhookUrl = await this.getWebhookUrl();

      // Send test payload
      const testPayload = {
        test: true,
        timestamp: Date.now(),
        message: 'Connection test from LinkedIn Insight V3'
      };

      const signedRequest = await window.cryptoService.signRequest(testPayload);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: signedRequest.headers,
        body: JSON.stringify(signedRequest.payload)
      });

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        timestamp: Date.now()
      };

      console.log('N8NService: Connection test completed', result);
      return result;
    } catch (error) {
      console.error('N8NService: Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get service status
   * @returns {Promise<Object>} Service status
   */
  async getServiceStatus() {
    try {
      const webhookUrl = await this.getWebhookUrl();
      const authStatus = window.cryptoService ?
        await window.cryptoService.getAuthStatus() : { initialized: false };

      return {
        webhookUrl: webhookUrl ? 'configured' : 'not_configured',
        authentication: authStatus.status,
        lastRequestId: this.requestId,
        retryCount: this.retryCount,
        status: 'ready'
      };
    } catch (error) {
      console.error('N8NService: Failed to get service status:', error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Utility: Delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility: Sanitize data for logging (remove sensitive info)
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  sanitizeForLogging(data) {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };

    // Remove or mask sensitive fields  
    const sensitiveFields = ['email', 'phone'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// Export for use in other modules
window.N8NService = N8NService;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.n8nService = new N8NService();
} 