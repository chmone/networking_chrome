console.log("Background script loaded.");

// --- Helper Functions ---

/**
 * Checks if the given URL is a LinkedIn profile page.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if it's a LinkedIn profile page.
 */
function isLinkedInProfilePage(url) {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('linkedin.com') && urlObj.pathname.includes('/in/');
  } catch (error) {
    console.warn('Error parsing URL:', url, error);
    return false;
  }
}

/**
 * Manages popup status based on current tab and user settings.
 * @param {number} tabId - The tab ID.
 * @param {string} url - The tab URL.
 */
async function managePopupStatus(tabId, url) {
  console.log(`Checking popup conditions for tab ${tabId}: ${url}`);

  if (!isLinkedInProfilePage(url)) {
    console.log('Not a LinkedIn profile page, no action taken.');
    return;
  }

  console.log('LinkedIn profile page detected.');

  try {
    // Check user settings and setup status
    const items = await chrome.storage.local.get(['appSettings', 'userLinkedInProfileData', 'settings_autoOpenPopup']);

    const autoOpen = items.settings_autoOpenPopup !== undefined ? items.settings_autoOpenPopup :
      (items.appSettings && items.appSettings.autoOpen !== undefined ? items.appSettings.autoOpen : false);

    const userIsSetUp = items.userLinkedInProfileData && items.appSettings && items.appSettings.n8nUrl;

    console.log('Auto-open enabled:', autoOpen);
    console.log('User is set up:', userIsSetUp);

    if (autoOpen && userIsSetUp) {
      console.log('Conditions met for popup management. Setting badge.');
      // Set a badge to indicate the extension is ready to analyze this profile
      chrome.action.setBadgeText({ text: '●', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#0c7ff2', tabId: tabId });
      chrome.action.setTitle({ title: 'Click to analyze this LinkedIn profile', tabId: tabId });

      // Note: chrome.action.openPopup() can only be called in response to user action
      // We can't auto-open the popup from background script
      // Instead, we prepare the context so when user clicks the action, the popup knows to start analysis

      // Store target URL for popup to access
      chrome.storage.local.set({
        targetProfileUrl: url,
        targetProfileTabId: tabId,
        contextReady: true
      });

    } else {
      console.log('Conditions not met for popup management.');
      // Clear badge if conditions aren't met
      chrome.action.setBadgeText({ text: '', tabId: tabId });
      chrome.action.setTitle({ title: 'LinkedIn Insight V2', tabId: tabId });
    }

  } catch (error) {
    console.error('Error in managePopupStatus:', error);
  }
}

// --- Event Listeners ---

// Listener for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We are interested in pages that have finished loading
  if (changeInfo.status === 'complete' && tab.url) {
    console.log(`Tab updated: ${tab.url}`);
    managePopupStatus(tabId, tab.url);
  }
});

// Listener for when the active tab changes
chrome.tabs.onActivated.addListener(activeInfo => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (chrome.runtime.lastError) {
      console.warn("Error getting tab info in onActivated:", chrome.runtime.lastError.message);
      return;
    }
    if (tab && tab.url) {
      console.log(`Active tab changed to: ${tab.url}`);
      managePopupStatus(activeInfo.tabId, tab.url);
    }
  });
});

// Clean up context when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(['targetProfileTabId'], (items) => {
    if (items.targetProfileTabId === tabId) {
      console.log('Target tab closed, clearing context.');
      chrome.storage.local.remove(['targetProfileUrl', 'targetProfileTabId', 'contextReady']);
    }
  });
});

// Example of how to listen for messages from popup or content scripts (if needed later)
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   console.log('Message received in background:', request);
//   if (request.action === "someAction") {
//     // Do something
//     sendResponse({ status: "success", data: "some data" });
//   }
//   return true; // Indicates that the response will be sent asynchronously
// }); 