document.addEventListener('DOMContentLoaded', function () {
  const userProfileUrlInput = document.getElementById('userProfileUrl');
  const n8nWebhookUrlInput = document.getElementById('n8nWebhookUrl');
  const saveOptionsButton = document.getElementById('saveOptionsBtn');
  const optionsStatusMessage = document.getElementById('optionsStatusMessage');

  const myProfileStorageStatusDiv = document.getElementById('myProfileStorageStatus');
  const clearMyProfileButton = document.getElementById('clearMyProfile');

  // Load saved options on page load
  loadOptions();

  function loadOptions() {
    chrome.storage.local.get(['userProfileUrl', 'n8nWebhookUrl', 'userLinkedInProfileData'], function (items) {
      if (items.userProfileUrl) {
        userProfileUrlInput.value = items.userProfileUrl;
      }
      if (items.n8nWebhookUrl) {
        n8nWebhookUrlInput.value = items.n8nWebhookUrl;
      }
      updateMyProfileStorageStatus(items.userLinkedInProfileData);
    });
  }

  function saveOptions() {
    const userProfileUrl = userProfileUrlInput.value;
    const n8nWebhookUrl = n8nWebhookUrlInput.value;

    if ((userProfileUrl && !isValidHttpUrl(userProfileUrl)) || (n8nWebhookUrl && !isValidHttpUrl(n8nWebhookUrl))) {
      optionsStatusMessage.textContent = 'Error: Please enter valid URLs (e.g., https://...).';
      optionsStatusMessage.style.color = 'red';
      return;
    }

    chrome.storage.local.set({
      userProfileUrl: userProfileUrl,
      n8nWebhookUrl: n8nWebhookUrl
    }, function () {
      if (chrome.runtime.lastError) {
        optionsStatusMessage.textContent = 'Error saving options!';
        optionsStatusMessage.style.color = 'red';
        console.error('Error saving options:', chrome.runtime.lastError.message);
      } else {
        optionsStatusMessage.textContent = 'Options saved successfully!';
        optionsStatusMessage.style.color = 'green';
        setTimeout(() => {
          optionsStatusMessage.textContent = '';
        }, 3000);
      }
    });
  }

  function updateMyProfileStorageStatus(profileData) {
    if (profileData && profileData.name) {
      myProfileStorageStatusDiv.textContent = `Saved profile: ${profileData.name}`;
      myProfileStorageStatusDiv.style.color = 'green';
      clearMyProfileButton.disabled = false;
    } else {
      myProfileStorageStatusDiv.textContent = 'No profile data saved.';
      myProfileStorageStatusDiv.style.color = 'orange';
      clearMyProfileButton.disabled = true;
    }
  }

  function clearMyProfileStorage() {
    myProfileStorageStatusDiv.textContent = 'Clearing...';
    chrome.storage.local.remove('userLinkedInProfileData', function () {
      if (chrome.runtime.lastError) {
        myProfileStorageStatusDiv.textContent = 'Error clearing profile data!';
        myProfileStorageStatusDiv.style.color = 'red';
        console.error("Error clearing storage:", chrome.runtime.lastError.message);
      } else {
        updateMyProfileStorageStatus(null);
      }
    });
  }

  function isValidHttpUrl(string) {
    if (!string) return true;
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }

  if (saveOptionsButton) {
    saveOptionsButton.addEventListener('click', saveOptions);
  } else {
    console.error("Save Options button not found with ID 'saveOptionsBtn'");
  }

  if (clearMyProfileButton) {
    clearMyProfileButton.addEventListener('click', clearMyProfileStorage);
  } else {
    console.error("Clear My Profile button not found with ID 'clearMyProfile'");
  }

  loadOptions();
}); 