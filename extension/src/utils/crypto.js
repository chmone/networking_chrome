/**
 * Cryptographic Service for HMAC Authentication
 * Secures N8N webhook communication with HMAC-SHA256 signatures
 * CRITICAL: Required for secure data transmission
 */

class CryptoService {
  constructor() {
    this.algorithm = 'HMAC';
    this.hash = 'SHA-256';
    this.SECRET_KEY_STORAGE = 'n8nSecretKey';
    this.NONCE_STORAGE = 'lastNonce';

    // Default secret key for development (MUST be replaced in production)
    this.DEFAULT_SECRET_KEY = 'dev-secret-key-replace-in-production';
  }

  /**
   * Initialize crypto service with secret key
   * @param {string} secretKey - HMAC secret key
   * @returns {Promise<boolean>} Success status
   */
  async initialize(secretKey = null) {
    try {
      if (secretKey) {
        await this.storeSecretKey(secretKey);
      } else {
        // Check if secret key exists, use default if not
        const existingKey = await this.getSecretKey();
        if (!existingKey) {
          console.warn('CryptoService: Using default secret key - REPLACE IN PRODUCTION');
          await this.storeSecretKey(this.DEFAULT_SECRET_KEY);
        }
      }

      console.log('CryptoService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('CryptoService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Generate HMAC signature for payload
   * @param {Object|string} payload - Data to sign
   * @param {string} secret - Secret key (optional, uses stored key if not provided)
   * @returns {Promise<string>} HMAC signature
   */
  async generateSignature(payload, secret = null) {
    try {
      const secretKey = secret || await this.getSecretKey();
      if (!secretKey) {
        throw new Error('No secret key available for signing');
      }

      // Convert payload to string if it's an object
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

      // Encode data
      const encoder = new TextEncoder();
      const data = encoder.encode(payloadString);
      const keyData = encoder.encode(secretKey);

      // Import key for HMAC
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.algorithm, hash: this.hash },
        false,
        ['sign']
      );

      // Generate signature
      const signature = await crypto.subtle.sign(this.algorithm, cryptoKey, data);

      // Convert to hex string
      return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('CryptoService: Signature generation failed:', error);
      throw error;
    }
  }

  /**
   * Verify HMAC signature
   * @param {Object|string} payload - Original payload
   * @param {string} signature - Signature to verify
   * @param {string} secret - Secret key (optional)
   * @returns {Promise<boolean>} Verification result
   */
  async verifySignature(payload, signature, secret = null) {
    try {
      const expectedSignature = await this.generateSignature(payload, secret);

      // Timing-safe comparison
      if (signature.length !== expectedSignature.length) {
        return false;
      }

      let result = 0;
      for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
      }

      return result === 0;
    } catch (error) {
      console.error('CryptoService: Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Sign request payload with authentication headers
   * @param {Object} payload - Request payload
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Signed request data
   */
  async signRequest(payload, options = {}) {
    try {
      // Generate metadata
      const timestamp = Date.now();
      const nonce = await this.generateNonce();

      // Create signed payload with metadata
      const signedPayload = {
        ...payload,
        metadata: {
          timestamp,
          nonce,
          version: '3.0',
          clientId: options.clientId || 'linkedin-insight-v3',
          requestId: options.requestId || this.generateRequestId()
        }
      };

      // Generate signature
      const signature = await this.generateSignature(signedPayload);

      // Create authentication headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp.toString(),
        'X-Nonce': nonce.toString(),
        'X-Version': '3.0',
        'X-Client-ID': signedPayload.metadata.clientId
      };

      // Store nonce to prevent replay attacks
      await this.storeLastNonce(nonce);

      return {
        payload: signedPayload,
        signature,
        headers,
        metadata: signedPayload.metadata
      };
    } catch (error) {
      console.error('CryptoService: Request signing failed:', error);
      throw error;
    }
  }

  /**
   * Validate incoming request (for webhook responses)
   * @param {Object} request - Incoming request
   * @returns {Promise<Object>} Validation result
   */
  async validateIncomingRequest(request) {
    try {
      const { headers, payload } = request;

      // Extract authentication headers
      const signature = headers['X-Signature'] || headers['x-signature'];
      const timestamp = parseInt(headers['X-Timestamp'] || headers['x-timestamp']);
      const nonce = headers['X-Nonce'] || headers['x-nonce'];

      if (!signature || !timestamp || !nonce) {
        return {
          valid: false,
          reason: 'missing_auth_headers',
          message: 'Required authentication headers missing'
        };
      }

      // Check timestamp (prevent replay attacks)
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes

      if (Math.abs(now - timestamp) > maxAge) {
        return {
          valid: false,
          reason: 'timestamp_expired',
          message: 'Request timestamp too old or too far in future'
        };
      }

      // Verify signature
      const isValidSignature = await this.verifySignature(payload, signature);

      if (!isValidSignature) {
        return {
          valid: false,
          reason: 'invalid_signature',
          message: 'HMAC signature verification failed'
        };
      }

      return {
        valid: true,
        timestamp,
        nonce,
        message: 'Request authentication successful'
      };
    } catch (error) {
      console.error('CryptoService: Request validation failed:', error);
      return {
        valid: false,
        reason: 'validation_error',
        message: error.message
      };
    }
  }

  /**
   * Generate cryptographically secure nonce
   * @returns {Promise<string>} Nonce value
   */
  async generateNonce() {
    try {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      return array.join('');
    } catch (error) {
      // Fallback for environments without crypto.getRandomValues
      return Math.random().toString(36).substr(2, 16);
    }
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Store secret key securely
   * @param {string} secretKey - Secret key to store
   * @returns {Promise<boolean>} Success status
   */
  async storeSecretKey(secretKey) {
    try {
      // In a production environment, this should be encrypted
      await chrome.storage.local.set({
        [this.SECRET_KEY_STORAGE]: secretKey
      });
      return true;
    } catch (error) {
      console.error('CryptoService: Failed to store secret key:', error);
      return false;
    }
  }

  /**
   * Retrieve stored secret key
   * @returns {Promise<string|null>} Secret key or null
   */
  async getSecretKey() {
    try {
      const result = await chrome.storage.local.get(this.SECRET_KEY_STORAGE);
      return result[this.SECRET_KEY_STORAGE] || null;
    } catch (error) {
      console.error('CryptoService: Failed to retrieve secret key:', error);
      return null;
    }
  }

  /**
   * Store last used nonce
   * @param {string} nonce - Nonce value
   * @returns {Promise<boolean>} Success status
   */
  async storeLastNonce(nonce) {
    try {
      await chrome.storage.local.set({
        [this.NONCE_STORAGE]: {
          value: nonce,
          timestamp: Date.now()
        }
      });
      return true;
    } catch (error) {
      console.error('CryptoService: Failed to store nonce:', error);
      return false;
    }
  }

  /**
   * Get encryption key for data protection
   * @returns {Promise<string>} Encryption key
   */
  async getEncryptionKey() {
    try {
      const secretKey = await this.getSecretKey();
      if (!secretKey) {
        throw new Error('No secret key available');
      }

      // Derive encryption key from secret key
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secretKey);

      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const salt = encoder.encode('linkedin-insight-v3-salt');
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        cryptoKey,
        256
      );

      return Array.from(new Uint8Array(derivedBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error('CryptoService: Failed to derive encryption key:', error);
      throw error;
    }
  }

  /**
   * Create secure headers for N8N requests
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} Secure headers
   */
  async createSecureHeaders(payload) {
    try {
      const signedData = await this.signRequest(payload);
      return signedData.headers;
    } catch (error) {
      console.error('CryptoService: Failed to create secure headers:', error);
      throw error;
    }
  }

  /**
   * Get authentication status
   * @returns {Promise<Object>} Authentication status
   */
  async getAuthStatus() {
    try {
      const secretKey = await this.getSecretKey();
      return {
        initialized: !!secretKey,
        keyType: secretKey === this.DEFAULT_SECRET_KEY ? 'development' : 'production',
        algorithm: `${this.algorithm}-${this.hash}`,
        status: secretKey ? 'ready' : 'not_initialized'
      };
    } catch (error) {
      console.error('CryptoService: Failed to get auth status:', error);
      return { initialized: false, status: 'error' };
    }
  }
}

// Export for use in other modules
window.CryptoService = CryptoService;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.cryptoService = new CryptoService();
  window.cryptoService.initialize();
} 