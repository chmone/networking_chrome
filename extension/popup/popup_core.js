// extension/popup/popup_core.js

// --- Configuration ---
const HARDCODED_N8N_URL = 'https://chmones.app.n8n.cloud/webhook/f6b44e83-72af-42fa-9b57-7b25d200e41b'; // TODO: Replace with actual N8N webhook URL

// --- State Management (Conceptual from rules/system.md 6.C) ---
let currentView = 'loading'; // Default view
let userProfile = null;
let targetProfileScrapedData = null; // Will be reset on popup init
let n8nScoreData = null; // Will be reset on popup init
let isLoading = false;
let currentError = null; // Will be reset on popup init
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

const RANDOM_USER_AVATARS = [
  'https://i.imgur.com/jeKxn7N.png',
  'https://i.imgur.com/B5YRmn3.png',
  'https://i.imgur.com/JA6drqX.png'
];

/**
 * Sets a random profile avatar on the given image element.
 * @param {HTMLImageElement} imageElement - The <img> element to update.
 */
function setProfileImageRandomAvatar(imageElement) {
  if (!imageElement) {
    console.warn('setProfileImageRandomAvatar called with no imageElement.');
    return;
  }

  const getRandomAvatar = () => RANDOM_USER_AVATARS[Math.floor(Math.random() * RANDOM_USER_AVATARS.length)];
  const randomAvatarUrl = getRandomAvatar();

  console.log(`Setting random avatar: ${randomAvatarUrl} for element:`, imageElement.id);
  imageElement.src = randomAvatarUrl;
  imageElement.onerror = () => {
      console.warn(`Error loading random avatar: ${randomAvatarUrl}.`);
      imageElement.alt = "Error loading avatar";
  };
}

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
  const imageDiv = document.getElementById('profileImage'); // For user's own profile view
  const expContainer = document.getElementById('experienceContainer');
  const eduContainer = document.getElementById('educationContainer');
  const licContainer = document.getElementById('licensesContainer');

  if (nameEl) nameEl.textContent = profileData.name || '[Name not available]';
  if (headlineEl) headlineEl.textContent = profileData.headline || '[Headline not available]';
  if (summaryEl) summaryEl.textContent = profileData.summary || '[Summary not available]';
  
  // Updated image handling logic
  if (imageDiv) {
    setProfileImageRandomAvatar(imageDiv);
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
  
  // Updated image handling logic for the profile image on the score screen
  if (targetImageElement) {
    setProfileImageRandomAvatar(targetImageElement);
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

// NEW FUNCTION START (Skeleton for populating idle.html)
/**
 * Populates the idle.html view with the user's profile information.
 * @param {object} profileData - The user's own LinkedIn profile data.
 */
function populateIdleView(profileData) {
  console.log('Populating idle view with user data:', profileData);

  const userNameElement = document.getElementById('userNameIdle');
  const userHeadlineElement = document.getElementById('userHeadlineIdle');
  const userImageElement = document.getElementById('userProfileImageIdle');
  const goToLinkedInBtn = document.getElementById('goToLinkedInButtonIdle');

  if (userNameElement && profileData.name) {
    userNameElement.textContent = profileData.name;
  }
  if (userHeadlineElement && profileData.headline) {
    userHeadlineElement.textContent = profileData.headline;
  }
  if (userImageElement) {
    // Use the existing function to set the image, which handles fallbacks
    setProfileImageRandomAvatar(userImageElement);
  } else {
    console.warn('userProfileImageIdle element not found in idle.html');
  }

  if (goToLinkedInBtn) {
    // Remove any existing listeners to prevent duplicates if this view is reloaded
    goToLinkedInBtn.replaceWith(goToLinkedInBtn.cloneNode(true));
    const newgoToLinkedInBtn = document.getElementById('goToLinkedInButtonIdle'); // Re-fetch after clone
    if (newgoToLinkedInBtn) {
        newgoToLinkedInBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default anchor action
        chrome.tabs.create({ url: 'https://www.linkedin.com' });
        console.log('Navigating to LinkedIn from idle screen.');
      });
    }
  } else {
    console.warn('goToLinkedInButtonIdle element not found in idle.html');
  }
}
// NEW FUNCTION END

// Helper function to normalize LinkedIn URLs for comparison
function normalizeLinkedInUrl(url) {
  if (!url) return '';
  try {
    const newUrl = new URL(url);
    let pathname = newUrl.pathname;
    // Remove trailing slash if it exists and it's not the only character
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.substring(0, pathname.length - 1);
    }
    // Reconstruct the significant part: hostname (without www) + pathname
    // Convert hostname to lowercase for case-insensitive comparison
    let hostname = newUrl.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname + pathname;
  } catch (e) {
    // If URL is invalid, try a simpler regex-based normalization for basic cases
    // (e.g. if a non-URL string was somehow passed)
    console.warn('normalizeLinkedInUrl: Could not parse URL, using basic normalization:', url, e);
    let simpleUrl = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (simpleUrl.includes('?')) simpleUrl = simpleUrl.substring(0, simpleUrl.indexOf('?'));
    if (simpleUrl.includes('#')) simpleUrl = simpleUrl.substring(0, simpleUrl.indexOf('#'));
    if (simpleUrl.length > 1 && simpleUrl.endsWith('/')) simpleUrl = simpleUrl.slice(0, -1);
    return simpleUrl.toLowerCase();
  }
}

// --- Initialization ---

/**
 * Initializes the popup extension.
 * Determines the initial view to load based on stored settings and current context.
 */
async function initializePopup() {
  console.log('Popup initializing... Resetting transient state.');
  isLoading = true; // Set loading true at the very start

  // Reset potentially stale data from previous popup session
  targetProfileScrapedData = null;
  n8nScoreData = null;
  currentError = null;

  let items = {}; // Define items to store storage.local.get results

  // 1. Load settings from chrome.storage.local
  console.log('Step 1: Loading data from storage...');
  try {
    items = await chrome.storage.local.get([
      'appSettings',
      'userLinkedInProfileData',
      'profileCleared',
      'contextReady',
      'targetProfileUrl',
      'targetProfileTabId'
    ]);

    if (chrome.runtime.lastError) {
      console.error("Error loading from storage:", chrome.runtime.lastError.message);
    } else {
      console.log('Data loaded from storage:', items);
      if (items.appSettings) {
        appSettings = items.appSettings;
      }
      if (items.userLinkedInProfileData) {
        userProfile = items.userLinkedInProfileData;
      }
    }
  } catch (error) {
    console.error('Exception loading data from chrome.storage.local:', error);
  }

  // 2. Handle profile cleared flag
  console.log('Step 2: Checking for profileCleared flag...');
  if (items.profileCleared) {
    console.log('Profile was cleared, transitioning to setup. Clearing flag.');
    await chrome.storage.local.remove('profileCleared');
    userProfile = null;
  }

  // 3. If not fully set up, load 'main' and return
  console.log('Step 3: Checking setup status (N8N URL and userProfile)...');
  if (!appSettings.n8nUrl || !userProfile) {
    console.log('User not fully set up. Loading main.html.');
    loadView('main', () => {
      const getStartedBtn = document.getElementById('getStartedButton');
      if (getStartedBtn) {
        if (!getStartedBtn.getAttribute('listenerAttached')) {
          getStartedBtn.addEventListener('click', handleGetStartedClick);
          getStartedBtn.setAttribute('listenerAttached', 'true');
        }
      }
      const n8nUrlInput = document.getElementById('n8n-url');
      if (n8nUrlInput && appSettings.n8nUrl) n8nUrlInput.value = appSettings.n8nUrl;
      const linkedInUrlInput = document.getElementById('linkedin-url');
      if (linkedInUrlInput && appSettings.userLinkedInUrl && !userProfile) linkedInUrlInput.value = appSettings.userLinkedInUrl;
    });
    isLoading = false; return;
  }
  console.log('User is set up. Proceeding...');

  // PRIORITY STEP: Check current tab FIRST to determine if we should show idle
  console.log('Step 4 (PRIORITY): Checking current tab URL for idle conditions...');
  let activeTab = null;
  let currentUrl = '';
  try {
    [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl = activeTab ? activeTab.url : '';
    console.log('Current tab URL:', currentUrl);

    const normalizedCurrentUrl = normalizeLinkedInUrl(currentUrl);
    const normalizedUserLinkedInUrl = normalizeLinkedInUrl(appSettings.userLinkedInUrl);

    console.log('=== URL COMPARISON DEBUG ===');
    console.log('Raw current URL:', currentUrl);
    console.log('Raw user stored URL:', appSettings.userLinkedInUrl);
    console.log('Normalized current URL:', normalizedCurrentUrl);
    console.log('Normalized user URL:', normalizedUserLinkedInUrl);
    console.log('URLs match:', normalizedCurrentUrl === normalizedUserLinkedInUrl);

    const isOwnProfile = userProfile && normalizedCurrentUrl && normalizedUserLinkedInUrl && (normalizedCurrentUrl === normalizedUserLinkedInUrl);
    const isLinkedInFeed = normalizedCurrentUrl.includes('linkedin.com/feed');
    const isLinkedInHomePage = normalizedCurrentUrl === 'linkedin.com' || normalizedCurrentUrl === 'linkedin.com/home';
    
    console.log(`PRIORITY CHECK - isOwnProfile=${isOwnProfile}, isFeed=${isLinkedInFeed}, isHome=${isLinkedInHomePage}`);

    // PRIORITY: If this is own profile, feed, or homepage - show idle immediately
    if (isOwnProfile || isLinkedInFeed || isLinkedInHomePage) {
      console.log(`PRIORITY: Showing idle screen. Reason: isOwnProfile=${isOwnProfile}, isFeed=${isLinkedInFeed}, isHome=${isLinkedInHomePage}`);
      loadView('idle', () => populateIdleView(userProfile));
      isLoading = false; 
      return; // Exit immediately, don't check auto-analysis context
    }
  } catch (e) {
    console.error('Error in priority URL check:', e);
    // Continue to other checks if URL check fails
  }

  // 5. Check for analysis context from background.js (auto-triggered analysis) - ONLY for target profiles
  console.log('Step 5: Checking for auto-analysis context from storage...');
  if (items.contextReady && items.targetProfileUrl && items.targetProfileTabId) {
    console.log(`Auto-analysis context found in storage: URL=${items.targetProfileUrl}, TabID=${items.targetProfileTabId}`);
    
    let activeTabForContextCheck = null;
    try {
      [activeTabForContextCheck] = await chrome.tabs.query({ active: true, currentWindow: true });
    } catch (e) {
      console.error('Error querying active tab for context check:', e);
    }

    if (activeTabForContextCheck && activeTabForContextCheck.id === items.targetProfileTabId && activeTabForContextCheck.url === items.targetProfileUrl) {
      console.log('Context from storage matches active tab. Proceeding with auto-analysis.');
      lastUserActionContext = {
        action: 'analyzeTarget',
        data: { targetUrl: items.targetProfileUrl, tabId: items.targetProfileTabId }
      };
      await chrome.storage.local.remove(['contextReady', 'targetProfileUrl', 'targetProfileTabId']);
      console.log('Cleared consumed auto-analysis context from storage.');
      await analyzeTargetProfile(items.targetProfileTabId, items.targetProfileUrl);
      isLoading = false; return;
    } else {
      console.log('Context from storage is STALE (does not match active tab/URL). Clearing context.');
      await chrome.storage.local.remove(['contextReady', 'targetProfileUrl', 'targetProfileTabId']);
      console.log('Cleared stale auto-analysis context from storage.');
    }
  } else {
    console.log('No valid auto-analysis context found in storage.');
  }

  // 6. Final check for manual analysis or default to idle
  console.log('Step 6: Final URL analysis for manual target analysis or default idle...');
  const normalizedCurrentUrl = normalizeLinkedInUrl(currentUrl);
  const normalizedUserLinkedInUrl = normalizeLinkedInUrl(appSettings.userLinkedInUrl);
  const isOwnProfile = userProfile && normalizedCurrentUrl && normalizedUserLinkedInUrl && (normalizedCurrentUrl === normalizedUserLinkedInUrl);
  const isTargetProfilePage = normalizedCurrentUrl.includes('linkedin.com/in/') && !isOwnProfile;

  if (isTargetProfilePage && activeTab) {
    console.log('Current tab is a TARGET LinkedIn profile page. Initiating manual analysis for:', currentUrl);
    lastUserActionContext = { action: 'analyzeTarget', data: { targetUrl: currentUrl, tabId: activeTab.id } };
    await analyzeTargetProfile(activeTab.id, currentUrl);
  } else {
    console.log('DEFAULT: Showing idle screen for all other cases. URL:', currentUrl);
    loadView('idle', () => populateIdleView(userProfile));
  }
  
  isLoading = false;
}

/**
 * Analyzes a target LinkedIn profile by scraping and scoring it.
 * @param {number} tabId - The tab ID containing the target profile.
 * @param {string} targetUrl - The URL of the target profile.
 */
async function analyzeTargetProfile(tabId, targetUrl) {
  console.log(`Analyzing target profile: ${targetUrl} on tab ${tabId}`);
  isLoading = true;
  lastUserActionContext = { action: 'analyzeTargetProfile', data: { tabId, targetUrl } };

  let targetProfileData, scoreData;

  try {
    await loadView('loading'); // Display loading screen with 3-second minimum
    console.log('Loading view displayed, proceeding with scraping...');

    // Set up callback for when loading screen is ready to complete
    window.onLoadingScreenComplete = () => {
      console.log('Loading screen completed, showing results...');
      displayScoreScreen(targetProfileData, scoreData);
    };

    // 1. Inject the scraper to get target profile data
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

    targetProfileData = scrapedResult;
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

    scoreData = await scoreResponse.json();
    console.log('Score data received:', scoreData);

    // Store score data
    n8nScoreData = scoreData;

    // Notify loading screen that analysis is complete
    console.log('Notifying loading screen that analysis is complete...');
    if (window.notifyAnalysisComplete) {
      window.notifyAnalysisComplete();
    } else {
      // Fallback: loading screen will handle minimum time automatically
      console.log('Loading screen function not available, using timeout fallback...');
      setTimeout(() => {
        window.onLoadingScreenComplete();
      }, 3000); // Ensure minimum 3 seconds
    }

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