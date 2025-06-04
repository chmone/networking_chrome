console.log("LinkedIn Insight Scraper content script loaded.");

/**
 * Extracts profile data from the current LinkedIn profile page.
 * @returns {object|null} An object containing name, headline, and summary, or null if critical elements are missing.
 */
function scrapeProfileData() {
  try {
    console.log("Attempting to scrape profile data...");
    const mainProfileSection = document.querySelector('.scaffold-layout');

    if (!mainProfileSection) {
      console.error("Could not identify main profile section. Ensure you are on a profile page.");
      return { error: "Could not identify main profile section. Ensure you are on a profile page." };
    }
    // console.log("Main profile section identified:", mainProfileSection);

    const nameElement = mainProfileSection.querySelector('div > h1.text-heading-xlarge, div > h1[class*="text-heading"], section[class*="card"] h1');
    const name = nameElement ? nameElement.innerText.trim() : "Name not found";
    // console.log("Name found:", name);

    const headlineElement = mainProfileSection.querySelector('div.text-body-medium.break-words');
    const headline = headlineElement ? headlineElement.innerText.trim() : "Headline not found";
    // console.log("Headline found:", headline);

    // Extract profile image URL
    let profileImageUrl = "";
    const profileImageElement = mainProfileSection.querySelector('img.pv-top-card-profile-picture__image, img[class*="profile-picture"], img[data-delayed-url]');
    if (profileImageElement) {
      profileImageUrl = profileImageElement.src || profileImageElement.getAttribute('data-delayed-url') || "";
    }
    // console.log("Profile image URL found:", profileImageUrl);

    // More robust summary scraping
    let summary = "Summary not found";
    const aboutSection = mainProfileSection.querySelector('section:has(> div#about)');
    if (aboutSection) {
      // Try a few selectors for the summary
      const summarySelectors = [
        'div[class*="inline-show-more-text"] > span[aria-hidden="true"]:not([class*="see-more-less-text"])', // Preferred
        'div.pv-shared-profile-section__description > div > span[aria-hidden="true"]',
        'span[class*="visually-hidden"] ~ span', // General fallback
      ];
      for (const selector of summarySelectors) {
        const summarySpan = aboutSection.querySelector(selector);
        if (summarySpan && summarySpan.innerText.trim()) {
          summary = summarySpan.innerText.trim();
          break;
        }
      }
    }

    // Scrape Experience
    const experiences = [];
    const experienceSection = document.getElementById('experience')?.closest('section');
    if (experienceSection) {
      // console.log("Experience section found");
      const experienceList = experienceSection.querySelector('ul');
      if (experienceList) {
        const experienceItems = experienceList.querySelectorAll(':scope > li.artdeco-list__item');
        experienceItems.forEach(item => {
          // console.log("Processing experience item:", item);
          let jobTitle = "N/A";
          let companyName = "N/A";
          let dates = "N/A";
          let description = "N/A";
          let location = "N/A";

          // Job Title
          const titleEl = item.querySelector('div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]');
          if (titleEl) {
            jobTitle = titleEl.innerText.trim();
          }

          // Details container is often the 'a' tag itself if the title is within it, or the item itself
          const detailsContainer = titleEl?.closest('a') || item;

          // Get all direct child spans with aria-hidden=true from the details container
          // These often hold company, dates, location in order
          const detailSpans = detailsContainer.querySelectorAll(':scope > span[aria-hidden="true"], :scope > span > span[aria-hidden="true"]');

          let companyFound = false;
          let datesFound = false;
          let locationFound = false;

          detailSpans.forEach(span => {
            const text = span.innerText.trim();
            if (!text) return;

            // Company Name
            const parentSpan = span.parentElement;
            if (!companyFound &&
              parentSpan &&
              parentSpan.classList.contains('t-14') &&
              parentSpan.classList.contains('t-normal') &&
              !parentSpan.classList.contains('t-black--light') &&
              text !== jobTitle) {
              companyName = text.split('·')[0].trim();
              if (companyName) { // Ensure it's not an empty string after split
                companyFound = true;
                // console.log('COMPANY FOUND (primary):', companyName, span);
                // return; // Don't return yet, let dates/location also try from other spans if needed
              }
            }

            // Dates (often has a specific class or pattern)
            if (!datesFound && span.closest('.pvs-entity__caption-wrapper') && text.match(/\d{4}|Present|mos|yrs/i)) {
              dates = text;
              datesFound = true;
              // console.log('DATES FOUND (caption):', dates, span);
              // return; // Process other spans for location
            }
            // Fallback for dates if not in caption-wrapper
            if (!datesFound && text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Spring|Summer|Fall|Winter|Q[1-4])\s\d{4}\s-\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Spring|Summer|Fall|Winter|Q[1-4]|Present)\s\d{4}|Present/i)) {
              // Check it's not also a company name if company not yet found
              if (companyFound || (!companyFound && text.split('·')[0].trim() !== companyName)) {
                dates = text;
                datesFound = true;
                // console.log('DATES FOUND (regex fallback):', dates, span);
                // return; 
              }
            }

            // Location (often the one after dates, in t-black--light, and doesn't repeat dates)
            // Ensure it has a parent with t-black--light
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
              if (location) { // Ensure not empty
                locationFound = true;
                // console.log('LOCATION FOUND:', location, span);
              }
            }
          });

          // Fallback for company name if primary method failed (e.g. if it was grabbed as description or title earlier)
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
                  // console.log('COMPANY FOUND (fallback A):', companyName);
                  break;
                }
              }
            }
          }
          // Final simple check if company name is identical to job title, if so, it's likely wrong.
          if (jobTitle !== "N/A" && jobTitle === companyName) {
            // console.log('Company name was same as job title, resetting company.');
            companyName = "N/A";
          }

          // Description
          const descriptionSelector = 'div[class*="inline-show-more-text"]:not([class*="--is-collapsed"]) span[aria-hidden="true"]:not([class*="see-more-less-text"]), ' +
            'div.pvs-entity__description span[aria-hidden="true"], ' + // Common for descriptions
            'div.pvs-entity__sub-components span[aria-hidden="true"]:not([class*="see-more-less-text"])';
          const descriptionEl = item.querySelector(descriptionSelector);
          if (descriptionEl) {
            const descText = descriptionEl.innerText.trim();
            // Avoid using title/company/date/location as description
            if (descText !== jobTitle && descText !== companyName && descText !== dates && descText !== location && descText.length > 20) {
              description = descText.replace(/\n\nShow less$/, '').trim().replace(/\n\nSee less$/, '').trim();
            }
          }

          console.log(`Experience: Title: ${jobTitle}, Company: ${companyName}, Dates: ${dates}, Location: ${location}, Desc Length: ${description.length}`);
          if (jobTitle !== "N/A" || companyName !== "N/A") {
            experiences.push({ title: jobTitle, company: companyName, dates: dates, location: location, description: description });
          }
        });
      }
    } else {
      // console.log("Experience section not found or id 'experience' not on a direct child of a section.");
    }
    // console.log("Final experiences:", experiences);

    const licenses = scrapeLicensesAndCertifications(mainProfileSection);
    // const skills = scrapeSkills(mainProfileSection); // Commented out skills call

    const education = scrapeEducation(mainProfileSection); // Add this call

    console.log("Scraped data:", { name, headline, summary, experiences, licenses, education, profileImageUrl, profileUrl: window.location.href });
    return { name, headline, summary, experiences, licenses, education, profileImageUrl, profileUrl: window.location.href };
  } catch (e) {
    console.error("Error during scraping in scrapeProfileData:", e);
    return { error: `Scraping failed: ${e.message}` };
  }
}

function scrapeLicensesAndCertifications(mainProfileSection) {
  const licenses = [];
  try {
    const licensesSection = mainProfileSection.querySelector('section:has(> div#licenses_and_certifications)');
    if (licensesSection) {
      const licenseElements = licensesSection.querySelectorAll('ul > li.artdeco-list__item');

      licenseElements.forEach(licenseElement => {
        let name = "N/A";
        let issuingOrg = "N/A";
        let issueDate = "N/A";
        let credentialId = "N/A";
        let credentialUrl = "N/A";

        console.log("[L&C Scraper] Processing licenseElement:", licenseElement);

        const textContentDiv = licenseElement.querySelector('div.display-flex.flex-column.align-self-center.flex-grow-1');
        console.log("[L&C Scraper] textContentDiv:", textContentDiv);
        if (!textContentDiv) {
          console.log("[L&C Scraper] textContentDiv not found for this item.");
          return;
        }

        // 1. Name
        const nameElement = textContentDiv.querySelector('div[class*="t-bold"] > span[aria-hidden="true"], span[class*="t-bold"][aria-hidden="true"]');
        if (nameElement) {
          name = nameElement.innerText.trim();
        }

        // 2. Issuing Org - typically the first span.t-14.t-normal NOT in t-black--light group
        const orgElement = textContentDiv.querySelector(':scope > span.t-14.t-normal:not(.t-black--light) > span[aria-hidden="true"]');
        if (orgElement && orgElement.innerText.trim() !== name) {
          issuingOrg = orgElement.innerText.trim();
        }

        // 3. Issue Date & 4. Credential ID
        // These are usually in separate span.t-14.t-normal.t-black--light containers under textContentDiv
        const detailBlocks = textContentDiv.querySelectorAll('span.t-14.t-normal.t-black--light'); // Removed :scope >
        console.log("[L&C Scraper] Found detailBlocks:", detailBlocks.length, detailBlocks);
        detailBlocks.forEach((block, index) => {
          console.log(`[L&C Scraper] Processing detailBlock[${index}]:`, block);
          const textSpan = block.querySelector(':scope > span[aria-hidden="true"], :scope > span.pvs-entity__caption-wrapper[aria-hidden="true"]');
          console.log(`[L&C Scraper] textSpan in detailBlock[${index}]:`, textSpan);
          if (textSpan) {
            const text = textSpan.innerText.trim();
            console.log(`[L&C Scraper] Text in textSpan[${index}]: "${text}"`);
            if (issueDate === "N/A" && (text.toLowerCase().includes('issued') || text.match(/\d{4}/) || text.toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i))) {
              issueDate = text;
              console.log(`[L&C Scraper] Assigned to issueDate: "${issueDate}"`);
            } else if (credentialId === "N/A" && text.toLowerCase().includes('credential id')) {
              credentialId = text.replace(/credential id/ig, '').trim();
              console.log(`[L&C Scraper] Assigned to credentialId: "${credentialId}"`);
            }
          }
        });

        // Fallback for Issuing Org (ensure it doesn't pick up date/credential if they are valid)
        if (issuingOrg === "N/A" || issuingOrg === issueDate || issuingOrg === credentialId || (orgElement && orgElement.innerText.trim() === name)) {
          const imgElement = licenseElement.querySelector('a[href*="/company/"] img[alt]');
          if (imgElement) {
            const altText = imgElement.alt.replace(/ logo$/i, '').trim();
            if (altText && altText !== name) {
              issuingOrg = altText;
            } else if (issuingOrg === "N/A") { // only revert to N/A if it was N/A and alt text was also not useful
              issuingOrg = "N/A";
            }
          }
        }

        // 5. Credential URL
        const credentialUrlElement = licenseElement.querySelector('a[href*="credly.com"], a[aria-label*="Show credential"]');
        if (credentialUrlElement) {
          credentialUrl = credentialUrlElement.href;
        }

        if (name !== "N/A") {
          licenses.push({ name, issuingOrg, issueDate, credentialUrl, credentialId });
        }
      });
    }
  } catch (error) {
    console.error("Error scraping licenses & certifications:", error);
  }
  return licenses;
}

/* // Commenting out the entire scrapeSkills function
function scrapeSkills(mainProfileSection) {
    const skills = [];
    try {
        const skillsSection = mainProfileSection.querySelector('section:has(> div#skills)');
        if (skillsSection) {
            console.log("[Skills Scraper] Skills section found:", skillsSection);
            const skillElements = skillsSection.querySelectorAll('li.artdeco-list__item a[data-field="skill_card_skill_topic"] div[class*="t-bold"] > span[aria-hidden="true"]');
            
            if (skillElements.length === 0) {
                 const alternativeSkillElements = skillsSection.querySelectorAll('li.artdeco-list__item div[class*="align-items-center"][class*="t-bold"] > span[aria-hidden="true"]');
                 console.log("[Skills Scraper] Primary skill selector failed, found with alternative:", alternativeSkillElements.length);
                 alternativeSkillElements.forEach(skillElement => {
                    const skillName = skillElement.innerText.trim();
                    if (skillName && !skills.includes(skillName)) {
                        skills.push(skillName);
                    }
                });
            } else {
                 skillElements.forEach(skillElement => {
                    const skillName = skillElement.innerText.trim();
                    const cleanedSkillName = skillName.replace(/\u2060/g, '').trim();
                    if (cleanedSkillName && !skills.includes(cleanedSkillName)) {
                        skills.push(cleanedSkillName);
                    }
                });
            }
            console.log("[Skills Scraper] Found skills:", skills);
        }
    } catch (error) {
        console.error("[Skills Scraper] Error scraping skills:", error);
    }
    return skills;
}
*/

function scrapeEducation(mainProfileSection) {
  const educationEntries = [];
  try {
    const educationSection = mainProfileSection.querySelector('section:has(> div#education)');
    if (educationSection) {
      console.log("[Education Scraper] Education section found:", educationSection);
      const items = educationSection.querySelectorAll('ul > li.artdeco-list__item');
      items.forEach(item => {
        const schoolNameElement = item.querySelector('div.display-flex.align-items-center.mr1.hoverable-link-text.t-bold > span[aria-hidden="true"]');
        const schoolName = schoolNameElement ? schoolNameElement.innerText.trim() : "N/A";

        let degree = "N/A";
        let fieldOfStudy = "N/A";
        const degreeInfoElement = item.querySelector('span.t-14.t-normal > span[aria-hidden="true"]');
        if (degreeInfoElement) {
          const degreeInfoText = degreeInfoElement.innerText.trim();
          // Attempt to parse Degree and Field of Study, e.g., "Bachelor of Business Administration - BBA, Management Information Systems, General"
          // This parsing can be very specific to formats. A common pattern is "Degree Name - Acronym, Field of Study"
          const parts = degreeInfoText.split(',');
          if (parts.length > 1) {
            const firstPart = parts[0].trim();
            if (firstPart.includes(" - ")) { // e.g., Bachelor of Business Administration - BBA
              degree = firstPart.split(" - ")[1] || firstPart.split(" - ")[0]; // Prefer acronym, else full name part
              fieldOfStudy = parts.slice(1).join(',').trim();
            } else {
              degree = firstPart; // Fallback if no acronym pattern
              fieldOfStudy = parts.slice(1).join(',').trim();
            }
          } else {
            degree = degreeInfoText; // If no comma, assume it's all degree or all field of study
          }
        }

        const datesElement = item.querySelector('span.t-14.t-normal.t-black--light > span.pvs-entity__caption-wrapper[aria-hidden="true"]');
        const dates = datesElement ? datesElement.innerText.trim() : "N/A";

        let description = "";
        const descriptionElements = item.querySelectorAll('div.pvs-entity__sub-components div.inline-show-more-text span[aria-hidden="true"], div.pvs-entity__description span[aria-hidden="true"]');
        descriptionElements.forEach((descEl, index) => {
          const descText = descEl.innerText.trim();
          if (descText) {
            description += (index > 0 ? "\n" : "") + descText;
          }
        });
        description = description.trim() || "N/A";

        if (schoolName !== "N/A") {
          educationEntries.push({ schoolName, degree, fieldOfStudy, dates, description });
        }
      });
      console.log("[Education Scraper] Found education entries:", educationEntries);
    }
  } catch (error) {
    console.error("[Education Scraper] Error scraping education:", error);
  }
  return educationEntries;
}

// Listener for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrapeProfile") {
    // console.log("Scrape request received from popup.");
    const scrapedData = scrapeProfileData();
    if (scrapedData.error) {
      console.error("Error during scraping:", scrapedData.error);
      sendResponse({ error: scrapedData.error });
    } else if (scrapedData.name === "Name not found" && scrapedData.headline === "Headline not found" && scrapedData.summary === "Summary not found" && (!scrapedData.experiences || scrapedData.experiences.length === 0)) {
      const notProfileError = "Could not extract significant profile data. Ensure you are on a LinkedIn profile page and it has loaded completely.";
      // console.warn(notProfileError);
      sendResponse({ error: notProfileError });
    } else {
      // console.log("Scraping successful, sending data:", scrapedData);
      sendResponse({ data: scrapedData });
    }
    return true; // Indicates that the response will be sent asynchronously
  } else {
    console.log("LinkedIn Insight: Unknown action received", request.action)
    sendResponse({ error: "Unknown action" });
  }
  return true; // Required for asynchronous sendResponse
});

// console.log("LinkedIn Scraper content script loaded and listening."); 

// For chrome.scripting.executeScript compatibility - return scraped data directly
(() => {
  console.log("LinkedIn scraper executing via chrome.scripting.executeScript");
  const scrapedData = scrapeProfileData();

  // Return the data in the same validation format as the message listener
  if (scrapedData.error) {
    console.error("Error during scraping:", scrapedData.error);
    return { error: scrapedData.error };
  } else if (scrapedData.name === "Name not found" && scrapedData.headline === "Headline not found" && scrapedData.summary === "Summary not found" && (!scrapedData.experiences || scrapedData.experiences.length === 0)) {
    const notProfileError = "Could not extract significant profile data. Ensure you are on a LinkedIn profile page and it has loaded completely.";
    console.warn(notProfileError);
    return { error: notProfileError };
  } else {
    console.log("Scraping successful, returning data:", scrapedData);
    return scrapedData; // Return data directly for executeScript
  }
})(); 