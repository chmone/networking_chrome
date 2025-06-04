console.log("LinkedIn Insight Scraper content script loaded.");

/**
 * Helper function to wait for an element to appear in the DOM.
 * @param {string} selector CSS selector for the element.
 * @param {number} timeout Maximum time to wait in milliseconds.
 * @param {number} interval Time between checks in milliseconds.
 * @param {Document|Element} [context=document] The context to search within.
 * @returns {Promise<Element|null>} A promise that resolves with the element or null if timed out.
 */
async function waitForElement(selector, timeout = 5000, interval = 500, context = document) {
  console.log(`LinkedIn Insight Scraper: waitForElement - Waiting for selector: "${selector}" within context:`, context.nodeName);
  return new Promise((resolve) => {
    let elapsedTime = 0;
    const timer = setInterval(() => {
      const element = context.querySelector(selector);
      if (element) {
        console.log(`LinkedIn Insight Scraper: waitForElement - Element FOUND: "${selector}"`);
        clearInterval(timer);
        resolve(element);
      } else {
        elapsedTime += interval;
        if (elapsedTime >= timeout) {
          console.warn(`LinkedIn Insight Scraper: waitForElement - Timeout waiting for element: "${selector}"`);
          clearInterval(timer);
          resolve(null);
        }
      }
    }, interval);
  });
}

/**
 * Extracts profile data from the current LinkedIn profile page.
 * @returns {object|null} An object containing name, headline, and summary, or null if critical elements are missing.
 */
async function scrapeProfileData() {
  try {
    console.log("LinkedIn Insight Scraper: scrapeProfileData() called.");
    const mainProfileSection = await waitForElement('.scaffold-layout', 7000);

    if (!mainProfileSection) {
      console.error("LinkedIn Insight Scraper: Main profile section (.scaffold-layout) NOT FOUND after wait.");
      return { error: "Could not identify main profile section. Ensure you are on a profile page and it has loaded." };
    }
    console.log("LinkedIn Insight Scraper: Main profile section (.scaffold-layout) FOUND.");

    const nameElement = mainProfileSection.querySelector('div > h1.text-heading-xlarge, div > h1[class*="text-heading"], section[class*="card"] h1');
    const name = nameElement ? nameElement.innerText.trim() : "Name not found";
    console.log(`LinkedIn Insight Scraper: Name element found: ${!!nameElement}, Name: "${name}"`);

    const headlineElement = mainProfileSection.querySelector('div.text-body-medium.break-words');
    const headline = headlineElement ? headlineElement.innerText.trim() : "Headline not found";
    console.log(`LinkedIn Insight Scraper: Headline element found: ${!!headlineElement}, Headline: "${headline}"`);

    let location = "Location not found";
    const locationSelectors = [
      'div.text-body-medium.break-words + span.text-body-small.inline.break-words',
      'span[class*="profile-topcard-location"]',
      'div > span.text-body-small[class*="inline"]'
    ];
    for (const selector of locationSelectors) {
      const locationElement = mainProfileSection.querySelector(selector);
      if (locationElement && locationElement.innerText.trim()) {
        location = locationElement.innerText.trim();
        console.log(`LinkedIn Insight Scraper: Location FOUND with selector "${selector}": "${location}"`);
        break;
      }
      console.log(`LinkedIn Insight Scraper: Location - trying selector "${selector}", Found: ${!!locationElement}`);
    }
    if (location === "Location not found") {
      console.warn("LinkedIn Insight Scraper: Location was NOT FOUND after trying all selectors.");
    }

    let profileImageUrl = "";
    const profileImageElement = mainProfileSection.querySelector('img.pv-top-card-profile-picture__image, img[class*="profile-picture"], img[data-delayed-url]');
    if (profileImageElement) {
      profileImageUrl = profileImageElement.src || profileImageElement.getAttribute('data-delayed-url') || "";
    }
    console.log(`LinkedIn Insight Scraper: Profile image element found: ${!!profileImageElement}, URL: "${profileImageUrl}"`);

    let summary = "Summary not found";
    const aboutSection = mainProfileSection.querySelector('section:has(> div#about)');
    console.log(`LinkedIn Insight Scraper: About section found: ${!!aboutSection}`);
    if (aboutSection) {
      const summarySelectors = [
        'div[class*="inline-show-more-text"] > span[aria-hidden="true"]:not([class*="see-more-less-text"])',
        'div.pv-shared-profile-section__description > div > span[aria-hidden="true"]',
        'span[class*="visually-hidden"] ~ span',
      ];
      for (const selector of summarySelectors) {
        const summarySpan = aboutSection.querySelector(selector);
        console.log(`LinkedIn Insight Scraper: Summary - trying selector "${selector}" within About section, Found: ${!!summarySpan}`);
        if (summarySpan && summarySpan.innerText.trim()) {
          summary = summarySpan.innerText.trim();
          console.log(`LinkedIn Insight Scraper: Summary FOUND with selector "${selector}": "${summary}"`);
          break;
        }
      }
    } else {
      console.log("LinkedIn Insight Scraper: About section (for summary) NOT found after wait.");
    }
    if (summary === "Summary not found") {
      console.warn("LinkedIn Insight Scraper: Summary was NOT FOUND after trying all selectors.");
    }

    const experiences = [];
    const experienceSection = await waitForElement('section:has(> div#experience)', 5000, 500, mainProfileSection);
    console.log(`LinkedIn Insight Scraper: Experience section (id=experience) found: ${!!experienceSection}`);
    if (experienceSection) {
      const experienceList = await waitForElement('ul', 2000, 300, experienceSection);
      console.log(`LinkedIn Insight Scraper: Experience list (ul) within section found: ${!!experienceList}`);
      if (experienceList) {
        const experienceItems = experienceList.querySelectorAll(':scope > li.artdeco-list__item');
        console.log(`LinkedIn Insight Scraper: Found ${experienceItems.length} experience items (li.artdeco-list__item).`);
        experienceItems.forEach((item, index) => {
          console.log(`LinkedIn Insight Scraper: Processing Experience Item #${index + 1}`);
          let jobTitle = "N/A";
          let companyName = "N/A";
          let dates = "N/A";
          let description = "N/A";
          let location = "N/A";

          const titleEl = item.querySelector('div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
          if (titleEl) {
            jobTitle = titleEl.innerText.trim();
          }
          console.log(`LinkedIn Insight Scraper: Exp Item #${index + 1} - Title Element: ${!!titleEl}, Title: "${jobTitle}"`);

          const detailsContainer = titleEl?.closest('a') || item;
          const detailSpans = detailsContainer.querySelectorAll(':scope > span[aria-hidden="true"], :scope > span > span[aria-hidden="true"]');
          console.log(`LinkedIn Insight Scraper: Exp Item #${index + 1} - Found ${detailSpans.length} detailSpans for company/dates/location.`);

          let companyFound = false;
          let datesFound = false;
          let locationFound = false;

          detailSpans.forEach(span => {
            const text = span.innerText.trim();
            if (!text) return;

            const parentSpan = span.parentElement;
            if (!companyFound &&
              parentSpan &&
              parentSpan.classList.contains('t-14') &&
              parentSpan.classList.contains('t-normal') &&
              !parentSpan.classList.contains('t-black--light') &&
              text !== jobTitle) {
              companyName = text.split('·')[0].trim();
              if (companyName) {
                companyFound = true;
              }
            }

            if (!datesFound && span.closest('.pvs-entity__caption-wrapper') && text.match(/\d{4}|Present|mos|yrs/i)) {
              dates = text;
              datesFound = true;
            }
            if (!datesFound && text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Spring|Summer|Fall|Winter|Q[1-4])\s\d{4}\s-\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Spring|Summer|Fall|Winter|Q[1-4]|Present)\s\d{4}|Present/i)) {
              if (companyFound || (!companyFound && text.split('·')[0].trim() !== companyName)) {
                dates = text;
                datesFound = true;
              }
            }

            const locationParentSpan = span.parentElement;
            if (!locationFound && datesFound &&
              locationParentSpan &&
              locationParentSpan.classList.contains('t-14') &&
              locationParentSpan.classList.contains('t-normal') &&
              locationParentSpan.classList.contains('t-black--light') &&
              text !== dates &&
              !text.match(/\d{4}|Present|mos|yrs/i) &&
              text.length > 1) {
              location = text.split('·')[0].trim();
              if (location) {
                locationFound = true;
              }
            }
          });

          if (!companyFound && titleEl) {
            const anchorTag = titleEl.closest('a');
            if (anchorTag) {
              const companySpans = anchorTag.querySelectorAll(':scope > span.t-14.t-normal > span[aria-hidden="true"]');
              for (const cs of companySpans) {
                const potentialCompanyText = cs.innerText.trim();
                const companyPart = potentialCompanyText.split('·')[0].trim();
                if (companyPart && companyPart !== jobTitle &&
                  !potentialCompanyText.match(/\d{4}|Present|mos|yrs|Location/i) &&
                  !cs.closest('.pvs-entity__caption-wrapper') &&
                  !cs.closest('.t-black--light') &&
                  companyPart !== dates && companyPart !== location) {
                  companyName = companyPart;
                  companyFound = true;
                  break;
                }
              }
            }
          }
          if (jobTitle !== "N/A" && jobTitle === companyName) {
            companyName = "N/A";
          }

          const descriptionSelector = 'div[class*="inline-show-more-text"]:not([class*="--is-collapsed"]) span[aria-hidden="true"]:not([class*="see-more-less-text"]), ' +
            'div.pvs-entity__description span[aria-hidden="true"], ' +
            'div.pvs-entity__sub-components span[aria-hidden="true"]:not([class*="see-more-less-text"])';
          const descriptionEl = item.querySelector(descriptionSelector);
          if (descriptionEl) {
            const descText = descriptionEl.innerText.trim();
            if (descText !== jobTitle && descText !== companyName && descText !== dates && descText !== location && descText.length > 20) {
              description = descText.replace(/\n\nShow less$/, '').trim().replace(/\n\nSee less$/, '').trim();
            }
          }

          console.log(`LinkedIn Insight Scraper: Exp Item #${index + 1} - Final Parsed - Title: "${jobTitle}", Company: "${companyName}", Dates: "${dates}", Location: "${location}", Desc Length: ${description.length}`);
          if (jobTitle !== "N/A" || companyName !== "N/A") {
            experiences.push({ title: jobTitle, company: companyName, dates: dates, location: location, description: description });
          }
        });
      } else {
        console.warn("LinkedIn Insight Scraper: Experience list (ul) NOT found within experience section.");
      }
    } else {
      console.warn("LinkedIn Insight Scraper: Experience section (id=experience) NOT found.");
    }
    console.log("LinkedIn Insight Scraper: Final experiences array:", JSON.stringify(experiences));

    const licenses = await scrapeLicensesAndCertifications(mainProfileSection);

    const education = await scrapeEducation(mainProfileSection);

    const finalScrapedData = { name, headline, location, summary, experiences, licenses, education, profileImageUrl, profileUrl: window.location.href };
    console.log("LinkedIn Insight Scraper: Final scraped data object being returned:", JSON.stringify(finalScrapedData));
    return finalScrapedData;
  } catch (e) {
    console.error("LinkedIn Insight Scraper: CRITICAL ERROR in scrapeProfileData:", e);
    return { error: `Scraping failed: ${e.message}` };
  }
}

async function scrapeLicensesAndCertifications(mainProfileSection) {
  console.log("LinkedIn Insight Scraper: scrapeLicensesAndCertifications() called.");
  const licenses = [];
  if (!mainProfileSection) {
    console.warn("LinkedIn Insight Scraper: L&C - mainProfileSection is null, cannot scrape.");
    return licenses;
  }
  try {
    const licensesSection = mainProfileSection.querySelector('section:has(> div#licenses_and_certifications)');
    console.log(`LinkedIn Insight Scraper: Licenses section found: ${!!licensesSection}`);
    if (licensesSection) {
      const licenseList = licensesSection.querySelector('ul');
      console.log(`LinkedIn Insight Scraper: L&C list (ul) found: ${!!licenseList}`);
      if (licenseList) {
        const licenseElements = licenseList.querySelectorAll(':scope > li.artdeco-list__item');
        console.log(`LinkedIn Insight Scraper: Found ${licenseElements.length} license items.`);
        licenseElements.forEach((licenseElement, index) => {
          console.log(`LinkedIn Insight Scraper: Processing License Item #${index + 1}`);
          let name = "N/A";
          let issuingOrg = "N/A";
          let issueDate = "N/A";
          let credentialId = "N/A";
          let credentialUrl = "N/A";

          const textContentDiv = licenseElement.querySelector('div.display-flex.flex-column.align-self-center.flex-grow-1');
          if (!textContentDiv) {
            console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - textContentDiv NOT found.`);
            return;
          }

          const nameElement = textContentDiv.querySelector('div[class*="t-bold"] > span[aria-hidden="true"], span[class*="t-bold"][aria-hidden="true"]');
          if (nameElement) {
            name = nameElement.innerText.trim();
          }
          console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Name Element: ${!!nameElement}, Name: "${name}"`);

          const orgElement = textContentDiv.querySelector(':scope > span.t-14.t-normal:not(.t-black--light) > span[aria-hidden="true"]');
          if (orgElement && orgElement.innerText.trim() !== name) {
            issuingOrg = orgElement.innerText.trim();
          }
          console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Org Element: ${!!orgElement}, Org: "${issuingOrg}"`);

          const detailBlocks = textContentDiv.querySelectorAll('span.t-14.t-normal.t-black--light');
          console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Found ${detailBlocks.length} detailBlocks`);
          detailBlocks.forEach((block, index) => {
            console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Processing detailBlock[${index}]:`, block);
            const textSpan = block.querySelector(':scope > span[aria-hidden="true"], :scope > span.pvs-entity__caption-wrapper[aria-hidden="true"]');
            console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - textSpan in detailBlock[${index}]:`, textSpan);
            if (textSpan) {
              const text = textSpan.innerText.trim();
              console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Text in textSpan[${index}]: "${text}"`);
              if (issueDate === "N/A" && (text.toLowerCase().includes('issued') || text.match(/\d{4}/) || text.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i))) {
                issueDate = text;
                console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Assigned to issueDate: "${issueDate}"`);
              } else if (credentialId === "N/A" && text.toLowerCase().includes('credential id')) {
                credentialId = text.replace(/credential id/ig, '').trim();
                console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Assigned to credentialId: "${credentialId}"`);
              }
            }
          });

          if (issuingOrg === "N/A" || issuingOrg === issueDate || issuingOrg === credentialId || (orgElement && orgElement.innerText.trim() === name)) {
            const imgElement = licenseElement.querySelector('a[href*="/company/"] img[alt]');
            if (imgElement) {
              const altText = imgElement.alt.replace(/ logo$/i, '').trim();
              if (altText && altText !== name) {
                issuingOrg = altText;
              } else if (issuingOrg === "N/A") {
                issuingOrg = "N/A";
              }
            }
          }

          const credentialUrlElement = licenseElement.querySelector('a[href*="credly.com"], a[aria-label*="Show credential"]');
          if (credentialUrlElement) {
            credentialUrl = credentialUrlElement.href;
          }

          console.log(`LinkedIn Insight Scraper: Lic Item #${index + 1} - Final Parsed - Name: "${name}", Org: "${issuingOrg}", Date: "${issueDate}"`);
          if (name !== "N/A") {
            licenses.push({ name, issuingOrg, issueDate, credentialUrl, credentialId });
          }
        });
      }
    }
  } catch (error) {
    console.error("LinkedIn Insight Scraper: Error scraping licenses & certifications:", error);
  }
  console.log("LinkedIn Insight Scraper: Final licenses array:", JSON.stringify(licenses));
  return licenses;
}

async function scrapeEducation(mainProfileSection) {
  console.log("LinkedIn Insight Scraper: scrapeEducation() called.");
  const educationEntries = [];
  if (!mainProfileSection) {
    console.warn("LinkedIn Insight Scraper: Education - mainProfileSection is null, cannot scrape.");
    return educationEntries;
  }
  try {
    const educationSection = mainProfileSection.querySelector('section:has(> div#education)');
    console.log(`LinkedIn Insight Scraper: Education section found: ${!!educationSection}`);
    if (educationSection) {
      const educationList = educationSection.querySelector('ul');
      console.log(`LinkedIn Insight Scraper: Education list (ul) found: ${!!educationList}`);
      if (educationList) {
        const items = educationList.querySelectorAll(':scope > li.artdeco-list__item');
        console.log(`LinkedIn Insight Scraper: Found ${items.length} education items.`);
        items.forEach((item, index) => {
          console.log(`LinkedIn Insight Scraper: Processing Education Item #${index + 1}`);
          const schoolNameElement = item.querySelector('div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold > span[aria-hidden="true"]');
          const schoolName = schoolNameElement ? schoolNameElement.innerText.trim() : "N/A";
          console.log(`LinkedIn Insight Scraper: Edu Item #${index + 1} - School Name Element: ${!!schoolNameElement}, School: "${schoolName}"`);

          let degree = "N/A";
          let fieldOfStudy = "N/A";
          const degreeInfoElement = item.querySelector('span.t-14.t-normal > span[aria-hidden="true"]');
          if (degreeInfoElement) {
            const degreeInfoText = degreeInfoElement.innerText.trim();
            const parts = degreeInfoText.split(',');
            if (parts.length > 1) {
              const firstPart = parts[0].trim();
              if (firstPart.includes(" - ")) {
                degree = firstPart.split(" - ")[1] || firstPart.split(" - ")[0];
                fieldOfStudy = parts.slice(1).join(',').trim();
              } else {
                degree = firstPart;
                fieldOfStudy = parts.slice(1).join(',').trim();
              }
            } else {
              degree = degreeInfoText;
            }
          }
          console.log(`LinkedIn Insight Scraper: Edu Item #${index + 1} - Degree Info Element: ${!!degreeInfoElement}, Degree: "${degree}", Field: "${fieldOfStudy}"`);

          const datesElement = item.querySelector('span.t-14.t-normal.t-black--light > span.pvs-entity__caption-wrapper[aria-hidden="true"]');
          const dates = datesElement ? datesElement.innerText.trim() : "N/A";
          console.log(`LinkedIn Insight Scraper: Edu Item #${index + 1} - Dates Element: ${!!datesElement}, Dates: "${dates}"`);

          let description = "";
          const descriptionElements = item.querySelectorAll('div.pvs-entity__sub-components div.inline-show-more-text span[aria-hidden="true"], div.pvs-entity__description span[aria-hidden="true"]');
          descriptionElements.forEach((descEl, index) => {
            const descText = descEl.innerText.trim();
            if (descText) {
              description += (index > 0 ? "\n" : "") + descText;
            }
          });
          description = description.trim() || "N/A";

          console.log(`LinkedIn Insight Scraper: Edu Item #${index + 1} - Final Parsed - School: "${schoolName}", Degree: "${degree}", Dates: "${dates}", Desc Length: ${description.length}`);
          if (schoolName !== "N/A") {
            educationEntries.push({ schoolName, degree, fieldOfStudy, dates, description });
          }
        });
      }
    }
  } catch (error) {
    console.error("LinkedIn Insight Scraper: Error scraping education:", error);
  }
  console.log("LinkedIn Insight Scraper: Final education array:", JSON.stringify(educationEntries));
  return educationEntries;
}

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeProfile") {
    const scrapedData = scrapeProfileData();
    if (scrapedData.error) {
      console.error("Error during scraping:", scrapedData.error);
      sendResponse({ error: scrapedData.error });
    } else if (scrapedData.name === "Name not found" && scrapedData.headline === "Headline not found" && scrapedData.summary === "Summary not found" && (!scrapedData.experiences || scrapedData.experiences.length === 0)) {
      const notProfileError = "Could not extract significant profile data. Ensure you are on a LinkedIn profile page and it has loaded completely.";
      sendResponse({ error: notProfileError });
    } else {
      sendResponse({ data: scrapedData });
    }
    return true;
  } else {
    console.log("LinkedIn Insight: Unknown action received", request.action)
    sendResponse({ error: "Unknown action" });
  }
  return true;
});

// For chrome.scripting.executeScript compatibility - return scraped data directly
(async () => {
  console.log("LinkedIn Insight Scraper: IIFE executing via chrome.scripting.executeScript");
  const scrapedData = await scrapeProfileData();
  console.log("LinkedIn Insight Scraper: IIFE received from scrapeProfileData():", JSON.stringify(scrapedData));

  if (scrapedData.error) {
    console.error("LinkedIn Insight Scraper: IIFE - Error flag found in scrapedData:", scrapedData.error);
    return { error: scrapedData.error };
  } else if (scrapedData.name === "Name not found" && scrapedData.headline === "Headline not found" && scrapedData.summary === "Summary not found" && (!scrapedData.experiences || scrapedData.experiences.length === 0)) {
    const notProfileError = "Could not extract significant profile data. Ensure you are on a LinkedIn profile page and it has loaded completely.";
    console.warn("LinkedIn Insight Scraper: IIFE - Not enough significant data found:", notProfileError);
    return { error: notProfileError };
  } else {
    console.log("LinkedIn Insight Scraper: IIFE - Scraping successful, returning data.");
    return scrapedData;
  }
})(); 