/**
 * LinkedIn Insight V3 - Enhanced Popup Core
 * Integrates all V3 components: security, state management, enhanced N8N service
 * CRITICAL: This replaces the broken V2 popup_core.js implementation
 */

class V3PopupCore {
  constructor() {
    this.initialized = false;
    this.services = {
      stateManager: null,
      consentManager: null,
      rateLimiter: null,
      // cryptoService removed per user request
      n8nService: null,
      analysisService: null,
      diagnosticService: null,
      dataValidators: null
    };

    this.currentView = 'loading';
    this.analysisInProgress = false;
  }

  /**
   * Initialize V3 popup with all security and service components
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize() {
    try {
      console.log('V3PopupCore: Starting initialization...');

      // Load all V3 service scripts
      await this.loadV3Services();

      // Initialize services in correct order
      await this.initializeServices();

      // Check security requirements
      await this.checkSecurityRequirements();

      // Determine initial view based on state
      await this.determineInitialView();

      // Set up event listeners
      this.setupEventListeners();

      console.log('V3PopupCore: Initialization completed successfully');
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('V3PopupCore: Initialization failed:', error);

      // Show error state
      await this.showErrorView('Initialization Failed', error.message);
      return false;
    }
  }

  /**
   * Load all V3 service scripts
   * @returns {Promise<void>}
   */
  async loadV3Services() {
    // Scripts are now loaded via HTML - no dynamic loading needed
    console.log('V3PopupCore: Services loaded via HTML script tags');
  }

  // Dynamic script loading removed - scripts loaded via HTML

  /**
   * Initialize all services in correct dependency order
   * @returns {Promise<void>}
   */
  async initializeServices() {
    console.log('V3PopupCore: Initializing services in parallel for faster startup...');

    // Initialize independent services in parallel for better performance
    const independentServicePromises = [];

    // Initialize diagnostic service (independent) - FIXED: Properly assign instance
    if (window.DiagnosticService) {
      independentServicePromises.push(
        (async () => {
          try {
            const diagnosticService = new window.DiagnosticService();
            const initSuccess = await diagnosticService.initialize(true);

            if (initSuccess) {
              this.services.diagnosticService = diagnosticService; // Assign actual instance
              console.log('V3PopupCore: Diagnostic service initialized successfully');
            } else {
              console.warn('V3PopupCore: Diagnostic service initialization returned false');
            }

          } catch (error) {
            console.warn('V3PopupCore: Failed to initialize diagnostic service:', error);
            // Non-critical service - don't re-throw
          }
        })()
      );
    }

    // Initialize avatar manager (independent)
    if (window.AvatarManager) {
      independentServicePromises.push(
        (async () => {
          const avatarManager = new window.AvatarManager();
          await avatarManager.loadAvatarConfig();
          await avatarManager.preloadAvatars(); // Preload for better performance
          this.services.avatarManager = avatarManager;
          console.log('V3PopupCore: Avatar manager initialized');
        })().catch(error => {
          console.warn('V3PopupCore: Failed to initialize avatar manager:', error);
        })
      );
    }

    // Initialize state manager (independent) - FIXED: Properly assign instance
    if (window.StateManager) {
      independentServicePromises.push(
        (async () => {
          try {
            const stateManager = new window.StateManager();
            const initSuccess = await stateManager.initialize();

            if (!initSuccess) {
              throw new Error('StateManager initialization returned false');
            }

            // Validate instance has required methods
            if (typeof stateManager.getState !== 'function') {
              throw new Error('StateManager missing required getState method');
            }

            this.services.stateManager = stateManager; // Assign actual instance
            console.log('V3PopupCore: State manager initialized successfully');

          } catch (error) {
            console.error('V3PopupCore: Failed to initialize state manager:', error);
            throw error; // Re-throw to fail Promise.all() for critical service
          }
        })()
      );
    }

    // Wait for all independent services to complete in parallel
    await Promise.all(independentServicePromises);

    // Validate critical services are properly initialized
    this.validateCriticalServices();

    // Initialize data validators
    if (window.DataValidators) {
      this.services.dataValidators = new window.DataValidators();
    }

    // Initialize N8N service (depends on crypto and state)
    // Use simple N8N service (crypto removed)
    if (window.SimpleN8NService) {
      this.services.n8nService = new window.SimpleN8NService();
      await this.services.n8nService.initialize();

      // Make available globally for analysis service compatibility
      window.simpleN8nService = this.services.n8nService;
      console.log('V3PopupCore: Simple N8N service loaded and made available globally');
    } else {
      console.error('V3PopupCore: SimpleN8NService not found - N8N communication will fail');
    }

    // Initialize analysis service (orchestrates everything)
    if (window.AnalysisService) {
      this.services.analysisService = new window.AnalysisService();
      await this.services.analysisService.initialize();
    }

    // Store global references for compatibility
    window.v3Services = this.services;

    console.log('V3PopupCore: All services initialized');
  }

  /**
   * Validate critical services are properly initialized
   * @throws {Error} If critical services are missing or invalid
   */
  validateCriticalServices() {
    const criticalServices = ['stateManager'];
    const missingServices = [];

    for (const serviceName of criticalServices) {
      const service = this.services[serviceName];
      if (!service || typeof service !== 'object') {
        missingServices.push(serviceName);
      }
    }

    if (missingServices.length > 0) {
      throw new Error(`Critical services missing: ${missingServices.join(', ')}`);
    }

    // Validate StateManager specifically
    if (typeof this.services.stateManager.getState !== 'function') {
      throw new Error('StateManager missing required getState method');
    }

    console.log('V3PopupCore: All critical services validated successfully');
  }

  /**
   * Check basic requirements (simplified without crypto)
   * @returns {Promise<boolean>} Basic check result
   */
  async checkSecurityRequirements() {
    console.log('V3PopupCore: Checking basic requirements (crypto system removed)...');

    // Just check if services are ready
    return true;
  }

  /**
   * Determine initial view based on current state
   * @returns {Promise<void>}
   */
  async determineInitialView() {
    console.log('V3PopupCore: Determining initial view...');

    try {
      // Consent checking removed per user request

      // Check if user profile exists
      let userProfile = null;
      if (this.services.stateManager) {
        userProfile = this.services.stateManager.getState('user.profile');
      }

      if (!userProfile) {
        await this.showInitialSetupView();
        return;
      }

      // Get current tab to determine context
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab) {
        await this.showErrorView('Tab Error', 'Could not access current tab');
        return;
      }

      // Check if we're on a LinkedIn profile page
      if (this.isLinkedInProfilePage(currentTab.url)) {
        const userLinkedInUrl = await this.getUserLinkedInUrl();

        if (this.isSameProfile(currentTab.url, userLinkedInUrl)) {
          // User's own profile
          await this.showUserProfileView(userProfile);
        } else {
          // Target profile - start analysis
          await this.startTargetAnalysis(currentTab.id, currentTab.url);
        }
      } else {
        // Not on LinkedIn - show idle view
        await this.showIdleView(userProfile);
      }
    } catch (error) {
      console.error('V3PopupCore: Error determining initial view:', error);
      await this.showErrorView('Navigation Error', error.message);
    }
  }

  /**
   * Show consent view for user to grant permissions
   * @returns {Promise<void>}
   */
  async showConsentView() {
    console.log('V3PopupCore: Showing consent view...');

    if (!this.services.consentManager) {
      await this.showErrorView('Service Error', 'Consent manager not available');
      return;
    }

    try {
      // Request consent using the consent manager's UI
      const consentGranted = await this.services.consentManager.requestConsent();

      if (consentGranted) {
        // Consent granted - continue with initialization
        await this.determineInitialView();
      } else {
        // Consent denied - show message and close
        await this.showConsentDeniedView();
      }
    } catch (error) {
      console.error('V3PopupCore: Consent request failed:', error);
      await this.showErrorView('Consent Error', error.message);
    }
  }

  /**
   * Show initial setup view for new users
   * @returns {Promise<void>}
   */
  async showInitialSetupView() {
    console.log('V3PopupCore: Showing initial setup view...');

    // Load the main view (setup screen)
    await this.loadView('main', () => {
      this.setupInitialSetupHandlers();
    });
  }

  /**
   * Set up handlers for initial setup
   */
  setupInitialSetupHandlers() {
    const getStartedButton = document.getElementById('getStartedButton');
    if (getStartedButton) {
      getStartedButton.addEventListener('click', () => {
        this.handleInitialSetup();
      });
    }
  }

  /**
   * Handle initial setup process with V3 security
   * @returns {Promise<void>}
   */
  async handleInitialSetup() {
    try {
      console.log('V3PopupCore: Starting initial setup with profile capture...');

      // Get LinkedIn URL from input
      const linkedInUrlInput = document.getElementById('linkedin-url');
      const userLinkedInUrl = linkedInUrlInput?.value?.trim();

      if (!userLinkedInUrl || !userLinkedInUrl.includes('linkedin.com/in/')) {
        this.showInputError('Please enter a valid LinkedIn profile URL');
        return;
      }

      // Rate limiting removed per user request

      // 1) Show loading screen immediately
      await this.loadView('initial_loading', () => {
        this.setupAndAnimateLoadingScreen('loading');
      });

      // 2) Navigate current active tab (or create new one) to user's LinkedIn profile
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (activeTab) {
        await chrome.tabs.update(activeTab.id, { url: userLinkedInUrl, active: true });
        // Wait for navigation to complete
        await this.waitForTabLoad(activeTab.id);
        // Ensure the user sees the profile page immediately
        console.log('V3PopupCore: Navigated to LinkedIn profile tab and waiting for load');

        // 3) Scrape profile in the now-loaded active tab
        const userProfile = await this.scrapeAndValidateProfile(activeTab.id, 'user');

        // 4) Store profile in state manager
        if (this.services.stateManager) {
          await this.services.stateManager.updateUserProfile(userProfile, true);
        }

        // Persist settings
        await chrome.storage.local.set({
          userLinkedInUrl,
          appSettings: {
            userLinkedInUrl,
            n8nUrl: this.services.n8nService ? await this.services.n8nService.getWebhookUrl() : null
          }
        });

        console.log('V3PopupCore: Initial setup completed successfully');

        // 5) Transition to main interface (idle view)
        await this.showUserProfileView(userProfile);
      } else {
        throw new Error('No active tab found to navigate');
      }
    } catch (error) {
      console.error('V3PopupCore: Initial setup failed:', error);
      await this.showErrorView('Setup Failed', error.message);
    }
  }

  /**
   * Scrape user's own LinkedIn profile during initial setup
   * @param {string} userLinkedInUrl - User's LinkedIn profile URL
   * @returns {Promise<Object>} User profile data
   */
  async scrapeUserProfile(userLinkedInUrl) {
    try {
      console.log('V3PopupCore: Scraping user profile for initial setup...');

      // Find or create tab with user's LinkedIn profile
      const tabs = await chrome.tabs.query({ url: '*://www.linkedin.com/in/*' });
      let userTab = tabs.find(tab => tab.url === userLinkedInUrl);

      if (!userTab) {
        // Create new tab with user's profile
        userTab = await chrome.tabs.create({
          url: userLinkedInUrl,
          active: false // Don't switch to the tab
        });

        // Wait for tab to load
        await this.waitForTabLoad(userTab.id);
      }

      // Scrape profile data
      const userProfile = await this.scrapeAndValidateProfile(userTab.id, 'user');

      // Close tab if we created it
      if (!tabs.some(tab => tab.url === userLinkedInUrl)) {
        await chrome.tabs.remove(userTab.id);
      }

      return userProfile;

    } catch (error) {
      console.error('V3PopupCore: User profile scraping failed:', error);
      throw error;
    }
  }

  /**
   * Start target analysis with V3 security and validation
   * @param {number} tabId - Chrome tab ID
   * @param {string} targetUrl - Target profile URL
   * @returns {Promise<void>}
   */
  async startTargetAnalysis(tabId, targetUrl) {
    if (this.analysisInProgress) {
      console.log('V3PopupCore: Analysis already in progress');
      return;
    }

    try {
      console.log('V3PopupCore: Starting target analysis with progressive loading...');
      this.analysisInProgress = true;

      // Show loading screen
      await this.loadView('loading', () => {
        this.setupAndAnimateLoadingScreen('loading');
      });

      // Step 1: Scrape profile first (fast - 3-5s)
      console.log('V3PopupCore: Scraping profile data...');
      const profileData = await this.scrapeAndValidateProfile(tabId, 'target');

      // Step 2: Update StateManager with profile data for analysis  
      console.log('V3PopupCore: Updating StateManager with target profile...');
      if (this.services.stateManager) {
        await this.services.stateManager.updateTargetProfile(profileData, targetUrl);
      }

      // Step 3: Calculate score using existing analysis service (stay on loading screen)
      console.log('V3PopupCore: Starting complete score calculation...');
      if (!this.services.analysisService) {
        throw new Error('Analysis service not available');
      }

      console.log('V3PopupCore: About to call startAnalysis() with:', { tabId, targetUrl });
      const analysisResults = await this.services.analysisService.startAnalysis(tabId, targetUrl);

      console.log('V3PopupCore: startAnalysis() completed with results:', analysisResults);
      console.log('V3PopupCore: Analysis results type:', typeof analysisResults);
      console.log('V3PopupCore: Analysis results keys:', analysisResults ? Object.keys(analysisResults) : 'null/undefined');

      // Step 4: Show final results (single transition from loading to final score)
      console.log('V3PopupCore: Showing final results...');
      await this.showFinalResults(analysisResults.data);

      console.log('V3PopupCore: Target analysis completed successfully');
    } catch (error) {
      console.error('V3PopupCore: Target analysis failed:', error);

      // Log error for diagnostics
      if (this.services.diagnosticService) {
        this.services.diagnosticService.log(
          `Target analysis failed: ${error.message}`,
          this.services.diagnosticService.LOG_LEVELS.ERROR,
          this.services.diagnosticService.LOG_CATEGORIES.DATA_PIPELINE,
          { targetUrl, tabId, error: error.message }
        );
      }

      await this.showErrorView('Analysis Failed', error.message);
    } finally {
      this.analysisInProgress = false;
    }
  }

  /**
   * Scrape and validate profile using V3 components
   * @param {number} tabId - Chrome tab ID
   * @param {string} profileType - 'user' or 'target'
   * @returns {Promise<Object>} Validated profile data
   */
  async scrapeAndValidateProfile(tabId, profileType) {
    console.log(`V3PopupCore: Scraping and validating ${profileType} profile...`);

    // Execute LinkedIn scraper
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content_scripts/linkedin_scraper.js']
    });

    if (!injectionResults || !injectionResults[0]?.result) {
      throw new Error('Profile scraping failed - no data returned');
    }

    const scrapedData = injectionResults[0].result;

    if (scrapedData.error) {
      throw new Error(`Profile scraping failed: ${scrapedData.error}`);
    }

    // Validate using V3 validators
    if (this.services.dataValidators) {
      const validation = profileType === 'user'
        ? this.services.dataValidators.validateUserProfile(scrapedData)
        : this.services.dataValidators.validateTargetProfile(scrapedData);

      if (!validation.valid) {
        const errors = validation.errors.map(e => e.message).join('; ');
        throw new Error(`Profile validation failed: ${errors}`);
      }

      console.log(`V3PopupCore: ${profileType} profile validation passed with score ${validation.score}%`);
    }

    return scrapedData;
  }

  /**
   * Show final analysis results (single transition from loading to score screen)
   * @param {Object} analysisResults - Complete analysis results
   * @returns {Promise<void>}
   */
  async showFinalResults(analysisResults) {
    console.log('V3PopupCore: showFinalResults() called');
    console.log('V3PopupCore: analysisResults:', analysisResults);
    console.log('V3PopupCore: analysisResults type:', typeof analysisResults);
    console.log('V3PopupCore: analysisResults keys:', analysisResults ? Object.keys(analysisResults) : 'null/undefined');

    console.log('V3PopupCore: Transitioning to final results view');

    // Single transition from loading to final score screen
    await this.loadView('score_screen', () => {
      this.populateScoreScreen(analysisResults);
    });
  }

  /**
   * Update score display when calculation completes (DEPRECATED - use showFinalResults)
   * @param {Object} scoreResults - Score calculation results
   * @returns {Promise<void>}
   */
  async updateScoreDisplay(scoreResults) {
    console.log('V3PopupCore: updateScoreDisplay() called (DEPRECATED)');
    console.log('V3PopupCore: scoreResults:', scoreResults);
    console.log('V3PopupCore: scoreResults type:', typeof scoreResults);
    console.log('V3PopupCore: scoreResults keys:', scoreResults ? Object.keys(scoreResults) : 'null/undefined');

    // Update score element
    const scoreElement = document.getElementById('scoreValue');
    const progressCircle = document.getElementById('scoreProgressCircle');

    console.log('V3PopupCore: DOM elements found:', {
      scoreElement: !!scoreElement,
      progressCircle: !!progressCircle,
      scoreElementId: scoreElement?.id,
      progressCircleId: progressCircle?.id
    });

    if (scoreResults && scoreResults.score !== undefined) {
      console.log('V3PopupCore: Found valid score:', scoreResults.score);
      const targetScore = Math.round(scoreResults.score);
      console.log('V3PopupCore: Target score for animation:', targetScore);

      if (scoreElement) {
        // Reset font size in case it was changed during loading
        scoreElement.style.fontSize = '';

        // Use synchronized animation for perfect sync between counter and circle
        if (progressCircle) {
          console.log('V3PopupCore: Starting synchronized animation');
          this.animateSynchronizedScore(scoreElement, progressCircle, targetScore);
        } else {
          console.log('V3PopupCore: No progress circle found, using score counter only');
          // Fallback to score counter only if no progress circle
          this.animateScoreCounter(scoreElement, targetScore);
        }
      } else {
        console.error('V3PopupCore: No scoreElement found in DOM');
      }
    } else {
      console.warn('V3PopupCore: No valid score found in results:', {
        hasScoreResults: !!scoreResults,
        scoreValue: scoreResults?.score,
        scoreType: typeof scoreResults?.score
      });
    }

    // Update insights/reasons
    const reasonsList = document.getElementById('scoreReasonsList');
    console.log('V3PopupCore: Updating insights:', {
      hasReasonsList: !!reasonsList,
      hasInsights: !!scoreResults?.insights,
      insightsType: typeof scoreResults?.insights,
      insightsLength: Array.isArray(scoreResults?.insights) ? scoreResults.insights.length : 'not array',
      insights: scoreResults?.insights
    });

    if (reasonsList && scoreResults && Array.isArray(scoreResults.insights)) {
      console.log('V3PopupCore: Clearing and populating insights list');
      reasonsList.innerHTML = '';
      scoreResults.insights.forEach((insight, index) => {
        console.log(`V3PopupCore: Adding insight ${index}:`, insight);
        const li = document.createElement('li');
        li.textContent = insight;
        li.className = 'text-slate-600 text-xs font-normal leading-relaxed';
        reasonsList.appendChild(li);
      });
      console.log('V3PopupCore: Insights populated successfully');
    } else {
      console.warn('V3PopupCore: Cannot update insights - missing elements or data');
    }

    // Update timing metadata
    if (scoreResults.metadata) {
      const analysisTimeElement = document.getElementById('analysis-time');
      if (analysisTimeElement && scoreResults.metadata.processingTime) {
        const duration = Date.now() - scoreResults.metadata.processingTime;
        analysisTimeElement.textContent = `Analysis completed in ${Math.round(duration / 1000)}s`;
      }
    }
  }

  /**
   * Show analysis results
   * @param {Object} results - Analysis results
   * @returns {Promise<void>}
   */
  async showAnalysisResults(results) {
    console.log('V3PopupCore: Displaying analysis results...');

    await this.loadView('score_screen', () => {
      this.populateScoreScreen(results);
    });
  }

  /**
   * Populate score screen with results
   * @param {Object} results - Analysis results
   */
  populateScoreScreen(results) {
    // Update target profile information
    if (results.targetProfile) {
      const targetNameElement = document.getElementById('targetProfileName');
      const targetHeadlineElement = document.getElementById('targetProfileHeadline');
      const targetImageElement = document.getElementById('targetProfileImage');
      const targetSummaryElement = document.getElementById('targetSummary');

      if (targetNameElement) targetNameElement.textContent = results.targetProfile.name || 'Unknown';
      if (targetHeadlineElement) targetHeadlineElement.textContent = results.targetProfile.headline || 'No headline';
      if (targetSummaryElement) targetSummaryElement.textContent = results.targetProfile.summary || 'No summary available';

      // Use avatar from avatar manager  
      if (targetImageElement && results.targetProfile.avatarUrl) {
        targetImageElement.src = results.targetProfile.avatarUrl;
      } else if (targetImageElement && window.avatarManager) {
        // Fallback to avatar manager if no avatar URL in profile
        const avatarUrl = window.avatarManager.getAvatarForProfile(results.targetProfile, 'target');
        targetImageElement.src = avatarUrl;
      }

      // Populate target profile details
      this.populateExperience(results.targetProfile.experiences || [], 'targetExperienceContainer');
      this.populateEducation(results.targetProfile.education || [], 'targetEducationContainer');
      this.populateLicenses(results.targetProfile.licenses || [], 'targetLicensesContainer');
    }

    // Update score display with synchronized animation
    const scoreElement = document.getElementById('scoreValue');
    const progressCircle = document.getElementById('scoreProgressCircle');
    if (scoreElement && results.score !== undefined) {
      const targetScore = Math.round(results.score);

      // Use synchronized animation for perfect sync between counter and circle
      if (progressCircle) {
        this.animateSynchronizedScore(scoreElement, progressCircle, targetScore);
      } else {
        // Fallback to score counter only if no progress circle
        this.animateScoreCounter(scoreElement, targetScore);
      }
    }

    // Update insights/reasons
    const reasonsList = document.getElementById('scoreReasonsList');
    if (reasonsList && Array.isArray(results.insights)) {
      reasonsList.innerHTML = '';
      results.insights.forEach(insight => {
        const li = document.createElement('li');
        li.textContent = insight;
        li.className = 'text-slate-600 text-xs font-normal leading-relaxed';
        reasonsList.appendChild(li);
      });
    }

    // Update metadata if available
    if (results.metadata) {
      const analysisTimeElement = document.getElementById('analysis-time');
      if (analysisTimeElement && results.metadata.processingTime) {
        const duration = Date.now() - results.metadata.processingTime;
        analysisTimeElement.textContent = `Analysis completed in ${Math.round(duration / 1000)}s`;
      }
    }

    // Setup event handlers for score screen UI elements
    this.setupScoreScreenEventHandlers();
  }

  /**
   * Setup event handlers for score screen UI elements
   */
  setupScoreScreenEventHandlers() {
    console.log('V3PopupCore: Setting up score screen event handlers...');

    // View Scraped Information button toggle
    const scrapedInfoBtn = document.getElementById('scrapedInfoButton');
    const scrapedDetailsSection = document.getElementById('scrapedDetailsSection');

    if (scrapedInfoBtn && scrapedDetailsSection) {
      scrapedInfoBtn.addEventListener('click', () => {
        const isHidden = scrapedDetailsSection.classList.contains('hidden');
        scrapedDetailsSection.classList.toggle('hidden');
        scrapedInfoBtn.textContent = isHidden ? 'Hide Scraped Information' : 'View Scraped Information';
        console.log('V3PopupCore: Scraped info section toggled, visible:', !scrapedDetailsSection.classList.contains('hidden'));
      });
      console.log('V3PopupCore: Scraped info button event handler attached');
    } else {
      console.warn('V3PopupCore: Could not find scrapedInfoButton or scrapedDetailsSection');
    }

    // Setup menu dropdown
    this.setupMenuDropdown();

    // Setup navigation handlers
    this.setupNavigationHandlers();
  }

  /**
   * Setup menu dropdown functionality
   */
  setupMenuDropdown() {
    const menuToggleButton = document.getElementById('menuToggleButton');
    const menuDropdown = document.getElementById('menuDropdown');

    if (menuToggleButton && menuDropdown) {
      // Toggle menu on click
      menuToggleButton.addEventListener('click', (e) => {
        e.stopPropagation();
        menuDropdown.classList.toggle('hidden');
        menuToggleButton.setAttribute('aria-expanded',
          menuDropdown.classList.contains('hidden') ? 'false' : 'true');
        console.log('V3PopupCore: Menu dropdown toggled, visible:', !menuDropdown.classList.contains('hidden'));
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!menuToggleButton.contains(e.target) && !menuDropdown.contains(e.target)) {
          if (!menuDropdown.classList.contains('hidden')) {
            menuDropdown.classList.add('hidden');
            menuToggleButton.setAttribute('aria-expanded', 'false');
            console.log('V3PopupCore: Menu dropdown closed by outside click');
          }
        }
      });

      console.log('V3PopupCore: Menu dropdown event handlers attached');
    } else {
      console.warn('V3PopupCore: Could not find menuToggleButton or menuDropdown');
    }
  }

  /**
   * Setup navigation event handlers
   */
  setupNavigationHandlers() {
    const navMyProfileLink = document.getElementById('navMyProfileLink');
    const navSettingsLink = document.getElementById('navSettingsLink');

    if (navMyProfileLink) {
      navMyProfileLink.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log('V3PopupCore: My Profile navigation clicked');

        // Get user profile data from StateManager (same pattern as determineInitialView)
        try {
          let userProfile = null;
          if (this.services.stateManager) {
            userProfile = this.services.stateManager.getState('user.profile');
          }

          if (userProfile) {
            await this.showUserProfileView(userProfile);
          } else {
            console.warn('V3PopupCore: No user profile found in StateManager');
            await this.showIdleView(userProfile || {});
          }
        } catch (error) {
          console.error('V3PopupCore: Error loading user profile for navigation:', error);
          await this.showIdleView({});
        }
      });
      console.log('V3PopupCore: My Profile navigation handler attached');
    }

    if (navSettingsLink) {
      navSettingsLink.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('V3PopupCore: Settings navigation clicked');
        chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
      });
      console.log('V3PopupCore: Settings navigation handler attached');
    }
  }

  /**
   * Animate score counter from 0 to target value
   * @param {HTMLElement} element - Score display element
   * @param {number} targetScore - Target score value
   */
  animateScoreCounter(element, targetScore) {
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    const startScore = 0;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use linear progress for steady speed
      const linearProgress = progress;
      const currentScore = Math.round(startScore + (targetScore - startScore) * linearProgress);

      element.textContent = currentScore;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Animate progress circle filling up
   * @param {SVGCircleElement} circle - Progress circle element
   * @param {number} targetScore - Target score percentage
   */
  animateProgressCircle(circle, targetScore) {
    const circumference = 534; // 2 * π * 85
    const duration = 2000; // 2 seconds
    const startTime = performance.now();

    // Start from fully empty (strokeDashoffset = circumference)
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference;

    // Color based on target score
    let targetColor;
    if (targetScore >= 80) {
      targetColor = '#10b981'; // green
    } else if (targetScore >= 60) {
      targetColor = '#f59e0b'; // yellow  
    } else {
      targetColor = '#ef4444'; // red
    }

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use linear progress for steady speed
      const linearProgress = progress;
      const currentOffset = circumference - (circumference * (targetScore / 100) * linearProgress);

      circle.style.strokeDashoffset = currentOffset;
      circle.style.stroke = targetColor;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Animate score counter and progress circle in perfect synchronization
   * @param {HTMLElement} scoreElement - Score display element
   * @param {SVGCircleElement} circleElement - Progress circle element  
   * @param {number} targetScore - Target score value
   */
  animateSynchronizedScore(scoreElement, circleElement, targetScore) {
    console.log('V3PopupCore: Starting synchronized animation', {
      scoreElement: !!scoreElement,
      circleElement: !!circleElement,
      targetScore,
      scoreElementId: scoreElement?.id,
      circleElementId: circleElement?.id
    });

    const duration = 2000; // 2 seconds
    const startTime = performance.now(); // Shared timing source
    const startScore = 0;

    // Circle setup
    const circumference = 534; // 2 * π * 85
    circleElement.style.strokeDasharray = circumference;
    circleElement.style.strokeDashoffset = circumference;

    // Color based on target score
    let targetColor;
    if (targetScore >= 80) {
      targetColor = '#10b981'; // green
    } else if (targetScore >= 60) {
      targetColor = '#f59e0b'; // yellow  
    } else {
      targetColor = '#ef4444'; // red
    }

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use linear progress for steady speed (no easing curve)
      const linearProgress = progress;

      // Update score counter
      const currentScore = Math.round(startScore + (targetScore - startScore) * linearProgress);
      scoreElement.textContent = currentScore;

      // Update progress circle (synchronized with same linearProgress)
      const currentOffset = circumference - (circumference * (targetScore / 100) * linearProgress);
      circleElement.style.strokeDashoffset = currentOffset;
      circleElement.style.stroke = targetColor;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Show error view
   * @param {string} title - Error title
   * @param {string} message - Error message
   * @returns {Promise<void>}
   */
  async showErrorView(title, message) {
    console.log(`V3PopupCore: Showing error view - ${title}: ${message}`);

    await this.loadView('error', () => {
      const titleElement = document.getElementById('errorTitle');
      const messageElement = document.getElementById('errorMessageDetails');
      const tryAgainButton = document.getElementById('tryAgainButton');

      if (titleElement) titleElement.textContent = title;
      if (messageElement) messageElement.textContent = message;

      if (tryAgainButton) {
        tryAgainButton.addEventListener('click', () => {
          this.initialize();
        });
      }
    });
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Listen for state changes
    if (this.services.stateManager) {
      this.services.stateManager.subscribe('analysis.state.updated', (data) => {
        this.handleAnalysisStateChange(data);
      });
    }

    // Listen for diagnostic events
    if (this.services.diagnosticService) {
      // Add diagnostic panel toggle if in diagnostic mode
      this.setupDiagnosticPanel();
    }
  }

  /**
   * Handle analysis state changes
   * @param {Object} stateData - Analysis state data
   */
  handleAnalysisStateChange(stateData) {
    console.log('V3PopupCore: Analysis state changed:', stateData);

    // Update progress indicators if visible
    const progressBar = document.getElementById('progress-bar');
    if (progressBar && stateData.progress !== undefined) {
      progressBar.style.width = `${stateData.progress}%`;
    }

    // Update status text
    const statusElement = document.getElementById('analysis-status');
    if (statusElement && stateData.currentStep) {
      statusElement.textContent = this.getStepDisplayName(stateData.currentStep);
    }
  }

  /**
   * Get display name for analysis step
   * @param {string} step - Analysis step
   * @returns {string} Display name
   */
  getStepDisplayName(step) {
    const stepNames = {
      'consent_check': 'Checking permissions...',
      'rate_limit_check': 'Checking rate limits...',
      'user_profile_scraping': 'Loading your profile...',
      'target_profile_scraping': 'Analyzing target profile...',
      'data_validation': 'Validating data...',
      'n8n_analysis': 'Processing with AI...',
      'result_processing': 'Finalizing results...'
    };

    return stepNames[step] || 'Processing...';
  }

  /**
   * Set up diagnostic panel for debugging
   */
  setupDiagnosticPanel() {
    // This function is now empty to prevent the wrench icon from being created.
  }

  /**
 * Test animation with mock data (for development)
 * Call this from browser console: window.v3PopupCore.testAnimation()
 */
  async testAnimation() {
    console.log('🧪 Testing Score Animation...');

    try {
      // Load score screen directly
      await this.loadView('score_screen', () => {
        console.log('✅ Score screen loaded');
      });

      // Wait for view to load
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock analysis results (simulates what N8N would return)
      const mockResults = {
        score: 78, // Test score for animation
        insights: [
          "Shared experience in technology creates conversation opportunities",
          "Both located in same region - potential for in-person networking",
          "Complementary skills in AI and software engineering",
          "Similar career progression suggests good peer mentoring potential"
        ],
        metadata: {
          processingTime: Date.now() - 3000
        },
        targetProfile: {
          name: "Sarah Chen",
          headline: "AI Product Manager at TechCorp",
          avatarUrl: "https://i.imgur.com/B5YRmn3.png",
          summary: "Experienced product manager specializing in AI/ML products"
        }
      };

      console.log('🚀 Starting animation with score 78...');
      this.populateScoreScreen(mockResults);

      console.log('✅ Animation Test Complete!');
      console.log('📊 Watch: Counter and circle should animate smoothly from 0 to 78');

    } catch (error) {
      console.error('❌ Animation Test Failed:', error);
    }
  }

  /**
   * Test actual N8N connection
   * Call this from browser console: window.v3PopupCore.testN8NConnection()
   */
  async testN8NConnection() {
    console.log('🧪 Testing Real N8N Connection...');

    try {
      if (!window.simpleN8nService) {
        throw new Error('Simple N8N Service not available');
      }

      // Test connection first
      console.log('🔗 Testing N8N webhook connection...');
      const connectionTest = await window.simpleN8nService.testConnection();
      console.log('Connection test result:', connectionTest);

      if (!connectionTest.success) {
        throw new Error(`N8N connection failed: ${connectionTest.error}`);
      }

      // Test with real profile data
      console.log('📤 Sending real analysis request...');
      const mockProfileData = {
        userProfile: {
          name: "John Doe",
          headline: "Software Engineer at TechCorp",
          location: "San Francisco, CA",
          experience: ["Software Engineer at TechCorp"],
          education: ["Computer Science at Stanford"]
        },
        targetProfile: {
          name: "Jane Smith",
          headline: "Product Manager at StartupCo",
          location: "San Francisco, CA",
          experience: ["Product Manager at StartupCo"],
          education: ["MBA at Berkeley"]
        }
      };

      const results = await window.simpleN8nService.sendAnalysisRequest(mockProfileData);
      console.log('✅ N8N Response received:', results);

      // Show results with animation
      await this.loadView('score_screen');
      await new Promise(resolve => setTimeout(resolve, 500));
      this.populateScoreScreen({
        ...results,
        targetProfile: mockProfileData.targetProfile
      });

      console.log('🎉 Real N8N Integration Test Complete!');

    } catch (error) {
      console.error('❌ N8N Connection Test Failed:', error);
      alert(`N8N Test Failed: ${error.message}`);
    }
  }

  // Utility methods

  isLinkedInProfilePage(url) {
    return url && url.includes('linkedin.com/in/');
  }

  isSameProfile(url1, url2) {
    if (!url1 || !url2) return false;

    const normalize = (url) => {
      return url.toLowerCase()
        .replace(/https?:\/\/(www\.)?/, '')
        .replace(/\/+$/, '')
        .split('?')[0]
        .split('#')[0];
    };

    return normalize(url1) === normalize(url2);
  }

  async getUserLinkedInUrl() {
    try {
      const result = await chrome.storage.local.get('userLinkedInUrl');
      return result.userLinkedInUrl || null;
    } catch (error) {
      console.error('V3PopupCore: Error getting user LinkedIn URL:', error);
      return null;
    }
  }

  async waitForTabLoad(tabId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab load timeout'));
      }, 30000);

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

  async loadView(viewName, callback) {
    console.log(`V3PopupCore: Loading view "${viewName}"`);

    try {
      const response = await fetch(`../../ui/${viewName}.html`);
      if (!response.ok) {
        throw new Error(`Failed to load ${viewName}.html`);
      }

      const htmlContent = await response.text();
      const viewContainer = document.getElementById('view-container');

      if (viewContainer) {
        viewContainer.innerHTML = htmlContent;
        this.currentView = viewName;

        if (callback) {
          callback();
        }
      } else {
        throw new Error('View container not found');
      }
    } catch (error) {
      console.error('V3PopupCore: Error loading view:', error);
      throw error;
    }
  }

  setupAndAnimateLoadingScreen(gifKey) {
    setTimeout(() => {
      const loadingGif = document.getElementById('loading-gif');
      const progressBar = document.getElementById('progress-bar');

      if (progressBar) {
        progressBar.style.width = '5%';
        progressBar.classList.remove('progress-animated');

        setTimeout(() => {
          progressBar.classList.add('progress-animated');
        }, 50);
      }
    }, 200);
  }

  showInputError(message) {
    const errorElement = document.getElementById('linkedinUrlError');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.style.color = '#d32f2f';
    }
  }

  async showConsentDeniedView() {
    await this.loadView('consent_denied', () => {
      const message = document.getElementById('consent-message');
      if (message) {
        message.textContent = 'Extension requires user consent to function. Please restart and accept the terms to continue.';
      }
    });
  }

  async showUserProfileView(userProfile) {
    await this.loadView('profile', () => {
      this.populateUserProfile(userProfile);
      this.setupMenuDropdown();
      this.setupNavigationHandlers();
    });
  }

  async showIdleView(userProfile) {
    await this.loadView('idle', () => {
      this.populateIdleView(userProfile);
    });
  }

  populateUserProfile(profile) {
    // Populate profile display elements
    const nameElement = document.getElementById('profileName');
    const headlineElement = document.getElementById('profileHeadline');
    const locationElement = document.getElementById('profileLocation');
    const summaryElement = document.getElementById('profileSummary');
    const imageElement = document.getElementById('profileImage');

    if (nameElement) nameElement.textContent = profile.name || 'Unknown';
    if (headlineElement) headlineElement.textContent = profile.headline || 'No headline';
    if (locationElement) locationElement.textContent = profile.location || 'Location not specified';
    if (summaryElement) summaryElement.textContent = profile.summary || 'No summary available';

    // Use avatar from avatar manager
    if (imageElement && profile.avatarUrl) {
      imageElement.src = profile.avatarUrl;
    } else if (imageElement && window.avatarManager) {
      // Fallback to avatar manager if no avatar URL in profile
      const avatarUrl = window.avatarManager.getAvatarForProfile(profile, 'user');
      imageElement.src = avatarUrl;
    }

    // Populate experience
    this.populateExperience(profile.experiences || [], 'experienceContainer');

    // Populate education  
    this.populateEducation(profile.education || [], 'educationContainer');

    // Populate licenses
    this.populateLicenses(profile.licenses || [], 'licensesContainer');
  }

  populateIdleView(profile) {
    console.log('V3PopupCore: Populating idle view with profile:', profile);

    // Enhanced validation
    if (!profile || typeof profile !== 'object') {
      console.warn('V3PopupCore: No valid profile data for idle view');
      profile = {}; // Safe fallback
    }

    // Populate idle view with user info
    this.populateUserProfile(profile);

    // Add instructions
    const instructionsElement = document.getElementById('instructions');
    if (instructionsElement) {
      instructionsElement.textContent = 'Navigate to a LinkedIn profile to start analysis';
    }
  }

  /**
   * Populate experience section
   * @param {Array} experiences - Experience data
   * @param {string} containerId - Container element ID
   */
  populateExperience(experiences, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!experiences || experiences.length === 0) {
      container.innerHTML = `
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p class="text-slate-800 text-sm font-medium leading-normal">No experience data available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    experiences.forEach(exp => {
      const expDiv = document.createElement('div');
      expDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
      expDiv.innerHTML = `
        <h4 class="text-slate-800 text-sm font-semibold leading-normal">${exp.title || 'N/A'}</h4>
        <p class="text-slate-600 text-sm font-normal leading-normal">${exp.company || 'N/A'}</p>
        <p class="text-slate-500 text-xs font-normal leading-normal">${exp.dates || 'N/A'}</p>
        ${exp.location && exp.location !== 'N/A' ? `<p class="text-slate-500 text-xs font-normal leading-normal">${exp.location}</p>` : ''}
        ${exp.description && exp.description !== 'N/A' ? `<p class="text-slate-600 text-xs font-normal leading-relaxed mt-2">${exp.description}</p>` : ''}
      `;
      container.appendChild(expDiv);
    });
  }

  /**
   * Populate education section
   * @param {Array} education - Education data
   * @param {string} containerId - Container element ID
   */
  populateEducation(education, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!education || education.length === 0) {
      container.innerHTML = `
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p class="text-slate-800 text-sm font-medium leading-normal">No education data available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    education.forEach(edu => {
      const eduDiv = document.createElement('div');
      eduDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
      eduDiv.innerHTML = `
        <h4 class="text-slate-800 text-sm font-semibold leading-normal">${edu.degree || 'N/A'}</h4>
        <p class="text-slate-600 text-sm font-normal leading-normal">${edu.school || 'N/A'}</p>
        <p class="text-slate-500 text-xs font-normal leading-normal">${edu.dates || 'N/A'}</p>
        ${edu.fieldOfStudy && edu.fieldOfStudy !== 'N/A' ? `<p class="text-slate-500 text-xs font-normal leading-normal">${edu.fieldOfStudy}</p>` : ''}
      `;
      container.appendChild(eduDiv);
    });
  }

  /**
   * Populate licenses section
   * @param {Array} licenses - Licenses data
   * @param {string} containerId - Container element ID
   */
  populateLicenses(licenses, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!licenses || licenses.length === 0) {
      container.innerHTML = `
        <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <p class="text-slate-800 text-sm font-medium leading-normal">No licenses or certifications data available</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    licenses.forEach(license => {
      const licenseDiv = document.createElement('div');
      licenseDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
      licenseDiv.innerHTML = `
        <h4 class="text-slate-800 text-sm font-semibold leading-normal">${license.name || 'N/A'}</h4>
        <p class="text-slate-600 text-sm font-normal leading-normal">${license.issuingOrganization || 'N/A'}</p>
        <p class="text-slate-500 text-xs font-normal leading-normal">${license.issueDate || 'N/A'}</p>
        ${license.expirationDate && license.expirationDate !== 'N/A' ? `<p class="text-slate-500 text-xs font-normal leading-normal">Expires: ${license.expirationDate}</p>` : ''}
      `;
      container.appendChild(licenseDiv);
    });
  }
}

// Initialize V3 Popup Core when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('V3PopupCore: DOM loaded, initializing...');

  try {
    window.v3PopupCore = new V3PopupCore();
    await window.v3PopupCore.initialize();
  } catch (error) {
    console.error('V3PopupCore: Failed to initialize:', error);

    // Fallback error display
    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
      viewContainer.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h3 style="color: #d32f2f;">Initialization Failed</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
});

console.log('V3PopupCore: Script loaded'); 