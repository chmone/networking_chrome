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
    const serviceScripts = [
      // Security files removed per user request
      '../src/utils/avatar-manager.js',
      '../src/popup/components/state-manager.js',
      '../src/services/n8n-service-simple.js',
      '../src/services/analysis-service.js',
      '../src/core/validators.js',
      '../src/utils/logger.js'
    ];

    for (const script of serviceScripts) {
      try {
        await this.loadScript(script);
        console.log(`V3PopupCore: Loaded ${script}`);
      } catch (error) {
        console.warn(`V3PopupCore: Failed to load ${script}:`, error);
        // Continue loading other scripts
      }
    }
  }

  /**
   * Load a script dynamically
   * @param {string} src - Script source path
   * @returns {Promise<void>}
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize all services in correct dependency order
   * @returns {Promise<void>}
   */
  async initializeServices() {
    console.log('V3PopupCore: Initializing services...');

    // Initialize diagnostic service first (for logging)
    if (window.DiagnosticService) {
      this.services.diagnosticService = new window.DiagnosticService();
      await this.services.diagnosticService.initialize(true); // Enable diagnostic mode
    }

    // Crypto service removed per user request

    // Security services removed per user request

    // Initialize avatar manager (for random profile images)
    if (window.AvatarManager) {
      this.services.avatarManager = new window.AvatarManager();
      await this.services.avatarManager.loadAvatarConfig();
      await this.services.avatarManager.preloadAvatars(); // Preload for better performance
    }

    // Initialize state manager (core data management)
    if (window.StateManager) {
      this.services.stateManager = new window.StateManager();
      await this.services.stateManager.initialize();
    }

    // Initialize data validators
    if (window.DataValidators) {
      this.services.dataValidators = new window.DataValidators();
    }

    // Initialize N8N service (depends on crypto and state)
    // Use simple N8N service (crypto removed)
    if (window.SimpleN8NService) {
      this.services.n8nService = new window.SimpleN8NService();
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
    const getStartedButton = document.getElementById('get-started-btn');
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
      console.log('V3PopupCore: Starting initial setup...');

      // Get LinkedIn URL from input
      const linkedInUrlInput = document.getElementById('linkedin-url');
      const userLinkedInUrl = linkedInUrlInput?.value?.trim();

      if (!userLinkedInUrl || !userLinkedInUrl.includes('linkedin.com/in/')) {
        this.showInputError('Please enter a valid LinkedIn profile URL');
        return;
      }

      // Rate limiting removed per user request

      // Show loading screen
      await this.loadView('initial_loading', () => {
        this.setupAndAnimateLoadingScreen('loading');
      });

      // Navigate to user's LinkedIn profile
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      await chrome.tabs.update(currentTab.id, { url: userLinkedInUrl });

      // Wait for navigation and scrape user profile
      await this.waitForTabLoad(currentTab.id);

      // Scrape user profile with V3 validation
      const userProfile = await this.scrapeAndValidateProfile(currentTab.id, 'user');

      // Store user profile and LinkedIn URL
      if (this.services.stateManager) {
        await this.services.stateManager.updateUserProfile(userProfile, true);
      }

      await chrome.storage.local.set({
        userLinkedInUrl: userLinkedInUrl,
        appSettings: {
          userLinkedInUrl: userLinkedInUrl,
          n8nUrl: this.services.n8nService ? await this.services.n8nService.getWebhookUrl() : null
        }
      });

      console.log('V3PopupCore: Initial setup completed successfully');

      // Show success and transition to main interface
      await this.showUserProfileView(userProfile);
    } catch (error) {
      console.error('V3PopupCore: Initial setup failed:', error);
      await this.showErrorView('Setup Failed', error.message);
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
      console.log('V3PopupCore: Starting target analysis...');
      this.analysisInProgress = true;

      // Show loading screen
      await this.loadView('loading', () => {
        this.setupAndAnimateLoadingScreen('loading');
      });

      // Use the analysis service for complete workflow
      if (!this.services.analysisService) {
        throw new Error('Analysis service not available');
      }

      // Start the complete V3 analysis workflow
      const analysisResults = await this.services.analysisService.startAnalysis(tabId, targetUrl);

      // Show results
      await this.showAnalysisResults(analysisResults);

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

    // Update score display with animation
    const scoreElement = document.getElementById('scoreValue');
    const progressCircle = document.getElementById('scoreProgressCircle');
    if (scoreElement && results.score !== undefined) {
      const targetScore = Math.round(results.score);

      // Animate score counter
      this.animateScoreCounter(scoreElement, targetScore);

      // Animate progress circle
      if (progressCircle) {
        this.animateProgressCircle(progressCircle, targetScore);
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

      // Use easeOutCubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentScore = Math.round(startScore + (targetScore - startScore) * easeProgress);

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

      // Use easeOutCubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentOffset = circumference - (circumference * (targetScore / 100) * easeProgress);

      circle.style.strokeDashoffset = currentOffset;
      circle.style.stroke = targetColor;

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
    // Add diagnostic toggle button
    const diagnosticToggle = document.createElement('button');
    diagnosticToggle.id = 'diagnostic-toggle';
    diagnosticToggle.textContent = '🔧';
    diagnosticToggle.style.cssText = `
      position: fixed; top: 10px; right: 10px; z-index: 9999;
      background: #007bb5; color: white; border: none; 
      border-radius: 50%; width: 30px; height: 30px; cursor: pointer;
    `;

    diagnosticToggle.addEventListener('click', () => {
      this.toggleDiagnosticPanel();
    });

    document.body.appendChild(diagnosticToggle);
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

  /**
   * Toggle diagnostic panel
   */
  async toggleDiagnosticPanel() {
    const existingPanel = document.getElementById('diagnostic-panel');

    if (existingPanel) {
      existingPanel.remove();
      return;
    }

    // Create diagnostic panel
    const panel = document.createElement('div');
    panel.id = 'diagnostic-panel';
    panel.style.cssText = `
      position: fixed; top: 50px; right: 10px; width: 300px; height: 400px;
      background: white; border: 1px solid #ccc; border-radius: 8px;
      z-index: 9999; padding: 15px; overflow-y: auto; font-size: 12px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    `;

    // Get diagnostic report
    if (this.services.diagnosticService) {
      const report = await this.services.diagnosticService.createDiagnosticReport();
      panel.innerHTML = `<pre>${report}</pre>`;
    } else {
      panel.innerHTML = '<p>Diagnostic service not available</p>';
    }

    document.body.appendChild(panel);
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
    try {
      const response = await fetch(`../ui/${viewName}.html`);
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