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
   * SIMPLIFIED: Just POST and get response back directly
   */
  async sendAnalysisRequest(profileData) {
    try {
      console.log('SimpleN8NService: Starting analysis request...');

      // Validate input data
      if (!profileData || !profileData.userProfile || !profileData.targetProfile) {
        throw new Error('Invalid profile data: missing user or target profile');
      }

      // Prepare payload - simple structure
      const payload = {
        userProfile: profileData.userProfile,
        targetProfile: profileData.targetProfile,
        timestamp: Date.now(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
      };

      console.log('SimpleN8NService: Sending payload to N8N:', payload);

      // Get webhook URL
      const webhookUrl = await this.getWebhookUrl();

      // Send request with retries
      const response = await this.sendWithRetries(webhookUrl, payload);

      console.log('SimpleN8NService: Received response from N8N:', response);

      // Validate and return results
      const results = this.validateAndFormatResponse(response);

      console.log('SimpleN8NService: Analysis completed successfully');
      return results;

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

    // Extract score and insights
    const score = typeof response.score === 'number' ? response.score : 0;
    const insights = Array.isArray(response.insights) ? response.insights : [];

    // Validate score range
    if (score < 0 || score > 100) {
      console.warn('N8N returned score outside valid range (0-100):', score);
    }

    // Format final results
    const results = {
      score: Math.max(0, Math.min(100, score)), // Clamp to 0-100
      insights: insights,
      metadata: response.metadata || {},
      timestamp: Date.now(),
      requestId: response.requestId || 'unknown'
    };

    console.log('SimpleN8NService: Formatted results:', results);
    return results;
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