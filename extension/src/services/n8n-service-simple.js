/**
 * Simplified N8N Service - Standard Request/Response
 * Fixes the overcomplicated callback system with simple POST/response
 */

class SimpleN8NService {
  constructor() {
    this.WEBHOOK_URL_STORAGE = 'n8nWebhookUrl';
    this.DEFAULT_WEBHOOK_URL = 'https://chmones.app.n8n.cloud/webhook/f6b44e83-72af-42fa-9b57-7b25d200e41b';
    this.TIMEOUT = 30000; // 30 seconds
    this.MAX_RETRIES = 3;
    this.RETRY_DELAY = 2000; // 2 seconds
  }

  /**
   * Initialize N8N service
   */
  async initialize() {
    try {
      console.log('SimpleN8NService: Initializing...');

      // Get or set default webhook URL
      const storedUrl = await this.getWebhookUrl();
      if (!storedUrl) {
        await this.setWebhookUrl(this.DEFAULT_WEBHOOK_URL);
      }

      console.log('SimpleN8NService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('SimpleN8NService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Send analysis request to N8N and get response
   * ENHANCED: Handle both sync and async N8N responses with proper waiting
   */
  async sendAnalysisRequest(profileData) {
    try {
      console.log('SimpleN8NService: Starting analysis request...');

      // Validate input data
      if (!profileData || !profileData.userProfile || !profileData.targetProfile) {
        throw new Error('Invalid profile data: missing user or target profile');
      }

      // Prepare payload with unique request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const payload = {
        userProfile: profileData.userProfile,
        targetProfile: profileData.targetProfile,
        timestamp: Date.now(),
        requestId: requestId
      };

      console.log('SimpleN8NService: Sending payload to N8N:', payload);

      // Get webhook URL and send request
      const webhookUrl = await this.getWebhookUrl();
      const response = await this.sendWithRetries(webhookUrl, payload);

      console.log('SimpleN8NService: Received initial response from N8N:', response);

      // Check if synchronous response (has score) or async (has requestId)
      if (response.score !== undefined) {
        // N8N returned a score - treat as synchronous complete response
        console.log('SimpleN8NService: Response with score detected, treating as complete');
        return this.validateAndFormatResponse(response);
      } else if (response.requestId && !response.score) {
        // Asynchronous processing - wait for real completion
        console.log('SimpleN8NService: Asynchronous response detected, waiting for completion...');
        const results = await this.waitForN8NCompletion(requestId);
        return this.validateAndFormatResponse(results);
      } else {
        // Treat as synchronous but log potential issues
        console.log('SimpleN8NService: Uncertain response format, treating as complete');
        return this.validateAndFormatResponse(response);
      }

    } catch (error) {
      console.error('SimpleN8NService: Analysis request failed:', error);
      throw error;
    }
  }

  /**
   * Send request with retry logic
   */
  async sendWithRetries(url, payload) {
    let lastError = null;

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        console.log(`SimpleN8NService: Sending request (attempt ${attempt + 1}/${this.MAX_RETRIES})`);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get response data
        const responseData = await response.json();
        console.log('SimpleN8NService: REAL N8N RESPONSE:', JSON.stringify(responseData, null, 2));
        console.log('SimpleN8NService: Response structure analysis:');
        console.log('- Score value:', responseData.score, typeof responseData.score);
        console.log('- Insights:', responseData.insights, Array.isArray(responseData.insights));
        console.log('- Request ID:', responseData.requestId);
        console.log('- Response keys:', Object.keys(responseData));
        return responseData;

      } catch (error) {
        lastError = error;
        console.error(`SimpleN8NService: Request attempt ${attempt + 1} failed:`, error);

        if (attempt < this.MAX_RETRIES - 1) {
          console.log(`SimpleN8NService: Retrying in ${this.RETRY_DELAY}ms...`);
          await this.delay(this.RETRY_DELAY);
        }
      }
    }

    throw new Error(`All ${this.MAX_RETRIES} request attempts failed. Last error: ${lastError.message}`);
  }

  /**
   * Validate and format N8N response
   */
  validateAndFormatResponse(response) {
    // Check if response has expected structure
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response format from N8N');
    }

    // Handle N8N array response format: [{"output": {"score": 72, "insights": [...]}}]
    let dataObject = response;
    if (Array.isArray(response) && response.length > 0 && response[0].output) {
      console.log('SimpleN8NService: Detected N8N array format, extracting from output');
      dataObject = response[0].output;
    }

    // Extract score and insights with enhanced validation
    let score = 0;
    if (typeof dataObject.score === 'number') {
      score = dataObject.score;
    } else if (typeof dataObject.score === 'string' && !isNaN(dataObject.score)) {
      score = parseInt(dataObject.score);
      console.log('SimpleN8NService: Converted string score to number:', score);
    } else {
      console.warn('SimpleN8NService: No valid score found in response:', dataObject.score);
    }

    const insights = Array.isArray(dataObject.insights) ? dataObject.insights : [];
    console.log('SimpleN8NService: Extracted score:', score, 'insights:', insights.length);

    // Detect placeholder insights (indicates integration issue)
    if (insights.length > 0 && insights[0].includes("Strong industry alignment detected")) {
      console.warn('SimpleN8NService: Placeholder insights detected - N8N integration may need attention');
    }

    // Validate we have real insights
    if (insights.length === 0) {
      console.warn('SimpleN8NService: N8N returned no insights, using fallback');
      insights.push("Analysis completed - detailed insights unavailable");
    }

    // Validate score range
    if (score < 0 || score > 100) {
      console.warn('N8N returned score outside valid range (0-100):', score);
    }

    // Format final results
    const results = {
      score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
      insights: insights,
      metadata: dataObject.metadata || {},
      timestamp: Date.now(),
      requestId: dataObject.requestId || response.requestId || 'unknown'
    };

    console.log('SimpleN8NService: Formatted results with real insights:', results);
    return results;
  }

  /**
   * Wait for N8N processing completion using polling
   * @param {string} requestId - Request identifier from initial response
   * @param {number} timeout - Maximum wait time (default 30s)
   * @returns {Promise<Object>} Final analysis results
   */
  async waitForN8NCompletion(requestId, timeout = 30000) {
    const startTime = Date.now();
    const pollInterval = 2000; // Poll every 2 seconds

    console.log(`SimpleN8NService: Waiting for completion of request ${requestId}...`);

    while (Date.now() - startTime < timeout) {
      try {
        // Wait before polling (simulate processing time)
        await this.delay(pollInterval);

        // Try to poll N8N status endpoint for real results
        const elapsed = Date.now() - startTime;
        const statusResult = await this.pollN8NStatus(requestId);

        if (statusResult && statusResult.completed) {
          console.log('SimpleN8NService: Real N8N processing completed');
          return statusResult.results;
        }

        // If no real polling available and timeout reached, throw error
        if (elapsed >= 8000) {
          console.warn('SimpleN8NService: Timeout reached, no real N8N polling available');
          throw new Error('N8N processing timeout - no status endpoint available for real results');
        }

        console.log(`SimpleN8NService: Still processing... (${Math.round(elapsed / 1000)}s elapsed)`);

      } catch (error) {
        console.error('SimpleN8NService: Polling error:', error);
        await this.delay(pollInterval);
      }
    }

    throw new Error('N8N processing timeout after 30 seconds');
  }

  /**
   * Poll N8N status endpoint (placeholder for real implementation)
   * @param {string} requestId - Request identifier
   * @returns {Promise<Object>} Status response
   */
  async pollN8NStatus(requestId) {
    // PLACEHOLDER: In real implementation, this would call N8N status API
    // For now, simulate the polling behavior

    const webhookUrl = await this.getWebhookUrl();
    const statusUrl = webhookUrl.replace('/webhook/', '/status/') + `?requestId=${requestId}`;

    try {
      const response = await fetch(statusUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.log('SimpleN8NService: Status endpoint not available, using delay-based simulation');
    }

    // Fallback to time-based simulation
    return {
      status: 'processing',
      requestId: requestId
    };
  }

  /**
   * Test N8N connection
   */
  async testConnection() {
    try {
      console.log('SimpleN8NService: Testing connection...');

      const webhookUrl = await this.getWebhookUrl();
      const testPayload = {
        test: true,
        timestamp: Date.now(),
        message: 'Connection test from LinkedIn Insight V3'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      const result = {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        timestamp: Date.now()
      };

      if (response.ok) {
        try {
          const responseData = await response.json();
          result.responseData = responseData;
        } catch (e) {
          console.warn('Could not parse test response as JSON');
        }
      }

      console.log('SimpleN8NService: Connection test completed', result);
      return result;
    } catch (error) {
      console.error('SimpleN8NService: Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get webhook URL from storage
   */
  async getWebhookUrl() {
    try {
      const result = await chrome.storage.local.get(this.WEBHOOK_URL_STORAGE);
      return result[this.WEBHOOK_URL_STORAGE] || this.DEFAULT_WEBHOOK_URL;
    } catch (error) {
      console.error('SimpleN8NService: Failed to get webhook URL:', error);
      return this.DEFAULT_WEBHOOK_URL;
    }
  }

  /**
   * Set webhook URL in storage
   */
  async setWebhookUrl(url) {
    try {
      await chrome.storage.local.set({ [this.WEBHOOK_URL_STORAGE]: url });
      console.log('SimpleN8NService: Webhook URL saved:', url);
      return true;
    } catch (error) {
      console.error('SimpleN8NService: Failed to save webhook URL:', error);
      return false;
    }
  }

  /**
   * Utility: Delay execution
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  async getServiceStatus() {
    try {
      const webhookUrl = await this.getWebhookUrl();
      return {
        webhookUrl: webhookUrl ? 'configured' : 'not_configured',
        url: webhookUrl,
        status: 'ready'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

// Export for use in other modules
window.SimpleN8NService = SimpleN8NService;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.simpleN8nService = new SimpleN8NService();
  window.simpleN8nService.initialize();
}

console.log('SimpleN8NService: Script loaded'); 