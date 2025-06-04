document.addEventListener('DOMContentLoaded', function () {
  const scanProfileBtn = document.getElementById('scanProfileBtn');
  const saveMyProfileBtn = document.getElementById('saveMyProfileBtn');

  // Status display elements
  const statusDiv = document.getElementById('status');
  const myProfileStatusDiv = document.getElementById('myProfileStatus');
  const webhookStatusDiv = document.getElementById('webhookStatus');

  // Data display elements from the new HTML structure
  const profileNameDisplay = document.getElementById('profileName');
  const profileHeadlineDisplay = document.getElementById('profileHeadline');
  const profileSummaryDisplay = document.getElementById('profileSummary');
  const experiencesDisplayDiv = document.getElementById('experiencesDisplay');
  const licensesDisplayDiv = document.getElementById('licensesDisplay');
  const educationDisplayDiv = document.getElementById('educationDisplay');
  // const skillsDisplayDiv = document.getElementById('skillsDisplay'); // Commented out

  function clearStatusMessages() {
    statusDiv.textContent = '';
    statusDiv.className = 'status-message';
    myProfileStatusDiv.textContent = '';
    myProfileStatusDiv.className = 'status-message';
    webhookStatusDiv.textContent = '';
    webhookStatusDiv.className = 'status-message';
    if (profileSummaryDisplay) profileSummaryDisplay.textContent = 'N/A';
    if (experiencesDisplayDiv) experiencesDisplayDiv.innerHTML = 'No experience data found.';
    if (licensesDisplayDiv) licensesDisplayDiv.innerHTML = 'No licenses or certifications found.';
    if (educationDisplayDiv) educationDisplayDiv.innerHTML = 'No education data found.';
    // if (skillsDisplayDiv) skillsDisplayDiv.innerHTML = 'No skills found.'; // Commented out
  }

  function clearDataDisplays() {
    if (profileNameDisplay) profileNameDisplay.textContent = 'N/A';
    if (profileHeadlineDisplay) profileHeadlineDisplay.textContent = 'N/A';
    if (profileSummaryDisplay) profileSummaryDisplay.textContent = 'N/A';
    if (experiencesDisplayDiv) experiencesDisplayDiv.innerHTML = 'No experience data found.';
    if (licensesDisplayDiv) licensesDisplayDiv.innerHTML = 'No licenses or certifications found.';
  }

  function setInProgress(inProgress) {
    scanProfileBtn.disabled = inProgress;
    saveMyProfileBtn.disabled = inProgress;
  }

  clearStatusMessages();
  clearDataDisplays();

  saveMyProfileBtn.addEventListener('click', function () {
    clearStatusMessages();
    clearDataDisplays();
    myProfileStatusDiv.textContent = 'Scanning your profile to save...';
    setInProgress(true);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        myProfileStatusDiv.textContent = 'Error: No active tab found.';
        myProfileStatusDiv.className = 'status-message error';
        setInProgress(false);
        return;
      }
      const currentTab = tabs[0];

      if (currentTab && currentTab.url && (currentTab.url.includes('linkedin.com/in/') || currentTab.url.includes('linkedin.com/sales/people/'))) {
        chrome.scripting.executeScript(
          { target: { tabId: currentTab.id }, files: ['src/content_scripts/linkedin_scraper.js'] },
          () => {
            if (chrome.runtime.lastError) {
              myProfileStatusDiv.textContent = 'Error injecting script: ' + chrome.runtime.lastError.message;
              myProfileStatusDiv.className = 'status-message error';
              setInProgress(false);
              return;
            }
            chrome.tabs.sendMessage(currentTab.id, { action: "scrapeProfile" }, function (response) {
              setInProgress(false);
              if (chrome.runtime.lastError) {
                myProfileStatusDiv.textContent = 'Error communicating with content script: ' + chrome.runtime.lastError.message;
                myProfileStatusDiv.className = 'status-message error';
                return;
              }
              if (response && response.data) {
                chrome.storage.local.set({ userLinkedInProfileData: response.data }, function () {
                  if (chrome.runtime.lastError) {
                    myProfileStatusDiv.textContent = 'Error saving your profile data to storage.';
                    myProfileStatusDiv.className = 'status-message error';
                    console.error("Error saving to storage:", chrome.runtime.lastError.message);
                  } else {
                    myProfileStatusDiv.textContent = 'Your LinkedIn profile data has been saved!';
                    myProfileStatusDiv.className = 'status-message success';
                    // Optionally display saved name or a success indication
                    if (profileNameDisplay && response.data.name) {
                      // A bit redundant to show target fields here, but can confirm save
                      // profileNameDisplay.textContent = `Saved: ${response.data.name}`;
                    }
                  }
                });
              } else if (response && response.error) {
                myProfileStatusDiv.textContent = `Error scraping your profile: ${response.error}`;
                myProfileStatusDiv.className = 'status-message error';
              } else {
                myProfileStatusDiv.textContent = 'Error: Received an empty or invalid response while scraping your profile.';
                myProfileStatusDiv.className = 'status-message error';
              }
            });
          }
        );
      } else {
        myProfileStatusDiv.textContent = 'Please navigate to your LinkedIn profile page to save it.';
        myProfileStatusDiv.className = 'status-message error';
        setInProgress(false);
      }
    });
  });

  scanProfileBtn.addEventListener('click', function () {
    clearStatusMessages();
    clearDataDisplays();
    statusDiv.textContent = 'Scanning target profile...';
    statusDiv.className = 'status-message info';
    setInProgress(true);

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length === 0) {
        statusDiv.textContent = 'Error: No active tab found.';
        statusDiv.className = 'status-message error';
        setInProgress(false);
        return;
      }
      const currentTab = tabs[0];

      if (currentTab && currentTab.url && (currentTab.url.includes('linkedin.com/in/') || currentTab.url.includes('linkedin.com/sales/people/'))) {
        chrome.scripting.executeScript(
          { target: { tabId: currentTab.id }, files: ['src/content_scripts/linkedin_scraper.js'] },
          () => {
            if (chrome.runtime.lastError) {
              statusDiv.textContent = 'Error injecting script: ' + chrome.runtime.lastError.message;
              statusDiv.className = 'status-message error';
              setInProgress(false);
              return;
            }
            chrome.tabs.sendMessage(currentTab.id, { action: "scrapeProfile" }, function (response) {
              setInProgress(false);
              if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Error: No response from content script. (' + chrome.runtime.lastError.message + ')';
                statusDiv.className = 'status-message error';
                return;
              }
              if (response && response.data) {
                statusDiv.textContent = 'Target Profile Scanned Successfully!';
                statusDiv.className = 'status-message success';

                // Populate Name, Headline, Summary
                if (profileNameDisplay) profileNameDisplay.textContent = response.data.name || 'N/A';
                if (profileHeadlineDisplay) profileHeadlineDisplay.textContent = response.data.headline || 'N/A';
                if (profileSummaryDisplay) profileSummaryDisplay.textContent = response.data.summary || 'N/A';

                // Populate Experiences
                if (experiencesDisplayDiv) {
                  experiencesDisplayDiv.innerHTML = ''; // Clear previous
                  if (response.data.experiences && response.data.experiences.length > 0) {
                    const ul = document.createElement('ul');
                    response.data.experiences.forEach(exp => {
                      const li = document.createElement('li');
                      li.innerHTML = `<strong>${exp.title || 'N/A'}</strong> at ${exp.company || 'N/A'}<br>
                                      <small>${exp.dates || 'N/A'} ${exp.location ? `| ${exp.location}` : ''}</small><br>
                                      <em>${exp.description ? exp.description.substring(0, 150) + '...' : 'No description.'}</em>`;
                      ul.appendChild(li);
                    });
                    experiencesDisplayDiv.appendChild(ul);
                  } else {
                    experiencesDisplayDiv.textContent = "No experience data found.";
                  }
                }

                // Populate Licenses & Certifications
                if (licensesDisplayDiv) {
                  licensesDisplayDiv.innerHTML = ''; // Clear previous
                  if (response.data.licenses && response.data.licenses.length > 0) {
                    const ul = document.createElement('ul');
                    response.data.licenses.forEach(lic => {
                      const li = document.createElement('li');
                      let htmlContent = `<strong>${lic.name || 'N/A'}</strong> - ${lic.issuingOrg || 'N/A'}<br>
                                       <small>Issued: ${lic.issueDate || 'N/A'}</small>`;
                      if (lic.credentialUrl && lic.credentialUrl !== 'N/A') {
                        htmlContent += `<br><a href="${lic.credentialUrl}" target="_blank" rel="noopener noreferrer">Show Credential</a>`;
                      }
                      li.innerHTML = htmlContent;
                      ul.appendChild(li);
                    });
                    licensesDisplayDiv.appendChild(ul);
                  } else {
                    licensesDisplayDiv.textContent = "No licenses or certifications found.";
                  }
                }

                // Populate Education
                if (educationDisplayDiv) {
                  educationDisplayDiv.innerHTML = ''; // Clear previous
                  if (response.data.education && response.data.education.length > 0) {
                    const ul = document.createElement('ul');
                    response.data.education.forEach(edu => {
                      const li = document.createElement('li');
                      li.innerHTML = `<strong>${edu.schoolName || 'N/A'}</strong><br>
                                      <small>${edu.degree || 'N/A'}${edu.fieldOfStudy && edu.fieldOfStudy !== 'N/A' ? `, ${edu.fieldOfStudy}` : ''}</small><br>
                                      <small>${edu.dates || 'N/A'}</small>${edu.description && edu.description !== 'N/A' ? `<br><em>${edu.description.replace(/\n/g, '<br>').substring(0, 200) + (edu.description.length > 200 ? '...' : '')}</em>` : ''}`;
                      ul.appendChild(li);
                    });
                    educationDisplayDiv.appendChild(ul);
                  } else {
                    educationDisplayDiv.textContent = "No education data found.";
                  }
                }

                /* // Commenting out Skills population
                if (skillsDisplayDiv) {
                    skillsDisplayDiv.innerHTML = ''; 
                    if (response.data.skills && response.data.skills.length > 0) {
                        const ul = document.createElement('ul');
                        ul.style.paddingLeft = '20px';
                        ul.style.display = 'flex';
                        ul.style.flexWrap = 'wrap';
                        ul.style.gap = '5px 10px';
                        response.data.skills.forEach(skill => {
                            const li = document.createElement('li');
                            li.textContent = skill;
                            li.style.backgroundColor = '#e7f3fe';
                            li.style.color = '#004085';
                            li.style.padding = '3px 8px';
                            li.style.borderRadius = '4px';
                            li.style.fontSize = '0.85em';
                            li.style.listStyleType = 'none';
                            ul.appendChild(li);
                        });
                        skillsDisplayDiv.appendChild(ul);
                    } else {
                        skillsDisplayDiv.textContent = "No skills found.";
                    }
                }
                */

                sendToN8n(response.data, webhookStatusDiv);
              } else if (response && response.error) {
                statusDiv.textContent = `Error scraping target: ${response.error}`;
                statusDiv.className = 'status-message error';
              } else {
                statusDiv.textContent = 'Error: Received an empty or invalid response from content script for target.';
                statusDiv.className = 'status-message error';
              }
            });
          }
        );
      } else {
        statusDiv.textContent = 'Please navigate to a LinkedIn profile page to scan a target.';
        statusDiv.className = 'status-message error';
        setInProgress(false);
      }
    });
  });
});

async function sendToN8n(targetProfileData, webhookStatusDiv) {
  chrome.storage.local.get(['n8nWebhookUrl', 'userLinkedInProfileData'], async function (items) {
    const webhookUrl = items.n8nWebhookUrl;
    const userProfileData = items.userLinkedInProfileData || null;

    if (webhookUrl) {
      webhookStatusDiv.textContent = 'Sending to n8n...';
      webhookStatusDiv.className = 'status-message info';

      const payload = {
        targetProfile: targetProfileData,
        userProfile: userProfileData
      };

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.ok) {
          webhookStatusDiv.textContent = 'Successfully sent to n8n!';
          webhookStatusDiv.className = 'status-message success';
        } else {
          const errorText = await response.text();
          webhookStatusDiv.textContent = `Error sending to n8n: ${response.status} ${errorText}`;
          webhookStatusDiv.className = 'status-message error';
        }
      } catch (error) {
        webhookStatusDiv.textContent = `Error sending to n8n: ${error.message}`;
        webhookStatusDiv.className = 'status-message error';
        console.error("N8n send error:", error);
      }
    } else {
      webhookStatusDiv.textContent = 'n8n Webhook URL not configured in options.';
      webhookStatusDiv.className = 'status-message error'; // Changed to error for more visibility
    }
  });
} 