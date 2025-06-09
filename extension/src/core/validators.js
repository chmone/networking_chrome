/**
 * Data Validation Service
 * Comprehensive validation for all data flowing through the V3 pipeline
 * CRITICAL: Prevents invalid data from reaching N8N
 */

class DataValidators {
  constructor() {
    this.REQUIRED_USER_FIELDS = ['name', 'headline'];
    this.REQUIRED_TARGET_FIELDS = ['name', 'headline'];
    this.OPTIONAL_FIELDS = ['summary', 'location', 'experiences', 'education', 'licenses'];

    this.MIN_NAME_LENGTH = 2;
    this.MAX_NAME_LENGTH = 100;
    this.MIN_HEADLINE_LENGTH = 5;
    this.MAX_HEADLINE_LENGTH = 500;
    this.MAX_SUMMARY_LENGTH = 5000;

    this.VALIDATION_ERRORS = {
      MISSING_REQUIRED_FIELD: 'missing_required_field',
      INVALID_FIELD_TYPE: 'invalid_field_type',
      FIELD_TOO_SHORT: 'field_too_short',
      FIELD_TOO_LONG: 'field_too_long',
      INVALID_URL: 'invalid_url',
      INVALID_EMAIL: 'invalid_email',
      STALE_DATA: 'stale_data',
      INCOMPLETE_PROFILE: 'incomplete_profile'
    };
  }

  /**
   * Validate user profile data
   * @param {Object} profile - User profile data
   * @returns {Object} Validation result
   */
  validateUserProfile(profile) {
    try {
      console.log('DataValidators: Validating user profile...');

      const result = {
        valid: true,
        errors: [],
        warnings: [],
        score: 0
      };

      // Check if profile exists
      if (!profile || typeof profile !== 'object') {
        result.valid = false;
        result.errors.push({
          field: 'profile',
          error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
          message: 'Profile data is missing or invalid'
        });
        return result;
      }

      // Validate required fields
      this.validateRequiredFields(profile, this.REQUIRED_USER_FIELDS, result);

      // Validate field types and constraints
      this.validateProfileFields(profile, result);

      // Validate data completeness
      this.validateDataCompleteness(profile, result);

      // Calculate quality score
      result.score = this.calculateProfileScore(profile, result);

      console.log(`DataValidators: User profile validation completed - Score: ${result.score}%`);
      return result;
    } catch (error) {
      console.error('DataValidators: User profile validation failed:', error);
      return {
        valid: false,
        errors: [{ error: 'validation_exception', message: error.message }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Validate target profile data
   * @param {Object} profile - Target profile data
   * @returns {Object} Validation result
   */
  validateTargetProfile(profile) {
    try {
      console.log('DataValidators: Validating target profile...');

      const result = {
        valid: true,
        errors: [],
        warnings: [],
        score: 0
      };

      // Check if profile exists
      if (!profile || typeof profile !== 'object') {
        result.valid = false;
        result.errors.push({
          field: 'profile',
          error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
          message: 'Target profile data is missing or invalid'
        });
        return result;
      }

      // Validate required fields
      this.validateRequiredFields(profile, this.REQUIRED_TARGET_FIELDS, result);

      // Validate field types and constraints
      this.validateProfileFields(profile, result);

      // Validate data completeness
      this.validateDataCompleteness(profile, result);

      // Calculate quality score
      result.score = this.calculateProfileScore(profile, result);

      console.log(`DataValidators: Target profile validation completed - Score: ${result.score}%`);
      return result;
    } catch (error) {
      console.error('DataValidators: Target profile validation failed:', error);
      return {
        valid: false,
        errors: [{ error: 'validation_exception', message: error.message }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Validate N8N payload before transmission
   * @param {Object} payload - N8N payload
   * @returns {Object} Validation result
   */
  validateN8NPayload(payload) {
    try {
      console.log('DataValidators: Validating N8N payload...');

      const result = {
        valid: true,
        errors: [],
        warnings: [],
        readyForTransmission: false
      };

      // Check payload structure
      if (!payload || typeof payload !== 'object') {
        result.valid = false;
        result.errors.push({
          field: 'payload',
          error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
          message: 'N8N payload is missing or invalid'
        });
        return result;
      }

      // Validate required payload fields
      const requiredFields = ['userProfile', 'targetProfile', 'analysisMetadata'];
      for (const field of requiredFields) {
        if (!payload[field]) {
          result.valid = false;
          result.errors.push({
            field,
            error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
            message: `Required field '${field}' is missing from N8N payload`
          });
        }
      }

      if (!result.valid) {
        return result;
      }

      // Validate user profile in payload
      const userValidation = this.validateUserProfile(payload.userProfile);
      if (!userValidation.valid) {
        result.valid = false;
        result.errors.push({
          field: 'userProfile',
          error: 'user_profile_invalid',
          message: 'User profile in payload is invalid',
          details: userValidation.errors
        });
      }

      // Validate target profile in payload
      const targetValidation = this.validateTargetProfile(payload.targetProfile);
      if (!targetValidation.valid) {
        result.valid = false;
        result.errors.push({
          field: 'targetProfile',
          error: 'target_profile_invalid',
          message: 'Target profile in payload is invalid',
          details: targetValidation.errors
        });
      }

      // Validate metadata
      this.validateAnalysisMetadata(payload.analysisMetadata, result);

      // Validate data freshness
      this.validateDataFreshness(payload, result);

      // Check if ready for transmission
      result.readyForTransmission = result.valid && result.errors.length === 0;

      console.log(`DataValidators: N8N payload validation completed - Ready: ${result.readyForTransmission}`);
      return result;
    } catch (error) {
      console.error('DataValidators: N8N payload validation failed:', error);
      return {
        valid: false,
        errors: [{ error: 'validation_exception', message: error.message }],
        warnings: [],
        readyForTransmission: false
      };
    }
  }

  /**
   * Validate required fields
   * @param {Object} profile - Profile data
   * @param {Array} requiredFields - Required field names
   * @param {Object} result - Validation result object
   */
  validateRequiredFields(profile, requiredFields, result) {
    for (const field of requiredFields) {
      if (!profile[field] || profile[field] === `${field.charAt(0).toUpperCase() + field.slice(1)} not found`) {
        result.valid = false;
        result.errors.push({
          field,
          error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
          message: `Required field '${field}' is missing or contains default value`
        });
      }
    }
  }

  /**
   * Validate profile field types and constraints
   * @param {Object} profile - Profile data
   * @param {Object} result - Validation result object
   */
  validateProfileFields(profile, result) {
    // Validate name
    if (profile.name) {
      if (typeof profile.name !== 'string') {
        result.errors.push({
          field: 'name',
          error: this.VALIDATION_ERRORS.INVALID_FIELD_TYPE,
          message: 'Name must be a string'
        });
      } else {
        if (profile.name.length < this.MIN_NAME_LENGTH) {
          result.errors.push({
            field: 'name',
            error: this.VALIDATION_ERRORS.FIELD_TOO_SHORT,
            message: `Name must be at least ${this.MIN_NAME_LENGTH} characters`
          });
        }
        if (profile.name.length > this.MAX_NAME_LENGTH) {
          result.errors.push({
            field: 'name',
            error: this.VALIDATION_ERRORS.FIELD_TOO_LONG,
            message: `Name must be less than ${this.MAX_NAME_LENGTH} characters`
          });
        }
      }
    }

    // Validate headline
    if (profile.headline) {
      if (typeof profile.headline !== 'string') {
        result.errors.push({
          field: 'headline',
          error: this.VALIDATION_ERRORS.INVALID_FIELD_TYPE,
          message: 'Headline must be a string'
        });
      } else {
        if (profile.headline.length < this.MIN_HEADLINE_LENGTH) {
          result.errors.push({
            field: 'headline',
            error: this.VALIDATION_ERRORS.FIELD_TOO_SHORT,
            message: `Headline must be at least ${this.MIN_HEADLINE_LENGTH} characters`
          });
        }
        if (profile.headline.length > this.MAX_HEADLINE_LENGTH) {
          result.errors.push({
            field: 'headline',
            error: this.VALIDATION_ERRORS.FIELD_TOO_LONG,
            message: `Headline must be less than ${this.MAX_HEADLINE_LENGTH} characters`
          });
        }
      }
    }

    // Validate summary
    if (profile.summary && profile.summary !== 'Summary not found') {
      if (typeof profile.summary !== 'string') {
        result.warnings.push({
          field: 'summary',
          message: 'Summary should be a string'
        });
      } else if (profile.summary.length > this.MAX_SUMMARY_LENGTH) {
        result.warnings.push({
          field: 'summary',
          message: `Summary is very long (${profile.summary.length} characters)`
        });
      }
    }

    // Validate avatar URL (if assigned by avatar manager)
    if (profile.avatarUrl && profile.avatarUrl !== '') {
      if (!this.isValidUrl(profile.avatarUrl)) {
        result.warnings.push({
          field: 'avatarUrl',
          message: 'Avatar URL appears to be invalid'
        });
      }
    }

    // Validate experiences array
    if (profile.experiences) {
      if (!Array.isArray(profile.experiences)) {
        result.warnings.push({
          field: 'experiences',
          message: 'Experiences should be an array'
        });
      } else {
        profile.experiences.forEach((exp, index) => {
          if (!exp.jobTitle || !exp.companyName) {
            result.warnings.push({
              field: `experiences[${index}]`,
              message: 'Experience entry missing required fields'
            });
          }
        });
      }
    }

    // Validate education array
    if (profile.education) {
      if (!Array.isArray(profile.education)) {
        result.warnings.push({
          field: 'education',
          message: 'Education should be an array'
        });
      }
    }

    // Update validity based on errors
    if (result.errors.length > 0) {
      result.valid = false;
    }
  }

  /**
   * Validate data completeness
   * @param {Object} profile - Profile data
   * @param {Object} result - Validation result object
   */
  validateDataCompleteness(profile, result) {
    const missingOptionalFields = [];

    this.OPTIONAL_FIELDS.forEach(field => {
      if (!profile[field] ||
        profile[field] === `${field.charAt(0).toUpperCase() + field.slice(1)} not found` ||
        (Array.isArray(profile[field]) && profile[field].length === 0)) {
        missingOptionalFields.push(field);
      }
    });

    if (missingOptionalFields.length > 0) {
      result.warnings.push({
        field: 'completeness',
        message: `Profile missing optional fields: ${missingOptionalFields.join(', ')}`,
        impact: 'May reduce analysis quality'
      });
    }

    // Check for default values that indicate failed scraping
    const defaultValues = [
      'Name not found', 'Headline not found', 'Summary not found',
      'Location not found', 'N/A'
    ];

    Object.entries(profile).forEach(([field, value]) => {
      if (typeof value === 'string' && defaultValues.includes(value)) {
        result.warnings.push({
          field,
          message: `Field contains default value: ${value}`,
          impact: 'Indicates incomplete scraping'
        });
      }
    });
  }

  /**
   * Validate analysis metadata
   * @param {Object} metadata - Analysis metadata
   * @param {Object} result - Validation result object
   */
  validateAnalysisMetadata(metadata, result) {
    if (!metadata || typeof metadata !== 'object') {
      result.errors.push({
        field: 'analysisMetadata',
        error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
        message: 'Analysis metadata is missing'
      });
      return;
    }

    const requiredMetadataFields = ['requestTime', 'userTier', 'analysisType', 'version'];
    for (const field of requiredMetadataFields) {
      if (metadata[field] === undefined || metadata[field] === null) {
        result.errors.push({
          field: `analysisMetadata.${field}`,
          error: this.VALIDATION_ERRORS.MISSING_REQUIRED_FIELD,
          message: `Required metadata field '${field}' is missing`
        });
      }
    }

    // Validate specific metadata fields
    if (metadata.requestTime && !this.isValidTimestamp(metadata.requestTime)) {
      result.errors.push({
        field: 'analysisMetadata.requestTime',
        error: this.VALIDATION_ERRORS.INVALID_FIELD_TYPE,
        message: 'Request time must be a valid timestamp'
      });
    }

    if (metadata.userTier && !['free', 'premium', 'development'].includes(metadata.userTier)) {
      result.errors.push({
        field: 'analysisMetadata.userTier',
        error: this.VALIDATION_ERRORS.INVALID_FIELD_TYPE,
        message: 'User tier must be one of: free, premium, development'
      });
    }
  }

  /**
   * Validate data freshness
   * @param {Object} payload - N8N payload
   * @param {Object} result - Validation result object
   */
  validateDataFreshness(payload, result) {
    const now = Date.now();
    const maxUserAge = 24 * 60 * 60 * 1000; // 24 hours
    const maxTargetAge = 60 * 60 * 1000; // 1 hour

    // Check user profile freshness
    if (payload.userProfile?.dataFreshness) {
      const userAge = now - payload.userProfile.dataFreshness;
      if (userAge > maxUserAge) {
        result.errors.push({
          field: 'userProfile.dataFreshness',
          error: this.VALIDATION_ERRORS.STALE_DATA,
          message: `User profile data is too old (${Math.round(userAge / (60 * 60 * 1000))} hours)`
        });
      }
    } else {
      result.warnings.push({
        field: 'userProfile.dataFreshness',
        message: 'User profile freshness timestamp missing'
      });
    }

    // Check target profile freshness
    if (payload.targetProfile?.dataFreshness) {
      const targetAge = now - payload.targetProfile.dataFreshness;
      if (targetAge > maxTargetAge) {
        result.warnings.push({
          field: 'targetProfile.dataFreshness',
          message: `Target profile data is ${Math.round(targetAge / (60 * 1000))} minutes old`
        });
      }
    } else {
      result.warnings.push({
        field: 'targetProfile.dataFreshness',
        message: 'Target profile freshness timestamp missing'
      });
    }
  }

  /**
   * Calculate profile quality score
   * @param {Object} profile - Profile data
   * @param {Object} validationResult - Validation result
   * @returns {number} Quality score (0-100)
   */
  calculateProfileScore(profile, validationResult) {
    let score = 100;

    // Deduct for errors
    score -= validationResult.errors.length * 25;

    // Deduct for warnings
    score -= validationResult.warnings.length * 5;

    // Deduct for missing optional fields
    const optionalFieldsPresent = this.OPTIONAL_FIELDS.filter(field =>
      profile[field] &&
      profile[field] !== `${field.charAt(0).toUpperCase() + field.slice(1)} not found` &&
      !(Array.isArray(profile[field]) && profile[field].length === 0)
    ).length;

    const completenessScore = (optionalFieldsPresent / this.OPTIONAL_FIELDS.length) * 20;
    score = (score * 0.8) + completenessScore;

    return Math.max(0, Math.round(score));
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} Is valid URL
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate timestamp
   * @param {number} timestamp - Timestamp to validate
   * @returns {boolean} Is valid timestamp
   */
  isValidTimestamp(timestamp) {
    return typeof timestamp === 'number' &&
      timestamp > 0 &&
      timestamp <= Date.now() + (24 * 60 * 60 * 1000); // Allow future dates up to 1 day
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Sanitize profile data for safe processing
   * @param {Object} profile - Profile data
   * @returns {Object} Sanitized profile data
   */
  sanitizeProfile(profile) {
    if (!profile || typeof profile !== 'object') {
      return {};
    }

    const sanitized = {};

    // Sanitize string fields
    Object.entries(profile).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Trim whitespace and remove control characters
        sanitized[key] = value.trim().replace(/[\x00-\x1F\x7F]/g, '');

        // Limit length for safety
        if (sanitized[key].length > 10000) {
          sanitized[key] = sanitized[key].substring(0, 10000) + '...';
        }
      } else if (Array.isArray(value)) {
        // Sanitize arrays
        sanitized[key] = value.map(item =>
          typeof item === 'object' ? this.sanitizeProfile(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize objects
        sanitized[key] = this.sanitizeProfile(value);
      } else {
        // Keep other types as is
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Create validation summary
   * @param {Object} validationResult - Validation result
   * @returns {string} Human-readable summary
   */
  createValidationSummary(validationResult) {
    const { valid, errors, warnings, score } = validationResult;

    let summary = `Validation ${valid ? 'PASSED' : 'FAILED'}`;

    if (score !== undefined) {
      summary += ` (Score: ${score}%)`;
    }

    if (errors.length > 0) {
      summary += `\nErrors (${errors.length}): ${errors.map(e => e.message).join('; ')}`;
    }

    if (warnings.length > 0) {
      summary += `\nWarnings (${warnings.length}): ${warnings.map(w => w.message).join('; ')}`;
    }

    return summary;
  }
}

// Export for use in other modules
window.DataValidators = DataValidators;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.dataValidators = new DataValidators();
} 