# Test Plan: LinkedIn Insight Chrome Extension (MVP)

## 1. Introduction

This document outlines the testing strategy for the Minimum Viable Product (MVP) of the "LinkedIn Insight" Chrome Extension. The primary goal is to ensure the core functionality described in the Product Requirements Document (PRD) and implemented as per the task list is working as expected.

## 2. Testing Scope (MVP)

The scope of testing for the MVP includes:

*   **Core Functionality:**
    *   Extension installation and basic loading.
    *   Manual triggering of LinkedIn profile scraping.
    *   Extraction of defined data points (name, headline, summary).
    *   Display of scraped data in the extension popup.
    *   Basic error messaging for common failure scenarios.
*   **User Interface (UI):**
    *   Popup display and basic layout.
    *   Button functionality.
    *   Clarity of displayed information and status messages.
*   **(If Implemented) Optional User Configuration:**
    *   Saving and retrieving user's own LinkedIn URL via the options page.
*   **Non-Functional Aspects:**
    *   Basic performance (responsiveness of popup and scraping).
    *   Usability (ease of use for core actions).
    *   Privacy (local storage of any user-provided URL).

**Out of Scope for MVP Testing (but noted for future):**
*   LLM integration and scoring logic.
*   Advanced error handling for all edge cases.
*   Full accessibility compliance testing (beyond basic checks).
*   Automated unit or integration tests (focus is on manual functional testing for MVP).
*   Load or stress testing.
*   Resume upload functionality.

## 3. Types of Testing

*   **Manual Functional Testing:** Core focus for MVP. Executing test cases based on user stories and requirements to verify functionality.
*   **User Interface (UI) / UX Testing:** Evaluating the popup's appearance, layout, and ease of use.
*   **Exploratory Testing:** Ad-hoc testing to discover defects not covered by formal test cases, especially around different LinkedIn profile variations.
*   **Basic Compatibility Testing:** Ensuring the extension loads and functions on the latest stable version of Google Chrome.

## 4. Testing Environment

*   **Browser:** Latest stable version of Google Chrome on Windows (primary) and optionally macOS.
*   **LinkedIn Accounts:**
    *   At least one standard LinkedIn account for testing.
    *   Access to view a variety of LinkedIn profiles (different structures, with/without all sections like summary, different lengths of content).
*   **Network:** Standard internet connection.

## 5. Test Cases (High-Level)

Test cases will be derived primarily from the User Stories (US) and their Acceptance Criteria (AC) in `02-prd-linkedin-shrome-extension-support.md` and tasks in `06-tasks-linkedin-shrome-extension-support.md`.

---

**Test Suite: Extension Setup & Basic UI (Ref: Phase 0 Tasks, US-004)**

| Test Case ID | Description                                                                 | Steps                                                                                                                                    | Expected Result                                                                                                                                        | Status (Pass/Fail) |
| :----------- | :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| TC_SETUP_001 | Verify Extension Installation & Icon                                        | 1. Load unpacked extension in Chrome. 2. Check Chrome toolbar.                                                                             | Extension loads without errors. Extension icon is visible.                                                                                               |                    |
| TC_UI_001    | Verify Popup Display                                                        | 1. Click the extension icon on a LinkedIn page. 2. Click on a non-LinkedIn page.                                                           | Popup appears correctly when on LinkedIn. Popup may be disabled or show a message if not on LinkedIn (as per design choice). Default elements visible. |                    |
| TC_UI_002    | Verify Basic Popup Elements (Button, Data Area, Status Area)                | 1. Open popup.                                                                                                                           | "Scan Profile" button, data display area, and status message area are present as per `popup.html` design.                                            |                    |
| TC_UI_003    | Verify Basic Styling & Readability                                          | 1. Open popup.                                                                                                                           | Text is readable, button is clearly identifiable. Layout is clean and not broken.                                                                        |                    |

---

**Test Suite: Core Scraping & Display (Ref: Phase 1 Tasks, US-002, US-003)**

| Test Case ID | Description                                                      | Steps                                                                                                                                                                       | Expected Result                                                                                                                                                                                                                                                                                                                                                        | Status (Pass/Fail) |
| :----------- | :--------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| TC_SCRAPE_001| Trigger Scraping on a Valid Profile                                | 1. Navigate to a standard LinkedIn profile. 2. Open extension popup. 3. Click "Scan Profile".                                                                               | "Scanning..." message appears. After a short delay (NFR-001), scraped data (Name, Headline, Summary) is displayed in `#profileData`. Status message updates to success or data displayed. Button re-enabled.                                                                                                                                                         |                    |
| TC_SCRAPE_002| Verify Accuracy of Scraped Data (Name)                             | 1. Perform TC_SCRAPE_001. 2. Compare displayed name with actual profile name.                                                                                                 | Displayed name matches the profile.                                                                                                                                                                                                                                                                                                                                      |                    |
| TC_SCRAPE_003| Verify Accuracy of Scraped Data (Headline)                         | 1. Perform TC_SCRAPE_001. 2. Compare displayed headline with actual profile headline.                                                                                         | Displayed headline matches the profile.                                                                                                                                                                                                                                                                                                                                  |                    |
| TC_SCRAPE_004| Verify Accuracy of Scraped Data (Summary/About)                    | 1. Perform TC_SCRAPE_001 on a profile *with* a summary. 2. Compare displayed summary with actual profile summary.                                                              | Displayed summary matches the profile.                                                                                                                                                                                                                                                                                                                                 |                    |
| TC_SCRAPE_005| Scrape Profile Without a Summary Section                           | 1. Navigate to a LinkedIn profile known to *not* have a summary/about section. 2. Open popup, click "Scan Profile".                                                          | Name and Headline are scraped and displayed. Summary field in popup is empty or indicates "Not Available". No script errors.                                                                                                                                                                                                                                           |                    |
| TC_SCRAPE_006| Attempt Scraping on Non-Profile LinkedIn Page (e.g., Feed, Jobs)   | 1. Navigate to LinkedIn feed, jobs page, or messages. 2. Open popup, click "Scan Profile".                                                                                 | An appropriate error message is displayed in `#statusMessage` (e.g., "Not a valid profile page" or "Scraping failed"). No data displayed.                                                                                                                                                                                                                                    |                    |
| TC_SCRAPE_007| Attempt Scraping on Non-LinkedIn Page                              | 1. Navigate to a non-LinkedIn website. 2. Open popup, click "Scan Profile" (if button is active).                                                                          | An appropriate error message is displayed or button is inactive/handles gracefully.                                                                                                                                                                                                                                                                                        |                    |
| TC_SCRAPE_008| Multiple Scan Attempts on Same Profile                             | 1. Perform TC_SCRAPE_001. 2. Without reloading page, click "Scan Profile" again.                                                                                            | Extension correctly re-scrapes and displays data, or handles gracefully (e.g. shows same data, no errors).                                                                                                                                                                                                                                                             |                    |
| TC_DISPLAY_001| Verify Data Display Format                                         | 1. After successful scrape, observe data in popup.                                                                                                                          | Data is presented clearly. Each field (name, headline, summary) is distinguishable.                                                                                                                                                                                                                                                                                        |                    |

---

**Test Suite: Error Handling & Status Messages (Ref: Phase 1 Tasks, NFR-004)**

| Test Case ID | Description                                         | Steps                                                                                                        | Expected Result                                                                                                                  | Status (Pass/Fail) |
| :----------- | :-------------------------------------------------- | :----------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| TC_ERR_001   | Verify Loading Indicator                            | 1. Click "Scan Profile".                                                                                       | "Scanning..." (or similar) message shown. Button potentially disabled. Message cleared after completion/error. Button re-enabled. |                    |
| TC_ERR_002   | Verify Basic Scraping Failure Message (Generic)     | 1. (If possible to simulate) Force a generic scraping error in content script. 2. Trigger scan.                  | A user-friendly error message is shown in the popup (e.g., "Failed to retrieve profile data.").                                   |                    |
| TC_ERR_003   | Verify "Key Element Not Found" Message (e.g., Name) | 1. (If possible to simulate by altering DOM) Remove main name element from profile. 2. Trigger scan.             | Specific error if designed (e.g. "Could not find profile name"), or a general failure message.                                     |                    |

---

**(Optional MVP) Test Suite: User Configuration (Ref: Phase 2 Tasks, Simplified US-001)**

| Test Case ID  | Description                                           | Steps                                                                                                                                       | Expected Result                                                                                                                      | Status (Pass/Fail) |
| :------------ | :---------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------- | :----------------- |
| TC_OPT_001    | Access Options Page                                   | 1. Right-click extension icon, select "Options" (or access via `chrome://extensions`).                                                      | Options page (`options.html`) loads correctly.                                                                                       |                    |
| TC_OPT_002    | Save LinkedIn URL                                     | 1. Open Options page. 2. Enter a valid LinkedIn URL in the input field. 3. Click "Save".                                                      | Confirmation message shown. URL is saved to `chrome.storage.local` (verify via dev tools or by reloading options page).            |                    |
| TC_OPT_003    | Load Saved LinkedIn URL                               | 1. Save a URL via TC_OPT_002. 2. Close and reopen Options page.                                                                               | The previously saved URL is populated in the input field.                                                                              |                    |
| TC_OPT_004    | Update Saved LinkedIn URL                             | 1. Save a URL. 2. Change the URL in the input field, click "Save". 3. Reopen Options.                                                         | The updated URL is shown.                                                                                                              |                    |

---

## 6. Non-Functional Requirement Checks

*   **NFR-001 (Performance):**
    *   Manually time the duration from clicking "Scan Profile" to data display. Should generally be within 5-10 seconds for typical profiles.
    *   Observe browser responsiveness while the extension is active and during scraping. No noticeable lag or freezing.
*   **NFR-002 (Usability):**
    *   Perform core tasks (install, open popup, scan profile, view data) without needing instructions.
    *   Assess if UI elements are intuitive.
*   **NFR-003 (Privacy):**
    *   If options page is implemented, verify user-provided URL is stored in `chrome.storage.local` (via Chrome DevTools > Application > Storage).
    *   Confirm no unexpected network requests are made by the extension related to user data.
*   **NFR-004 (Error Handling - Basic):** Covered by functional test cases for errors. Messages should be user-friendly.
*   **NFR-006 (Accessibility - Basic):**
    *   Check if popup button can be triggered using keyboard (Tab to focus, Enter/Space to click).
    *   Check if displayed text has reasonable contrast and is readable.

## 7. Defect Reporting

*   Defects will be informally tracked (e.g., in a shared list or issue tracker if set up) for MVP.
*   Include: Test Case ID (if applicable), Steps to Reproduce, Actual Result, Expected Result, Severity (High/Medium/Low).

## 8. Test Completion Criteria (MVP)

*   All defined high-level test cases for in-scope MVP features executed.
*   A high percentage of critical and high-severity test cases passing.
*   Known critical or high-severity defects are either fixed or have a clear plan/acknowledgment if deferred.
*   Core functionality is stable and usable on the primary target environment (latest Chrome on Windows). 