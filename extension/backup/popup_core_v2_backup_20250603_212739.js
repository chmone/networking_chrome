// extension/popup/popup_core.js

// --- Configuration ---
const HARDCODED_N8N_URL = 'https://chmones.app.n8n.cloud/webhook/f6b44e83-72af-42fa-9b57-7b25d200e41b'; // TODO: Replace with actual N8N webhook URL

// --- State Management (Conceptual from rules/system.md 6.C) ---
let currentView = 'loading'; // Default view
let userProfile = null;
let targetProfileScrapedData = null;
let n8nScoreData = null;
let isLoading = false;
let currentError = null;
let appSettings = { n8nUrl: HARDCODED_N8N_URL, userLinkedInUrl: '', autoOpen: true }; // Use hardcoded N8N URL
let lastUserActionContext = null; // For error recovery "Try Again" functionality

// --- View Management ---

/**
 * Loads an HTML view from the ui/ directory into the #view-container.
 * @param {string} viewName - The name of the HTML file (without .html) to load.
 * @param {function} [callback] - Optional callback function to execute after the view is loaded.
 */
async function loadView(viewName, callback) {
  console.log(`Attempting to load view: ${viewName}`);
  isLoading = true;
  currentView = viewName;
  // Update some kind of global loading indicator if necessary

  try {
    const response = await fetch(`../ui/${viewName}.html`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${viewName}.html: ${response.status} ${response.statusText}`);
    }
    const htmlContent = await response.text();
    const viewContainer = document.getElementById('view-container');
    if (viewContainer) {
      viewContainer.innerHTML = htmlContent;
      console.log(`${viewName}.html loaded successfully.`);
      if (callback && typeof callback === 'function') {
        callback();
      }
    } else {
      throw new Error('#view-container not found in popup_shell.html');
    }
  } catch (error) {
    console.error('Error loading view:', error);
    // displayError('Failed to load view', error.message); // Call a more robust error display function
    currentError = { message: 'Failed to load view', details: error.message };
    // Potentially load a default error view or show message in current view
  } finally {
    isLoading = false;
    // Update loading indicator
  }
}

// --- Event Handlers (Placeholders) ---

function handleInitialSetup() {
  console.log('Handling initial setup...');
  // Logic for when ui/main.html is loaded and user interacts
}

function handleTargetProfileAnalysis() {
  console.log('Handling target profile analysis...');
  // Logic for scraping target, calling N8N, displaying score
}

function handleSaveSettings() {
  console.log('Handling save settings...');
  // Logic for when settings/settings.html is active
}

// Placeholder for displayError function (Task 1.8)
async function displayError(message, details = '', errorCode = '') {
  console.error('Error to display:', message, details);
  currentError = { message, details, errorCode }; // Store error state

  loadView('error', () => {
    const errorTitleElement = document.getElementById('errorTitle');
    const errorMessageElement = document.getElementById('errorMessageDetails');
    const errorCodeElement = document.getElementById('errorCodeDisplay');
    const tryAgainButton = document.getElementById('tryAgainButton');

    if (errorTitleElement) errorTitleElement.textContent = message;
    if (errorMessageElement) errorMessageElement.textContent = details || 'An unexpected error occurred. Please try again.';
    if (errorCodeElement) errorCodeElement.textContent = errorCode ? `Error Code: ${errorCode}` : 'Error Code: GENERAL_ERROR';

    if (tryAgainButton) {
      tryAgainButton.addEventListener('click', () => {
        console.log('Try Again button clicked. Attempting to recover...');
        // For V2 MVP, simple recovery: re-initialize the popup
        // More sophisticated recovery based on lastUserActionContext can be implemented later
        if (lastUserActionContext) {
          console.log('Last action context:', lastUserActionContext);
          // TODO: Implement specific action retry based on context
          // For now, just re-initialize
        }
        initializePopup();
      });
    }
  });
}

function handleGetStartedClick() {
  console.log('"Get Started" button clicked.');
  const linkedInUrlInput = document.getElementById('linkedin-url');
  const urlErrorElement = document.getElementById('linkedinUrlError');
  const userLinkedInUrl = linkedInUrlInput ? linkedInUrlInput.value : '';

  // Clear previous errors
  if (urlErrorElement) urlErrorElement.textContent = '';

  // Validate LinkedIn URL
  if (!userLinkedInUrl || !userLinkedInUrl.includes('linkedin.com/in/')) {
    console.error('Invalid LinkedIn Profile URL.');
    if (urlErrorElement) urlErrorElement.textContent = 'Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/yourprofile).';
    return;
  }

  console.log(`User entered LinkedIn URL: ${userLinkedInUrl}`);
  console.log(`Using hardcoded N8N URL: ${HARDCODED_N8N_URL}`);
  
  // Store context for error recovery
  lastUserActionContext = {
    action: 'initialSetup',
    data: { userLinkedInUrl, n8nUrl: HARDCODED_N8N_URL }
  };
  
  // Save settings immediately with hardcoded N8N URL
  appSettings.n8nUrl = HARDCODED_N8N_URL;
  appSettings.userLinkedInUrl = userLinkedInUrl;
  appSettings.autoOpen = true; // Default setting during setup
  
  chrome.storage.local.set({ 
    appSettings,
    n8nWebhookUrl: HARDCODED_N8N_URL,
    userLinkedInUrl: userLinkedInUrl,
    settings_autoOpenPopup: true
  }, () => {
    if (chrome.runtime.lastError) {
      console.error(`Error saving settings: ${chrome.runtime.lastError.message}`);
      displayError('Setup Error', `Failed to save settings: ${chrome.runtime.lastError.message}`);
      return;
    }
    console.log('Settings saved during initial setup with hardcoded N8N URL.');
    
    loadView('loading'); // Show loading screen before navigation
    
    // Continue with navigation and scraping...
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
          console.error(`Error querying tabs: ${chrome.runtime.lastError.message}`);
          displayError('Setup Error', `Could not query active tab: ${chrome.runtime.lastError.message}`);
          return;
      }
      if (tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.tabs.update(tabId, { url: userLinkedInUrl }, () => {
          if (chrome.runtime.lastError) {
              console.error(`Error navigating tab: ${chrome.runtime.lastError.message}`);
              displayError('Navigation Error', `Failed to navigate to URL: ${userLinkedInUrl}. ${chrome.runtime.lastError.message}`);
              return;
          }
          console.log(`Tab ${tabId} navigating to ${userLinkedInUrl}`);
          
          const onTabUpdatedListener = (updatedTabId, changeInfo, tab) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete' && tab && tab.url === userLinkedInUrl) {
              chrome.tabs.onUpdated.removeListener(onTabUpdatedListener);
              console.log(`Tab ${tabId} finished loading ${userLinkedInUrl}. Ready to scrape user profile.`);
              
              // Actually scrape the user's profile (not dummy data)
              console.log('Injecting LinkedIn scraper to get user profile...');
              chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content_scripts/linkedin_scraper.js']
              }, (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
                  console.error('User profile scraping failed:', chrome.runtime.lastError || 'No result from scraper');
                  displayError('Scraping Error', 'Could not retrieve your profile data from LinkedIn. Please ensure the page has loaded completely.');
                  return;
                }
                
                const scrapedResult = injectionResults[0].result;
                
                // Check if scraper returned an error
                if (scrapedResult.error) {
                  console.error('User profile scraping error:', scrapedResult.error);
                  displayError('Profile Scraping Failed', scrapedResult.error);
                  return;
                }
                
                const userScrapedData = scrapedResult;
                console.log('User profile scraped successfully:', userScrapedData);
                userProfile = userScrapedData;
                
                chrome.storage.local.set({ userLinkedInProfileData: userScrapedData }, () => {
                  if (chrome.runtime.lastError) {
                    console.error(`Error saving user profile: ${chrome.runtime.lastError.message}`);
                    displayError('Storage Error', `Failed to save profile data: ${chrome.runtime.lastError.message}`);
                    return;
                  }
                  console.log('User LinkedIn profile data saved to storage.');
                  displayUserProfile(userScrapedData);
                });
              });
            }
          };
          chrome.tabs.onUpdated.addListener(onTabUpdatedListener);
        });
      } else {
        console.error('Could not get active tab ID.');
        displayError('Setup Error', 'Could not identify active tab to navigate.');
      }
    });
  });
}

// NEW FUNCTION START
/**
 * Populates the profile.html view with the given profile data.
 * @param {object} profileData - The scraped profile data.
 */
function populateProfileView(profileData) {
  if (!profileData) {
    console.warn('populateProfileView called with no profileData.');
    return;
  }

  const nameEl = document.getElementById('profileName');
  const headlineEl = document.getElementById('profileHeadline');
  const summaryEl = document.getElementById('profileSummary');
  const imageDiv = document.getElementById('profileImage');
  const expContainer = document.getElementById('experienceContainer');
  const eduContainer = document.getElementById('educationContainer');
  const licContainer = document.getElementById('licensesContainer');

  if (nameEl) nameEl.textContent = profileData.name || '[Name not available]';
  if (headlineEl) headlineEl.textContent = profileData.headline || '[Headline not available]';
  if (summaryEl) summaryEl.textContent = profileData.summary || '[Summary not available]';
  if (imageDiv && profileData.profileImageUrl) {
    imageDiv.style.backgroundImage = `url(${profileData.profileImageUrl})`;
  } else if (imageDiv) {
    imageDiv.style.backgroundImage = 'url(https://via.placeholder.com/112)'; // Default placeholder
  }

  // Populate Experience
  if (expContainer) {
    expContainer.innerHTML = ''; // Clear placeholder
    if (profileData.experiences && profileData.experiences.length > 0) {
      profileData.experiences.forEach(exp => {
        const expDiv = document.createElement('div');
        expDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
        expDiv.innerHTML = `
          <p class="text-slate-800 text-sm font-medium leading-normal">${exp.title || ''} ${exp.company ? `at ${exp.company}` : ''}</p>
          <p class="text-slate-500 text-xs font-normal leading-normal mt-0.5">${exp.dates || exp.duration || ''}</p>
          ${exp.description ? `<p class="text-slate-600 text-xs mt-1">${exp.description}</p>` : ''}
        `;
        expContainer.appendChild(expDiv);
      });
    } else {
      expContainer.innerHTML = '<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-slate-800 text-sm font-medium leading-normal">[No experience data available]</p></div>';
    }
  }

  // Populate Education
  if (eduContainer) {
    eduContainer.innerHTML = ''; // Clear placeholder
    if (profileData.education && profileData.education.length > 0) {
      profileData.education.forEach(edu => {
        const eduDiv = document.createElement('div');
        eduDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
        eduDiv.innerHTML = `
          <p class="text-slate-800 text-sm font-medium leading-normal">${edu.degree || ''}</p>
          <p class="text-slate-600 text-xs leading-normal mt-0.5">${edu.schoolName || edu.school || ''}</p>
          <p class="text-slate-500 text-xs font-normal leading-normal mt-0.5">${edu.dates || edu.duration || ''}</p>
        `;
        eduContainer.appendChild(eduDiv);
      });
    } else {
      eduContainer.innerHTML = '<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-slate-800 text-sm font-medium leading-normal">[No education data available]</p></div>';
    }
  }

  // Populate Licenses & Certifications
  if (licContainer) {
    licContainer.innerHTML = '';
    if (profileData.licenses && profileData.licenses.length > 0) {
      profileData.licenses.forEach(lic => {
        const licDiv = document.createElement('div');
        licDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
        licDiv.innerHTML = `
          <p class="text-slate-800 text-sm font-medium leading-normal">${lic.name || ''}</p>
          ${lic.issuingOrg || lic.issuer ? `<p class="text-slate-600 text-xs leading-normal mt-0.5">Issuer: ${lic.issuingOrg || lic.issuer}</p>` : ''}
          ${lic.issueDate || lic.date ? `<p class="text-slate-500 text-xs font-normal leading-normal mt-0.5">${lic.issueDate || lic.date}</p>` : ''}
        `;
        licContainer.appendChild(licDiv);
      });
    } else {
      licContainer.innerHTML = '<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-slate-800 text-sm font-medium leading-normal">[No licenses or certifications data available]</p></div>';
    }
  }

  // Setup menu dropdown functionality for profile view
  const menuToggleButton = document.getElementById('menuToggleButton');
  const menuDropdown = document.getElementById('menuDropdown');
  if (menuToggleButton && menuDropdown) {
    menuToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('hidden');
      console.log('Menu dropdown toggled in profile view.');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggleButton.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.add('hidden');
      }
    });
  }

  const myProfileLink = document.getElementById('navMyProfileLink');
  if (myProfileLink) {
    myProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (menuDropdown) menuDropdown.classList.add('hidden');
      console.log('My Profile link clicked from profile view.');
      // Since we're already in the profile view, just reload it or do nothing
      console.log('Already viewing profile.');
    });
  }

  const settingsLink = document.getElementById('navSettingsLink');
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (menuDropdown) menuDropdown.classList.add('hidden');
      console.log('Settings link clicked from profile view.');
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        console.warn('chrome.runtime.openOptionsPage is not available.');
      }
    });
  }
}
// NEW FUNCTION END

// NEW FUNCTION START
/**
 * Loads and displays the user's own profile.
 * @param {object} profileData - The user's profile data. If null, tries to use global userProfile.
 */
async function displayUserProfile(profileData) {
  console.log('Attempting to display user profile...');
  const dataToDisplay = profileData || userProfile;

  if (!dataToDisplay) {
    console.warn('No profile data available to display. Loading main setup view.');
    loadView('main', () => { // Ensure main view setup logic is re-attached if needed
      const getStartedBtn = document.getElementById('getStartedButton');
      if (getStartedBtn && !getStartedBtn.getAttribute('listenerAttached')) { // Avoid double listeners
        getStartedBtn.addEventListener('click', handleGetStartedClick);
        getStartedBtn.setAttribute('listenerAttached', 'true');
      }
    });
    return;
  }

  console.log('Loading score screen with user profile data (100% match):', dataToDisplay);
  
  // Create a special score info for the user's own profile
  const userScoreInfo = {
    connectionScore: 100,
    compatibilityPercentage: 100,
    insights: [
      "It's you! Perfect match.",
      "All your skills and experience align perfectly.",
      "You know yourself best."
    ],
    recommendations: [
      "Consider expanding your network to find similar professionals",
      "Update your profile regularly to attract the right connections",
      "Review your headline and summary for maximum impact"
    ]
  };
  
  loadView('score_screen', () => populateScoreScreen(dataToDisplay, userScoreInfo, true)); // Pass true to indicate this is user's own profile
}
// NEW FUNCTION END

// NEW FUNCTIONS START
/**
 * Populates the score screen view with target profile data and networking score.
 * @param {object} targetData - The scraped profile data from LinkedIn.
 * @param {object} scoreInfo - Networking score and analysis information.
 * @param {boolean} isUserProfile - Whether this is the user's own profile.
 */
function populateScoreScreen(targetData, scoreInfo, isUserProfile = false) {
  if (!targetData || !scoreInfo) {
    console.error('populateScoreScreen: Missing required parameters.');
    displayError('Data Error', 'Cannot display score screen without profile data and score information.');
    return;
  }

  console.log('Populating score screen with:', { targetData, scoreInfo, isUserProfile });

  // Populate profile information
  const targetNameElement = document.getElementById('targetProfileName');
  const targetHeadlineElement = document.getElementById('targetProfileHeadline');
  const targetImageElement = document.getElementById('targetProfileImage');

  if (targetNameElement) {
    targetNameElement.textContent = targetData.name || '[Target Name]';
  }
  if (targetHeadlineElement) {
    targetHeadlineElement.textContent = targetData.headline || '[Target Headline]';
  }
  if (targetImageElement && targetData.profileImageUrl) {
    targetImageElement.style.backgroundImage = `url("${targetData.profileImageUrl}")`;
  }

  // Add special styling or text for user's own profile
  if (isUserProfile) {
    if (targetNameElement) {
      targetNameElement.innerHTML = `${targetData.name || '[Your Name]'} <span class="text-blue-600">(You)</span>`;
    }
  }

  // Populate Score
  const scoreValueEl = document.getElementById('scoreValue');
  const scoreProgressCircleEl = document.getElementById('scoreProgressCircle');
  if (scoreValueEl) scoreValueEl.textContent = scoreInfo.score !== undefined ? scoreInfo.score.toString() : '--';
  if (scoreProgressCircleEl) {
    const circumference = 2 * Math.PI * parseFloat(scoreProgressCircleEl.getAttribute('r')); // 2 * PI * 45 = 282.7~
    const offset = circumference - (scoreInfo.score / 100) * circumference;
    scoreProgressCircleEl.style.strokeDasharray = `${circumference}`;
    scoreProgressCircleEl.style.strokeDashoffset = offset;
    // Optional: Change color based on score
    if (scoreInfo.score < 40) scoreProgressCircleEl.style.stroke = '#ef4444'; // red
    else if (scoreInfo.score < 70) scoreProgressCircleEl.style.stroke = '#f59e0b'; // amber
    else scoreProgressCircleEl.style.stroke = '#22c55e'; // green
  }

  // Populate Reasons
  const reasonsListEl = document.getElementById('scoreReasonsList');
  if (reasonsListEl) {
    reasonsListEl.innerHTML = ''; // Clear placeholders
    if (scoreInfo.reasons_bullets && scoreInfo.reasons_bullets.length > 0) {
      scoreInfo.reasons_bullets.forEach(reason => {
        const li = document.createElement('li');
        li.textContent = reason;
        reasonsListEl.appendChild(li);
      });
    } else {
      reasonsListEl.innerHTML = '<li>[No reasons provided]</li>';
    }
  }

  // Populate Scraped Details Section (for Task 1.6 - initially hidden)
  // This uses the same logic as populateProfileView, but for target elements.
  const targetSummaryEl = document.getElementById('targetSummary');
  const targetExpContainer = document.getElementById('targetExperienceContainer');
  const targetEduContainer = document.getElementById('targetEducationContainer');
  const targetLicContainer = document.getElementById('targetLicensesContainer');

  if (targetSummaryEl) targetSummaryEl.textContent = targetData.summary || '[Summary not available]';

  // Populate Target Experience
  if (targetExpContainer) {
    targetExpContainer.innerHTML = '';
    if (targetData.experiences && targetData.experiences.length > 0) {
      targetData.experiences.forEach(exp => {
        const expDiv = document.createElement('div');
        expDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
        expDiv.innerHTML = `<p class="text-slate-800 text-sm font-medium leading-normal">${exp.title || ''} ${exp.company ? `at ${exp.company}` : ''}</p><p class="text-slate-500 text-xs font-normal leading-normal mt-0.5">${exp.dates || exp.duration || ''}</p>${exp.description ? `<p class="text-slate-600 text-xs mt-1">${exp.description}</p>` : ''}`;
        targetExpContainer.appendChild(expDiv);
      });
    } else {
      targetExpContainer.innerHTML = '<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-slate-800 text-sm font-medium leading-normal">[No experience data available]</p></div>';
    }
  }

  // Populate Target Education
  if (targetEduContainer) {
    targetEduContainer.innerHTML = '';
    if (targetData.education && targetData.education.length > 0) {
      targetData.education.forEach(edu => {
        const eduDiv = document.createElement('div');
        eduDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
        eduDiv.innerHTML = `<p class="text-slate-800 text-sm font-medium leading-normal">${edu.degree || ''}</p><p class="text-slate-600 text-xs leading-normal mt-0.5">${edu.schoolName || edu.school || ''}</p><p class="text-slate-500 text-xs font-normal leading-normal mt-0.5">${edu.dates || edu.duration || ''}</p>`;
        targetEduContainer.appendChild(eduDiv);
      });
    } else {
      targetEduContainer.innerHTML = '<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-slate-800 text-sm font-medium leading-normal">[No education data available]</p></div>';
    }
  }

  // Populate Target Licenses & Certifications
  if (targetLicContainer) {
    targetLicContainer.innerHTML = '';
    if (targetData.licenses && targetData.licenses.length > 0) {
      targetData.licenses.forEach(lic => {
        const licDiv = document.createElement('div');
        licDiv.className = 'bg-slate-50 p-4 rounded-lg border border-slate-200';
        licDiv.innerHTML = `<p class="text-slate-800 text-sm font-medium leading-normal">${lic.name || ''}</p>${lic.issuingOrg || lic.issuer ? `<p class="text-slate-600 text-xs leading-normal mt-0.5">Issuer: ${lic.issuingOrg || lic.issuer}</p>` : ''}${lic.issueDate || lic.date ? `<p class="text-slate-500 text-xs font-normal leading-normal mt-0.5">${lic.issueDate || lic.date}</p>` : ''}`;
        targetLicContainer.appendChild(licDiv);
      });
    } else {
      targetLicContainer.innerHTML = '<div class="bg-slate-50 p-4 rounded-lg border border-slate-200"><p class="text-slate-800 text-sm font-medium leading-normal">[No licenses data available]</p></div>';
    }
  }

  // Setup Event Listeners for buttons on this screen (Tasks 1.6 and 1.7)
  const scrapedInfoBtn = document.getElementById('scrapedInfoButton');
  if (scrapedInfoBtn) {
    scrapedInfoBtn.addEventListener('click', () => {
      // Logic for Task 1.6: Toggle visibility of scrapedDetailsSection
      const detailsSection = document.getElementById('scrapedDetailsSection');
      if (detailsSection) detailsSection.classList.toggle('hidden');
      console.log('Scraped Info button clicked, toggling details.');
    });
  }

  // Setup menu dropdown toggle
  const menuToggleButton = document.getElementById('menuToggleButton');
  const menuDropdown = document.getElementById('menuDropdown');
  if (menuToggleButton && menuDropdown) {
    menuToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle('hidden');
      console.log('Menu dropdown toggled.');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggleButton.contains(e.target) && !menuDropdown.contains(e.target)) {
        menuDropdown.classList.add('hidden');
      }
    });
  }

  const myProfileLink = document.getElementById('navMyProfileLink');
  if (myProfileLink) {
    myProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Close dropdown when clicking a menu item
      if (menuDropdown) menuDropdown.classList.add('hidden');
      // Logic for Task 1.7: Navigate to user profile
      console.log('My Profile link clicked.');
      if (userProfile) {
        displayUserProfile(userProfile);
      } else {
        // If somehow userProfile isn't loaded, perhaps try loading from storage or go to setup
        chrome.storage.local.get('userLinkedInProfileData', (items) => {
          if (items.userLinkedInProfileData) {
            userProfile = items.userLinkedInProfileData;
            displayUserProfile(userProfile);
          } else {
            loadView('main'); // Go to setup if no profile
          }
        });
      }
    });
  }

  const settingsLink = document.getElementById('navSettingsLink');
  if (settingsLink) {
    settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Close dropdown when clicking a menu item
      if (menuDropdown) menuDropdown.classList.add('hidden');
      // Logic for Task 1.7: Navigate to settings
      console.log('Settings link clicked.');
      // As per manifest.json, settings.html is the options_page.
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // Fallback for environments where openOptionsPage might not be available (e.g. testing)
        // or if we decide settings can also be a view.
        console.warn('chrome.runtime.openOptionsPage is not available. Consider loading as a view or check context.');
        // loadView('settings', () => { ... }); // Fallback if settings can be a popup view
      }
    });
  }

  const viewFullProfileLink = document.getElementById('viewFullProfileLink');
  if (viewFullProfileLink && targetData.profileUrl) {
    viewFullProfileLink.href = targetData.profileUrl;
    viewFullProfileLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open LinkedIn profile in a new tab
      chrome.tabs.create({ url: targetData.profileUrl });
      console.log('View Full Profile link clicked, opening:', targetData.profileUrl);
    });
  } else if (viewFullProfileLink && !targetData.profileUrl) {
    viewFullProfileLink.style.display = 'none'; // Hide if no profile URL available
  }
}

/**
 * Loads and displays the score screen for a target profile.
 * @param {object} targetData - The scraped data of the target profile.
 * @param {object} scoreInfo - The scoring information from N8N ({ score, reasons_bullets }).
 */
async function displayScoreScreen(targetData, scoreInfo) {
  console.log('Displaying score screen for target:', targetData, 'with scoreInfo:', scoreInfo);
  loadView('score_screen', () => populateScoreScreen(targetData, scoreInfo));
}
// NEW FUNCTIONS END

// --- Initialization ---

/**
 * Initializes the popup extension.
 * Determines the initial view to load based on stored settings and current context.
 */
async function initializePopup() {
  console.log('Initializing popup...');
  // 1. Load settings from chrome.storage.local
  try {
    const items = await chrome.storage.local.get([
      'appSettings',
      'userLinkedInProfileData',
      'profileCleared',
      'contextReady',
      'targetProfileUrl',
      'targetProfileTabId'
    ]);

    if (chrome.runtime.lastError) {
      console.error("Error loading from storage:", chrome.runtime.lastError.message);
      // Fallback to default appSettings (already initialized)
    } else {
      if (items.appSettings) {
        appSettings = items.appSettings;
        console.log('Loaded appSettings:', appSettings);
      }
      if (items.userLinkedInProfileData) {
        userProfile = items.userLinkedInProfileData;
        console.log('Loaded userProfile data from storage.');
      }

      // Check for profile cleared flag
      if (items.profileCleared) {
        console.log('Profile was cleared, transitioning to setup.');
        // Clear the flag and force setup mode
        chrome.storage.local.remove('profileCleared');
        userProfile = null; // Ensure we go to setup
      }

      // Check for target profile analysis context
      if (items.contextReady && items.targetProfileUrl && items.targetProfileTabId) {
        console.log('Target profile analysis context detected:', items.targetProfileUrl);

        // Check if user is fully set up for analysis
        if (appSettings.n8nUrl && userProfile) {
          console.log('User is set up, initiating target profile analysis...');

          // Store context for error recovery
          lastUserActionContext = {
            action: 'analyzeTarget',
            data: {
              targetUrl: items.targetProfileUrl,
              tabId: items.targetProfileTabId
            }
          };

          // Clear the context flags to prevent re-triggering
          chrome.storage.local.remove(['contextReady']);

          // Start the target analysis flow
          await analyzeTargetProfile(items.targetProfileTabId, items.targetProfileUrl);
          return; // Exit early, analyzeTargetProfile handles the view loading
        } else {
          console.log('User not fully set up, cannot analyze target. Clearing context and proceeding to setup.');
          chrome.storage.local.remove(['contextReady', 'targetProfileUrl', 'targetProfileTabId']);
        }
      }
    }
  } catch (error) {
    console.error('Exception loading data from chrome.storage.local:', error);
    // Fallback to default appSettings (already initialized)
  }

  // 2. Determine initial view (existing logic)
  if (!appSettings.n8nUrl || !userProfile) { // If not fully set up (missing n8n URL or own profile)
    console.log('User not fully set up or missing own profile. Loading main.html for setup.');
    loadView('main', () => {
      const getStartedBtn = document.getElementById('getStartedButton');
      if (getStartedBtn) {
        // Avoid adding multiple listeners if this callback runs multiple times for the same view.
        // A more robust solution might involve a dedicated function to set up view-specific listeners.
        if (!getStartedBtn.getAttribute('listenerAttached')) {
          getStartedBtn.addEventListener('click', handleGetStartedClick);
          getStartedBtn.setAttribute('listenerAttached', 'true'); // Mark that listener is attached
        }
      } else {
        console.error('Get Started button not found after loading main.html');
      }

      // Pre-populate n8n URL if it exists
      const n8nUrlInput = document.getElementById('n8n-url');
      if (n8nUrlInput && appSettings.n8nUrl) {
        n8nUrlInput.value = appSettings.n8nUrl;
      }
    });
  } else { // User is set up (has n8n URL and their own profile)
    console.log('User is set up. Displaying user profile.');
    displayUserProfile(userProfile);
  }
}

/**
 * Analyzes a target LinkedIn profile by scraping and scoring it.
 * @param {number} tabId - The tab ID containing the target profile.
 * @param {string} targetUrl - The URL of the target profile.
 */
async function analyzeTargetProfile(tabId, targetUrl) {
  console.log(`Starting target profile analysis for tab ${tabId}: ${targetUrl}`);

  try {
    // Show loading screen
    loadView('loading');

    // Execute the LinkedIn scraper on the target tab
    console.log('Injecting LinkedIn scraper...');
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content_scripts/linkedin_scraper.js']
    });

    if (!injectionResults || injectionResults.length === 0 || !injectionResults[0].result) {
      throw new Error('No result from LinkedIn scraper');
    }

    const scrapedResult = injectionResults[0].result;

    // Check if scraper returned an error
    if (scrapedResult.error) {
      throw new Error(scrapedResult.error);
    }

    const targetProfileData = scrapedResult;
    console.log('Target profile scraped:', targetProfileData);

    // Store scraped target data
    targetProfileScrapedData = targetProfileData;

    // Call N8N API for scoring
    console.log('Calling N8N API for scoring...');
    const scoreResponse = await fetch(appSettings.n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userProfile: userProfile,
        targetProfile: targetProfileData
      })
    });

    if (!scoreResponse.ok) {
      throw new Error(`N8N API request failed: ${scoreResponse.status} ${scoreResponse.statusText}`);
    }

    const scoreData = await scoreResponse.json();
    console.log('Score data received:', scoreData);

    // Store score data
    n8nScoreData = scoreData;

    // Display the score screen
    displayScoreScreen(targetProfileData, scoreData);

  } catch (error) {
    console.error('Error in target profile analysis:', error);
    displayError(
      'Analysis Failed',
      `Could not analyze the LinkedIn profile: ${error.message}`,
      'ANALYSIS_ERROR'
    );
  }
}

// --- Main Execution --- 
document.addEventListener('DOMContentLoaded', initializePopup);

console.log('popup_core.js loaded'); 