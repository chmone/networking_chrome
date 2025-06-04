console.log('settings.js loaded');

/**
 * Loads settings from chrome.storage.local and populates the form fields.
 */
async function loadSettings() {
  console.log('Loading settings...');
  try {
    const items = await chrome.storage.local.get([
      'n8nWebhookUrl',
      'userLinkedInUrl',
      'settings_autoOpenPopup'
    ]);

    if (items.n8nWebhookUrl) {
      document.getElementById('n8nWebhookUrl').value = items.n8nWebhookUrl;
    }
    if (items.userLinkedInUrl) {
      document.getElementById('userLinkedInUrl').value = items.userLinkedInUrl;
    }
    if (items.settings_autoOpenPopup !== undefined) {
      document.getElementById('settings_autoOpenPopup').checked = items.settings_autoOpenPopup;
    }
    console.log('Settings loaded into form.');
  } catch (error) {
    console.error('Error loading settings:', error);
    displayStatus('Error loading settings.', true);
  }
}

/**
 * Saves the current form field values to chrome.storage.local.
 */
async function saveSettings() {
  console.log('Saving settings...');
  const n8nWebhookUrl = document.getElementById('n8nWebhookUrl').value;
  const userLinkedInUrl = document.getElementById('userLinkedInUrl').value;
  const settings_autoOpenPopup = document.getElementById('settings_autoOpenPopup').checked;

  // Basic validation (can be expanded)
  if (!n8nWebhookUrl || !userLinkedInUrl) {
    displayStatus('N8N URL and Your LinkedIn URL cannot be empty.', true);
    return;
  }
  try {
    await chrome.storage.local.set({
      n8nWebhookUrl,
      userLinkedInUrl,
      settings_autoOpenPopup,
      // Also save to the appSettings object structure for consistency if popup_core uses it.
      appSettings: {
        n8nUrl: n8nWebhookUrl,
        userLinkedInUrl: userLinkedInUrl,
        autoOpen: settings_autoOpenPopup
      }
    });
    displayStatus('Settings saved successfully!');
    console.log('Settings saved.');

    // TODO: If userLinkedInUrl changed, potentially trigger a re-scrape of user's own profile.
    // This logic will be detailed in Task 2.1

  } catch (error) {
    console.error('Error saving settings:', error);
    displayStatus('Error saving settings.', true);
  }
}

/**
 * Clears the user's saved LinkedIn profile data from storage.
 */
async function clearMySavedProfile() {
  console.log('Attempting to clear saved profile...');
  if (confirm('Are you sure you want to clear your saved LinkedIn profile data?')) {
    try {
      // Clear profile data and reset appSettings
      await chrome.storage.local.remove('userLinkedInProfileData');

      // Get current settings to preserve n8nWebhookUrl but clear userLinkedInUrl
      const items = await chrome.storage.local.get(['appSettings', 'n8nWebhookUrl']);
      const updatedAppSettings = {
        n8nUrl: items.n8nWebhookUrl || '',
        userLinkedInUrl: '',
        autoOpen: true
      };

      await chrome.storage.local.set({
        appSettings: updatedAppSettings,
        userLinkedInUrl: '',
        profileCleared: true // Flag for popup to detect
      });

      displayStatus('Your saved profile data has been cleared. The extension will restart setup when you next open the popup.');
      console.log('userLinkedInProfileData cleared and profileCleared flag set.');

    } catch (error) {
      console.error('Error clearing profile data:', error);
      displayStatus('Error clearing profile data.', true);
    }
  }
}

/**
 * Displays a status message to the user.
 * @param {string} message - The message to display.
 * @param {boolean} [isError=false] - If true, styles the message as an error.
 */
function displayStatus(message, isError = false) {
  const statusElement = document.getElementById('settingsStatus');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = isError ? 'mt-4 text-sm text-red-600' : 'mt-4 text-sm text-green-600';
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadSettings(); // Load settings when the page is ready

  const saveButton = document.getElementById('saveSettingsButton');
  if (saveButton) {
    saveButton.addEventListener('click', saveSettings);
  }

  const clearButton = document.getElementById('clearProfileButton');
  if (clearButton) {
    clearButton.addEventListener('click', clearMySavedProfile);
  }
}); 