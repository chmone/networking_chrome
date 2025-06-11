/**
 * Analysis Service - Workflow Orchestration
 * Orchestrates the complete analysis workflow from scraping to results
 * CRITICAL: Fixes V2 data pipeline by ensuring fresh, validated data flow
 */

class AnalysisService {
  constructor() {
    this.currentAnalysis = null;
    this.analysisHistory = [];
    this.MAX_HISTORY = 50;

    this.ANALYSIS_STEPS = {
      INIT: 'initializing',
      CONSENT: 'checking_consent',
      RATE_LIMIT: 'checking_rate_limits',
      USER_PROFILE: 'scraping_user_profile',
      TARGET_PROFILE: 'scraping_target_profile',
      VALIDATION: 'validating_data',
      N8N_REQUEST: 'sending_to_n8n',
      PROCESSING: 'processing_results',
      COMPLETE: 'complete',
      ERROR: 'error'
    };
  }

  /**
   * Initialize analysis service
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log('AnalysisService: Initializing...');

      // Initialize dependent services
      if (window.stateManager) {
        await window.stateManager.initialize();
      }

      if (window.simpleN8nService) {
        await window.simpleN8nService.initialize();
      }

      // Load analysis history
      await this.loadAnalysisHistory();

      console.log('AnalysisService: Initialized successfully');
      return true;
    } catch (error) {
      console.error('AnalysisService: Initialization failed:', error);
      return false;
    }
  }

  /**
   * Start complete analysis workflow
   * CRITICAL: This replaces the broken V2 workflow
   * @param {number} tabId - Chrome tab ID
   * @param {string} targetUrl - Target LinkedIn profile URL
   * @returns {Promise<Object>} Analysis results
   */
  async startAnalysis(tabId, targetUrl) {
    try {
      console.log('AnalysisService: Starting analysis workflow...');

      // Create new analysis instance
      this.currentAnalysis = {
        id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        tabId,
        targetUrl,
        startTime: Date.now(),
        steps: [],
        status: this.ANALYSIS_STEPS.INIT,
        progress: 0
      };

      // Update state
      if (window.stateManager) {
        await window.stateManager.updateAnalysisState({
          status: 'scraping',
          progress: 0,
          currentStep: this.ANALYSIS_STEPS.INIT,
          startTime: Date.now(),
          error: null
        });
      }

      // Execute workflow steps
      const result = await this.executeWorkflow();

      // Complete analysis
      this.currentAnalysis.endTime = Date.now();
      this.currentAnalysis.duration = this.currentAnalysis.endTime - this.currentAnalysis.startTime;
      this.currentAnalysis.result = result;

      // Save to history
      await this.saveAnalysisToHistory(this.currentAnalysis);

      console.log('AnalysisService: Analysis workflow completed successfully');
      return result;
    } catch (error) {
      console.error('AnalysisService: Analysis workflow failed:', error);

      // Update error state
      if (window.stateManager) {
        await window.stateManager.updateAnalysisState({
          status: 'error',
          error: {
            message: error.message,
            step: this.currentAnalysis?.status || 'unknown',
            timestamp: Date.now()
          }
        });
      }

      // Save failed analysis to history
      if (this.currentAnalysis) {
        this.currentAnalysis.error = error.message;
        this.currentAnalysis.endTime = Date.now();
        await this.saveAnalysisToHistory(this.currentAnalysis);
      }

      throw error;
    }
  }

  /**
   * Execute the complete analysis workflow
   * @returns {Promise<Object>} Analysis results
   */
  async executeWorkflow() {
    try {
      // Step 1: Check consent and security requirements
      await this.executeStep('consent_check', async () => {
        // Security checks removed per user request
      });

      // Rate limit checking removed per user request

      // Step 3: Get fresh user profile data
      await this.executeStep('user_profile_scraping', async () => {
        await this.ensureFreshUserProfile();
      });

      // Step 4: Scrape target profile
      await this.executeStep('target_profile_scraping', async () => {
        await this.scrapeTargetProfile();
      });

      // Step 5: Validate data for N8N transmission
      await this.executeStep('data_validation', async () => {
        await this.validateDataForN8N();
      });

      // Step 6: Send to N8N and get results
      await this.executeStep('n8n_analysis', async () => {
        return await this.performN8NAnalysis();
      });

      // Step 7: Process and return results
      const results = await this.executeStep('result_processing', async () => {
        return await this.processAnalysisResults();
      });

      // Update final state
      if (window.stateManager) {
        await window.stateManager.updateAnalysisState({
          status: 'complete',
          progress: 100,
          currentStep: this.ANALYSIS_STEPS.COMPLETE,
          results: results,
          endTime: Date.now()
        });
      }

      return results;
    } catch (error) {
      console.error('AnalysisService: Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow step with progress tracking
   * @param {string} stepName - Step name
   * @param {Function} stepFunction - Step function to execute
   * @returns {Promise<*>} Step result
   */
  async executeStep(stepName, stepFunction) {
    try {
      console.log(`AnalysisService: Executing step: ${stepName}`);

      // Update progress
      const stepIndex = Object.keys(this.ANALYSIS_STEPS).indexOf(stepName.toUpperCase());
      const progress = Math.round((stepIndex / Object.keys(this.ANALYSIS_STEPS).length) * 100);

      if (window.stateManager) {
        await window.stateManager.updateAnalysisState({
          currentStep: stepName,
          progress: Math.min(progress, 95) // Never show 100% until complete
        });
      }

      // Record step start
      const stepStart = Date.now();
      this.currentAnalysis.steps.push({
        name: stepName,
        startTime: stepStart,
        status: 'running'
      });

      // Execute step
      const result = await stepFunction();

      // Record step completion
      const stepEnd = Date.now();
      const currentStep = this.currentAnalysis.steps[this.currentAnalysis.steps.length - 1];
      currentStep.endTime = stepEnd;
      currentStep.duration = stepEnd - stepStart;
      currentStep.status = 'completed';
      currentStep.result = result;

      console.log(`AnalysisService: Step ${stepName} completed in ${currentStep.duration}ms`);
      return result;
    } catch (error) {
      console.error(`AnalysisService: Step ${stepName} failed:`, error);

      // Record step failure
      if (this.currentAnalysis?.steps?.length > 0) {
        const currentStep = this.currentAnalysis.steps[this.currentAnalysis.steps.length - 1];
        currentStep.endTime = Date.now();
        currentStep.status = 'failed';
        currentStep.error = error.message;
      }

      throw error;
    }
  }

  // Consent and security function removed per user request

  // Rate limits function removed per user request

  /**
   * Ensure fresh user profile data
   * CRITICAL: This prevents sending stale user data to N8N
   * @returns {Promise<Object>} Fresh user profile
   */
  async ensureFreshUserProfile() {
    console.log('AnalysisService: Ensuring fresh user profile...');

    if (!window.stateManager) {
      throw new Error('State manager not available');
    }

    // Check if current profile is fresh
    const userProfile = await window.stateManager.getFreshUserProfile();

    if (!userProfile) {
      console.log('AnalysisService: User profile missing or stale, need to scrape...');

      // Get user's LinkedIn URL
      const settings = await chrome.storage.local.get('userLinkedInUrl');
      const userLinkedInUrl = settings.userLinkedInUrl;

      if (!userLinkedInUrl) {
        throw new Error('User LinkedIn URL not configured. Please complete initial setup.');
      }

      // Navigate to user's profile and scrape
      await this.navigateAndScrapeUserProfile(userLinkedInUrl);
    }

    // Validate we now have fresh user profile
    const finalUserProfile = window.stateManager.getState('user.profile');
    if (!finalUserProfile) {
      throw new Error('Failed to obtain fresh user profile data');
    }

    return finalUserProfile;
  }

  /**
   * Navigate to user profile and scrape fresh data
   * @param {string} userLinkedInUrl - User's LinkedIn profile URL
   * @returns {Promise<Object>} Scraped user profile
   */
  async navigateAndScrapeUserProfile(userLinkedInUrl) {
    console.log('AnalysisService: Navigating to user profile for fresh scraping...');

    // Create new tab for user profile scraping
    const userTab = await chrome.tabs.create({
      url: userLinkedInUrl,
      active: false // Don't switch to this tab
    });

    try {
      // Wait for tab to load
      await this.waitForTabLoad(userTab.id);

      // Scrape user profile
      const scrapedUserProfile = await this.executeProfileScraping(userTab.id, 'user');

      // Update state with fresh data
      if (window.stateManager) {
        await window.stateManager.updateUserProfile(scrapedUserProfile, true);
      }

      console.log('AnalysisService: Fresh user profile scraped successfully');
      return scrapedUserProfile;
    } finally {
      // Close the user profile tab
      await chrome.tabs.remove(userTab.id);
    }
  }

  /**
   * Scrape target profile
   * @returns {Promise<Object>} Target profile data
   */
  async scrapeTargetProfile() {
    console.log('AnalysisService: Scraping target profile...');

    if (!this.currentAnalysis.tabId) {
      throw new Error('No tab ID for target profile scraping');
    }

    // Execute profile scraping on target tab
    const targetProfile = await this.executeProfileScraping(this.currentAnalysis.tabId, 'target');

    // Update state
    if (window.stateManager) {
      await window.stateManager.updateTargetProfile(targetProfile, this.currentAnalysis.targetUrl);
    }

    return targetProfile;
  }

  /**
   * Execute profile scraping on specified tab
   * @param {number} tabId - Chrome tab ID
   * @param {string} profileType - Profile type ('user' or 'target')
   * @returns {Promise<Object>} Scraped profile data
   */
  async executeProfileScraping(tabId, profileType = 'target') {
    try {
      console.log(`AnalysisService: Executing scraping on tab ${tabId}...`);

      // Inject and execute scraper
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content_scripts/linkedin_scraper.js']
      });

      if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
        throw new Error('LinkedIn scraper injection failed');
      }

      const scrapedResult = injectionResults[0].result;

      // Check for scraper errors
      if (scrapedResult.error) {
        throw new Error(`Profile scraping failed: ${scrapedResult.error}`);
      }

      // Validate scraped data
      if (!scrapedResult.name || scrapedResult.name === 'Name not found') {
        throw new Error('Could not extract profile data. Ensure you are on a valid LinkedIn profile page.');
      }

      // Assign random avatar instead of using scraped profile image
      if (window.avatarManager) {
        window.avatarManager.assignAvatarToProfile(scrapedResult, profileType);
      }

      console.log('AnalysisService: Profile scraping completed successfully');
      return scrapedResult;
    } catch (error) {
      console.error('AnalysisService: Profile scraping failed:', error);
      throw error;
    }
  }

  /**
   * Validate data for N8N transmission
   * @returns {Promise<Object>} Validated data
   */
  async validateDataForN8N() {
    console.log('AnalysisService: Validating data for N8N transmission...');

    if (!window.stateManager) {
      throw new Error('State manager not available');
    }

    // Prepare and validate N8N data
    const n8nData = await window.stateManager.prepareN8NData();

    if (!n8nData) {
      throw new Error('Failed to prepare valid data for N8N transmission');
    }

    console.log('AnalysisService: Data validation completed successfully');
    return n8nData;
  }

  /**
   * Perform N8N analysis
   * @returns {Promise<Object>} Analysis results from N8N
   */
  async performN8NAnalysis() {
    console.log('AnalysisService: Performing N8N analysis...');

    if (!window.simpleN8nService) {
      throw new Error('N8N service not available');
    }

    if (!window.stateManager) {
      throw new Error('State manager not available');
    }

    // Get validated data
    const n8nData = await window.stateManager.prepareN8NData();

    // Send to N8N for analysis
    console.log('AnalysisService: Calling N8N service with data:', n8nData);
    const analysisResults = await window.simpleN8nService.sendAnalysisRequest(n8nData);

    console.log('AnalysisService: N8N analysis completed successfully');
    console.log('AnalysisService: Raw N8N results received:', analysisResults);
    console.log('AnalysisService: N8N returned score:', analysisResults?.score, typeof analysisResults?.score);
    console.log('AnalysisService: N8N returned insights:', analysisResults?.insights, Array.isArray(analysisResults?.insights));
    return analysisResults;
  }

  /**
   * Process analysis results
   * @returns {Promise<Object>} Processed results
   */
  async processAnalysisResults() {
    console.log('AnalysisService: Processing analysis results...');

    // Get analysis results from N8N
    const rawResults = this.currentAnalysis.steps.find(s => s.name === 'n8n_analysis')?.result;

    console.log('AnalysisService: Found raw results from N8N step:', rawResults);
    console.log('AnalysisService: Raw results score:', rawResults?.score, typeof rawResults?.score);
    console.log('AnalysisService: Raw results insights:', rawResults?.insights, Array.isArray(rawResults?.insights));

    if (!rawResults) {
      throw new Error('No analysis results to process');
    }

    // Process and format results
    const processedResults = {
      score: rawResults.score,
      insights: rawResults.insights,
      metadata: {
        ...rawResults.metadata,
        analysisId: this.currentAnalysis.id,
        processingTime: Date.now(),
        version: '3.0'
      },
      userProfile: window.stateManager?.getState('user.profile'),
      targetProfile: window.stateManager?.getState('target.profile')
    };

    console.log('AnalysisService: Processed results:', processedResults);
    console.log('AnalysisService: Final score:', processedResults.score, typeof processedResults.score);
    console.log('AnalysisService: Final insights:', processedResults.insights, Array.isArray(processedResults.insights));

    // Store results in state
    if (window.stateManager) {
      await window.stateManager.updateState('target.analysisResults', processedResults);
    }

    console.log('AnalysisService: Results processing completed successfully');
    return processedResults;
  }

  /**
   * Wait for tab to finish loading
   * @param {number} tabId - Chrome tab ID
   * @returns {Promise<void>}
   */
  async waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab load timeout'));
      }, 30000); // 30 seconds timeout

      const listener = (updatedTabId, changeInfo, tab) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          clearTimeout(timeout);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  /**
   * Load analysis history from storage
   * @returns {Promise<boolean>} Success status
   */
  async loadAnalysisHistory() {
    try {
      const result = await chrome.storage.local.get('analysisHistory');
      this.analysisHistory = result.analysisHistory || [];
      return true;
    } catch (error) {
      console.error('AnalysisService: Failed to load analysis history:', error);
      return false;
    }
  }

  /**
   * Save analysis to history
   * @param {Object} analysis - Analysis object
   * @returns {Promise<boolean>} Success status
   */
  async saveAnalysisToHistory(analysis) {
    try {
      // Add to history
      this.analysisHistory.unshift(analysis);

      // Limit history size
      if (this.analysisHistory.length > this.MAX_HISTORY) {
        this.analysisHistory = this.analysisHistory.slice(0, this.MAX_HISTORY);
      }

      // Save to storage
      await chrome.storage.local.set({
        analysisHistory: this.analysisHistory
      });

      return true;
    } catch (error) {
      console.error('AnalysisService: Failed to save analysis to history:', error);
      return false;
    }
  }

  /**
   * Get analysis history
   * @returns {Array} Analysis history
   */
  getAnalysisHistory() {
    return this.analysisHistory;
  }

  /**
   * Get current analysis status
   * @returns {Object|null} Current analysis
   */
  getCurrentAnalysis() {
    return this.currentAnalysis;
  }

  /**
   * Cancel current analysis
   * @returns {Promise<boolean>} Success status
   */
  async cancelAnalysis() {
    try {
      if (this.currentAnalysis) {
        this.currentAnalysis.cancelled = true;
        this.currentAnalysis.endTime = Date.now();

        if (window.stateManager) {
          await window.stateManager.updateAnalysisState({
            status: 'error',
            error: {
              message: 'Analysis cancelled by user',
              timestamp: Date.now()
            }
          });
        }

        await this.saveAnalysisToHistory(this.currentAnalysis);
        this.currentAnalysis = null;
      }

      return true;
    } catch (error) {
      console.error('AnalysisService: Failed to cancel analysis:', error);
      return false;
    }
  }
}

// Export for use in other modules
window.AnalysisService = AnalysisService;

// Auto-initialize if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.analysisService = new AnalysisService();
} 