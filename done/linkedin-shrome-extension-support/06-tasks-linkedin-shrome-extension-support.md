# Project Plan: LinkedIn Insight Chrome Extension (MVP)

**Overall Project Goal:** Develop a functional MVP of the "LinkedIn Insight" Chrome Extension. This extension will allow users to manually trigger scraping of LinkedIn profiles they are viewing, display key information from the scraped profile in a simple popup, and lay the groundwork for future LLM-based networking score generation.

---

### **Phase 0: Project Setup & Extension Foundation**

#### **1. Directory Structure & Initial Files**

*   **Task 0.1: Create Extension Directory Structure** `[ ]`
    *   **Objective:** Establish the foundational directory structure for the Chrome Extension within the project.
    *   **Action(s):**
        1.  Create the main `extension/` directory in the project root.
        2.  Inside `extension/`, create the following subdirectories:
            *   `icons/`
            *   `src/`
            *   `src/content_scripts/`
            *   `src/popup/`
        3.  (Optional, if US-001 simplified config is implemented) Create `src/options/`.
        4.  (Optional, if shared utilities become necessary) Create `src/lib/`.
    *   **Verification/Deliverable(s):** A correctly structured `extension/` directory as outlined in `04-architecture.md`.

*   **Task 0.2: Create `manifest.json`** `[ ]`
    *   **Objective:** Define the core properties and permissions of the Chrome extension.
    *   **Action(s):**
        1.  Create `extension/manifest.json`.
        2.  Populate it with essential fields:
            *   `manifest_version`: 3
            *   `name`: "LinkedIn Insight MVP"
            *   `version`: "0.1.0"
            *   `description`: "Provides basic insights from LinkedIn profiles."
            *   `permissions`: `["activeTab", "storage", "scripting"]` (Note: `scripting` is needed for `chrome.scripting.executeScript` if used instead of manifest-declared content scripts for dynamic injection, or for CSS injection. `activeTab` is often preferred for user-triggered actions.)
            *   `host_permissions`: `["*://*.linkedin.com/*"]`
            *   `action` (browser action): Define `default_popup` ("src/popup/popup.html") and `default_icons`.
            *   `icons`: Specify paths to 16, 48, and 128px icons in the `icons/` directory.
            *   `content_scripts` (if declaring statically): Define a content script to run on `*://*.linkedin.com/*` pointing to `src/content_scripts/linkedin_scraper.js`. (Alternatively, programmatic injection via `chrome.scripting` can be used from `popup.js` or `background.js`).
    *   **Verification/Deliverable(s):** A valid `extension/manifest.json` file. The extension can be loaded into Chrome (`chrome://extensions` -> "Load unpacked").

*   **Task 0.3: Add Placeholder Icons** `[ ]`
    *   **Objective:** Provide basic icons for the extension.
    *   **Action(s):**
        1.  Create placeholder PNG icons (e.g., simple colored squares or a basic logo).
        2.  Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `extension/icons/` directory.
    *   **Verification/Deliverable(s):** Icons present in the `icons/` directory and referenced correctly in `manifest.json`. Extension icon visible in Chrome toolbar.

#### **2. Basic Popup UI (US-004)**

*   **Task 0.4: Create `popup.html`** `[ ]`
    *   **Objective:** Define the basic HTML structure for the extension's popup.
    *   **Action(s):**
        1.  Create `extension/src/popup/popup.html`.
        2.  Include:
            *   A title (e.g., "LinkedIn Insight").
            *   A button to trigger scraping (e.g., `<button id="scrapeBtn">Scan Profile</button>`).
            *   A div or section to display scraped data (e.g., `<div id="profileData"></div>`).
            *   A div for status messages/errors (e.g., `<div id="statusMessage"></div>`).
            *   Link to `popup.css` and `popup.js`.
    *   **Verification/Deliverable(s):** `popup.html` created. Popup appears when extension icon is clicked.

*   **Task 0.5: Create `popup.css` (Basic Styling)** `[ ]`
    *   **Objective:** Apply minimal styling to the popup for usability.
    *   **Action(s):**
        1.  Create `extension/src/popup/popup.css`.
        2.  Add basic styles for readability, button appearance, and layout of the elements defined in `popup.html`.
    *   **Verification/Deliverable(s):** Popup has basic, clean styling.

*   **Task 0.6: Create `popup.js` (Initial Logic)** `[ ]`
    *   **Objective:** Implement basic JavaScript for the popup, including the scrape button event listener.
    *   **Action(s):**
        1.  Create `extension/src/popup/popup.js`.
        2.  Add an event listener to the "Scan Profile" button (`#scrapeBtn`).
        3.  Initially, this button click can log to the console or display a "Button clicked" message in the `#statusMessage` div.
    *   **Verification/Deliverable(s):** Clicking the "Scan Profile" button in the popup triggers the defined JavaScript action.

### **Phase 1: Core Scraping & Display Functionality**

#### **1. LinkedIn Profile Scraping (US-002)**

*   **Task 1.1: Develop `linkedin_scraper.js` (Content Script - Data Extraction)** `[ ]`
    *   **Objective:** Implement the core logic to extract specified data from a LinkedIn profile page.
    *   **Action(s):**
        1.  Create `extension/src/content_scripts/linkedin_scraper.js`.
        2.  Write JavaScript functions to:
            *   Safely access the DOM of the active LinkedIn profile page.
            *   Extract the profile name, headline, and summary/about section. Use robust selectors (e.g., based on stable attributes or structure, but be mindful of LinkedIn's dynamic class names).
            *   Handle cases where elements might be missing (e.g., no summary section).
        3.  Package the extracted data into a simple JavaScript object.
    *   **Verification/Deliverable(s):** Functions in `linkedin_scraper.js` can reliably extract the target data points when tested on various LinkedIn profile pages (manually, by injecting the script via dev tools initially).

*   **Task 1.2: Implement Message Listener in `linkedin_scraper.js`** `[ ]`
    *   **Objective:** Allow the content script to receive messages (e.g., from `popup.js`) to initiate scraping.
    *   **Action(s):**
        1.  In `linkedin_scraper.js`, add a `chrome.runtime.onMessage` listener.
        2.  When a "scrapeProfile" message is received:
            *   Call the data extraction functions from Task 1.1.
            *   Send the extracted data (or an error object) back as a response using the `sendResponse` callback.
    *   **Verification/Deliverable(s):** `linkedin_scraper.js` listens for messages and can trigger scraping and send a response.

#### **2. Communication & Data Display (US-003)**

*   **Task 1.3: Enhance `popup.js` to Send Scraping Request** `[ ]`
    *   **Objective:** Enable `popup.js` to request the content script to scrape the current profile.
    *   **Action(s):**
        1.  In `popup.js`, when the "Scan Profile" button is clicked:
            *   Get the current active tab (ensuring it's a LinkedIn page).
            *   Use `chrome.tabs.sendMessage` to send a "scrapeProfile" message to the content script (`linkedin_scraper.js`) on that tab.
            *   Handle the response from the content script in a callback.
    *   **Verification/Deliverable(s):** Clicking the button in `popup.js` successfully sends a message to `linkedin_scraper.js`.

*   **Task 1.4: Enhance `popup.js` to Display Scraped Data/Errors** `[ ]`
    *   **Objective:** Update the popup UI with the data received from the content script or show an error message.
    *   **Action(s):**
        1.  In the `chrome.tabs.sendMessage` callback in `popup.js`:
            *   If data is received successfully, populate the `#profileData` div with the name, headline, and summary.
            *   If an error is received, display an appropriate error message in the `#statusMessage` div.
            *   Clear previous status messages/data on new attempts.
    *   **Verification/Deliverable(s):** Scraped data (name, headline, summary) is correctly displayed in the popup. Errors from scraping are also shown.

#### **3. Basic Error Handling & Status (NFR-004)**

*   **Task 1.5: Implement Basic Error Handling in `linkedin_scraper.js`** `[ ]`
    *   **Objective:** Gracefully handle common issues during scraping.
    *   **Action(s):**
        1.  In `linkedin_scraper.js`, add try-catch blocks around DOM manipulation.
        2.  If key elements are not found, construct a meaningful error object to send back (e.g., `{ error: "Could not find profile summary." }`).
        3.  Detect if not on a valid LinkedIn profile page (e.g., by checking URL or looking for a key profile element).
    *   **Verification/Deliverable(s):** The content script returns specific error messages for common failure scenarios, which are then displayed in the popup.

*   **Task 1.6: Implement Loading/Status Indicators in `popup.js`** `[ ]`
    *   **Objective:** Provide user feedback during the scraping process.
    *   **Action(s):**
        1.  In `popup.js`:
            *   When "Scan Profile" is clicked, display a "Scanning..." message in `#statusMessage`.
            *   Disable the button to prevent multiple clicks while processing.
            *   On success or error, clear the "Scanning..." message and re-enable the button.
    *   **Verification/Deliverable(s):** User sees a loading state in the popup while scraping is in progress.

### **Phase 2: (Optional MVP) User Configuration & Refinements**

#### **1. Optional User-Provided LinkedIn URL (Simplified US-001)**

*(These tasks are conditional on deciding to implement the simplified version of US-001 for MVP)*

*   **Task 2.1: Create `options.html` and `options.js`** `[ ]`
    *   **Objective:** Provide a UI for users to (optionally) input their own LinkedIn profile URL.
    *   **Action(s):**
        1.  Create `extension/src/options/options.html` with an input field for a URL and a save button.
        2.  Create `extension/src/options/options.js` to handle:
            *   Loading any saved URL from `chrome.storage.local` on page load.
            *   Saving the entered URL to `chrome.storage.local` on button click.
            *   Displaying a success/confirmation message.
        3.  Add `options_page` or `options_ui` to `manifest.json` pointing to `options.html`.
    *   **Verification/Deliverable(s):** Options page accessible, allows input and saving of a URL. Saved URL persists.

*   **Task 2.2: (Future Placeholder) Consider how stored URL might be used** `[ ]`
    *   **Objective:** Document intent for future use, even if not implemented in MVP.
    *   **Action(s):**
        1.  No direct coding for MVP if just storing.
        2.  Perhaps `popup.js` or `linkedin_scraper.js` could read this URL from `chrome.storage.local` if it were to be used in future LLM context (out of scope for MVP display).
    *   **Verification/Deliverable(s):** Decision on whether/how this stored URL will be accessed or displayed in any MVP context (likely not, per PRD).

#### **2. Testing and Final Polish**

*   **Task 2.3: Cross-Test on Different LinkedIn Profile Structures** `[ ]`
    *   **Objective:** Ensure the scraper is reasonably robust.
    *   **Action(s):** Test the extension on various LinkedIn profiles:
        *   Profiles with/without summaries.
        *   Profiles with different lengths of headlines/names.
        *   Profiles with different languages (though MVP is English-first, observe behavior).
        *   Basic vs. Premium profile layouts (if observable differences affect MVP scraping targets).
    *   **Verification/Deliverable(s):** Scraper works reliably for the defined MVP data points across common profile variations. Known limitations documented.

*   **Task 2.4: Code Cleanup and Review** `[ ]`
    *   **Objective:** Ensure code quality and readability.
    *   **Action(s):**
        1.  Review all JavaScript code for clarity, efficiency, and comments where necessary.
        2.  Check for any console errors or warnings.
        3.  Ensure consistent styling.
    *   **Verification/Deliverable(s):** Cleaned-up codebase.

*   **Task 2.5: Prepare `README.md` for the Extension** `[ ]`
    *   **Objective:** Provide basic information about the extension.
    *   **Action(s):**
        1.  Create or update a `README.md` file inside the `extension/` directory (or a section in the main project `README.md`).
        2.  Include:
            *   Brief description of the MVP's functionality.
            *   How to load and use the extension.
            *   Known limitations of the MVP.
    *   **Verification/Deliverable(s):** A `README.md` file with basic usage instructions.

--- 