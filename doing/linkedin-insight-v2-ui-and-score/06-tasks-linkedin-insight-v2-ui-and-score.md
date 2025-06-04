---
# AI-Assisted Project Execution Plan & Task List: LinkedIn Insight V2

**Overall Project Goal:** Enhance the LinkedIn Insight Chrome extension with a new multi-screen UI based on provided HTML files (`ui/*.html`), implement a revised user flow for initial setup and profile analysis, integrate a networking score display from an n8n webhook, update settings management, and introduce an automatic popup feature for LinkedIn profile pages. This project builds upon the V1 extension and aims to deliver a more intuitive and insightful user experience.

**Reference Documents:**
*   `doing/linkedin-insight-v2-ui-and-score/01-idea-linkedin-insight-v2-ui-and-score.md`
*   `doing/linkedin-insight-v2-ui-and-score/02-prd-linkedin-insight-v2-ui-and-score.md`
*   `doing/linkedin-insight-v2-ui-and-score/03-prd-plus-linkedin-insight-v2-ui-and-score.md`
*   `doing/linkedin-insight-v2-ui-and-score/04-architecture-linkedin-insight-v2-ui-and-score.md`
*   `rules/system.md`
*   `prompts/06-tasks-prompt.md` (for structure and style)

---

### **Phase 0: Project V2 Setup & Foundation**

#### **1. Directory Structure and Core File Setup**

*   **Task 0.1: Implement V2 Directory Structure** [ ]
    *   **Objective:** Update the `extension/` directory to match the V2 architecture.
    *   **Action(s):**
        1.  Create `extension/background/` directory.
        2.  Rename `extension/src/options/` to `extension/settings/`.
        3.  Verify/Create `extension/popup/` and `extension/ui/` directories.
        4.  Create `extension/_locales/en/` directories and a basic `messages.json` file.
        5.  Move/Rename existing files if necessary to fit the new structure (e.g. V1 `popup.js` might be a starting point for `popup_core.js`, V1 `options.js` for `settings.js`).
    *   **Verification/Deliverable(s):** The `extension/` directory structure matches the one defined in `04-architecture-linkedin-insight-v2-ui-and-score.md` and `rules/system.md`.

*   **Task 0.2: Create `popup_shell.html`** [ ]
    *   **Objective:** Establish the minimal HTML shell for the popup UI.
    *   **Action(s):**
        1.  Create `extension/popup/popup_shell.html`.
        2.  Content should be a basic HTML structure with a main container div (e.g., `<div id="view-container"></div>`) and a script tag for `popup_core.js`.
        3.  Include a link to `popup.css` if any shell-specific global styles are needed.
    *   **Verification/Deliverable(s):** `extension/popup/popup_shell.html` created as per `04-architecture...` and `rules/system.md`.

*   **Task 0.3: Initialize `popup_core.js`** [ ]
    *   **Objective:** Create the main JavaScript file for popup logic.
    *   **Action(s):**
        1.  Create `extension/popup/popup_core.js`.
        2.  Implement a basic structure, including placeholder functions for view loading (e.g., `async function loadView(viewName)`), event handling, and state management variables (as outlined in `rules/system.md`, section 6.C).
    *   **Verification/Deliverable(s):** `extension/popup/popup_core.js` created with initial structure.

*   **Task 0.4: Initialize `background.js`** [ ]
    *   **Objective:** Create the background script for the extension.
    *   **Action(s):**
        1.  Create `extension/background/background.js`.
        2.  Add placeholder listeners for `chrome.tabs.onUpdated` and `chrome.tabs.onActivated`.
    *   **Verification/Deliverable(s):** `extension/background/background.js` created with initial structure.

*   **Task 0.5: Create `settings.html`, `settings.js`, `settings.css`** [ ]
    *   **Objective:** Set up the files for the new settings page.
    *   **Action(s):**
        1.  Create `extension/settings/settings.html` based on `ui/settings.html` mockups (structure, Tailwind CSS).
        2.  Create `extension/settings/settings.js` with placeholder functions for loading/saving settings.
        3.  Create `extension/settings/settings.css` for any specific styles not covered by Tailwind.
    *   **Verification/Deliverable(s):** Files `settings.html`, `settings.js`, `settings.css` created in `extension/settings/`.

*   **Task 0.6: Verify UI HTML Files and Tailwind CSS Integration** [ ]
    *   **Objective:** Ensure all provided `ui/*.html` files are present and Tailwind CSS is correctly integrated or can be applied.
    *   **Action(s):**
        1.  Verify `ui/error.html`, `ui/loading.html`, `ui/main.html`, `ui/profile.html`, `ui/score_screen.html` are in `extension/ui/`.
        2.  Confirm that these files use Tailwind CSS classes as per their design. If Tailwind CSS is not yet set up for the project, plan for its inclusion (e.g., via CDN link in each HTML or a build step if preferred, though CDN is simpler for non-framework HTML files). The `rules/system.md` implies Tailwind is used directly.
    *   **Verification/Deliverable(s):** All UI view files are present in `extension/ui/`. Plan for Tailwind CSS rendering confirmed.

---

### **Phase 1: Core UI Implementation & User Flows (Managed by `popup_core.js`)**

#### **2. View Loading and Basic Navigation**

*   **Task 1.1: Implement View Loader in `popup_core.js`** [ ]
    *   **Objective:** Enable `popup_core.js` to dynamically load HTML content from `extension/ui/` into `popup_shell.html`.
    *   **Action(s):**
        1.  In `popup_core.js`, implement the `async function loadView(viewName)`:
            *   It should construct the path to `extension/ui/{viewName}.html`.
            *   Use `fetch` to get the HTML content.
            *   Inject the content into the `#view-container` in `popup_shell.html`.
            *   Handle potential errors if a view file is not found.
        2.  Implement a function to initialize the first view (e.g., try to load `userLinkedInProfileData` and `n8nWebhookUrl` from storage; if missing, load `main.html`, otherwise determine context).
    *   **Verification/Deliverable(s):** `popup_core.js` can load and display different `ui/*.html` files. The initial view logic is in place.

#### **3. Initial Setup Flow (`ui/main.html`)**

*   **Task 1.2: Implement `ui/main.html` View and Logic** [ ]
    *   **Objective:** Implement the user onboarding flow for users without saved profile data. (US-001)
    *   **Action(s):**
        1.  In `popup_core.js`, after `ui/main.html` is loaded:
            *   Attach event listener to the "Get Started" button.
            *   Implement input field for user's LinkedIn profile URL.
            *   On "Get Started" click:
                *   Validate the URL format (inline error for invalid URL).
                *   Instruct the active tab to navigate to the provided URL (`chrome.tabs.update`).
                *   After navigation (listen for tab update completion), trigger `linkedin_scraper.js` (Task 3.1).
                *   (Deferred: Resume upload UI present but non-functional).
    *   **Verification/Deliverable(s):** `ui/main.html` is functional: accepts URL, navigates tab.

#### **4. User's Own Profile View (`ui/profile.html`)**

*   **Task 1.3: Implement `ui/profile.html` View for User's Own Data** [ ]
    *   **Objective:** Display the user's own scraped LinkedIn profile data. (US-002)
    *   **Action(s):**
        1.  In `popup_core.js`, create a function `displayUserProfile(profileData)` that:
            *   Takes `profileData` as input.
            *   Loads `ui/profile.html`.
            *   Populates `ui/profile.html` with all sections from `profileData` (summary, experience, education, licenses & certifications).
        2.  Call this function after successful scraping during the initial setup (Task 1.2) or when navigating from "My Profile" link.
    *   **Verification/Deliverable(s):** User's own profile data is correctly displayed in `ui/profile.html`.

#### **5. Target Profile Analysis Flow & Score Display (`ui/score_screen.html`, `ui/loading.html`)**

*   **Task 1.4: Implement Loading State (`ui/loading.html`)** [ ]
    *   **Objective:** Show a loading indicator during asynchronous operations.
    *   **Action(s):**
        1.  In `popup_core.js`, create functions `showLoading()` and `hideLoading()` (or simply `loadView('loading')`).
        2.  Call `showLoading()` before initiating scraping or n8n API calls.
    *   **Verification/Deliverable(s):** `ui/loading.html` is displayed during relevant operations.

*   **Task 1.5: Implement `ui/score_screen.html` View and Data Population** [ ]
    *   **Objective:** Display the networking score and analysis for a target profile. (US-007)
    *   **Action(s):**
        1.  In `popup_core.js`, create a function `displayScoreScreen(targetData, scoreInfo)`:
            *   Loads `ui/score_screen.html`.
            *   Populates target's basic info (name, photo, headline) from `targetData`.
            *   Displays the `score` (numerical) from `scoreInfo`, ideally with a visual component (e.g., simple bar or circle, text display is MVP).
            *   Displays `reasons_bullets` from `scoreInfo` as a list.
            *   Sets up the "Scraped Information" button/toggle (Task 1.6).
            *   Sets up the dropdown menu for navigation (Task 1.7).
    *   **Verification/Deliverable(s):** `ui/score_screen.html` correctly displays target info, score, and reasons.

*   **Task 1.6: Implement "Scraped Information" Toggle on `ui/score_screen.html`** [ ]
    *   **Objective:** Allow users to view the full scraped details of the target profile. (US-008)
    *   **Action(s):**
        1.  In `popup_core.js`, when `ui/score_screen.html` is active:
            *   Attach event listener to the "Scraped Information" button.
            *   On click, toggle visibility of a section/div within `ui/score_screen.html`.
            *   This section should be populated with the full `targetProfileData` (summary, experience, etc.), similar to how `ui/profile.html` displays data. Consider if `ui/profile.html`'s rendering logic can be reused.
    *   **Verification/Deliverable(s):** Full scraped details of the target profile can be shown/hidden on `ui/score_screen.html`.

*   **Task 1.7: Implement Navigation Dropdown on `ui/score_screen.html`** [ ]
    *   **Objective:** Allow navigation to "My Profile" and "Settings". (US-009)
    *   **Action(s):**
        1.  In `popup_core.js`, when `ui/score_screen.html` is active:
            *   Attach event listeners to the "My Profile" and "Settings" links in the dropdown.
            *   "My Profile" click: Load `userLinkedInProfileData` and call `displayUserProfile()` (Task 1.3).
            *   "Settings" click: Load `ui/settings.html` via `loadView('settings')` and initialize its specific logic (Phase 2 tasks).
    *   **Verification/Deliverable(s):** Navigation from score screen to user profile and settings page is functional.

#### **6. Error Handling Flow (`ui/error.html`)**

*   **Task 1.8: Implement `ui/error.html` View and Logic** [ ]
    *   **Objective:** Display clear error messages to the user. (US-012, US-013)
    *   **Action(s):**
        1.  In `popup_core.js`, create a function `displayError(errorMessage, errorDetails)`:
            *   Loads `ui/error.html`.
            *   Populates a designated element with `errorMessage` and optionally `errorDetails`.
            *   Attach event listener to the "Try Again" button.
            *   The "Try Again" logic needs to store context about the last failed action to re-trigger it (e.g., re-scrape current target, re-call n8n).
        2.  Call `displayError()` from `try/catch` blocks around scraping, n8n calls, and other fallible operations.
    *   **Verification/Deliverable(s):** `ui/error.html` is displayed on errors with appropriate messages. "Try Again" functionality is planned.

---

### **Phase 2: Background Script, Manifest, and Settings Finalization**

#### **7. Settings Page (`extension/settings/`)**

*   **Task 2.1: Implement Settings Loading and Saving in `settings.js`** [ ]
    *   **Objective:** Allow users to configure their n8n webhook, own LinkedIn URL, and auto-popup preference. (US-003, US-010, US-011)
    *   **Action(s):**
        1.  In `settings.js` (called by `popup_core.js` when `settings.html` is loaded):
            *   Load current settings (`n8nWebhookUrl`, `userLinkedInUrl`, `settings_autoOpenPopup`) from `chrome.storage.local` and populate input fields/toggle in `settings.html`.
            *   Attach event listener to "Save Settings" button. On click:
                *   Validate n8n URL format.
                *   Save all settings to `chrome.storage.local`.
                *   If user's LinkedIn URL changed, trigger re-scrape: navigate active tab to the new URL, then trigger `linkedin_scraper.js`. Update `userLinkedInProfileData`.
            *   Implement "Clear My Saved Profile" button logic (US-004): prompt for confirmation, remove `userLinkedInProfileData`, transition to `ui/main.html`.
    *   **Verification/Deliverable(s):** Settings can be saved, loaded, and cleared. User profile URL update triggers re-scrape.

#### **8. Background Script (`extension/background/background.js`)**

*   **Task 2.2: Implement LinkedIn Profile URL Detection** [ ]
    *   **Objective:** Detect when the user navigates to a LinkedIn profile page.
    *   **Action(s):**
        1.  In `background.js`:
            *   Use `chrome.tabs.onUpdated` and `chrome.tabs.onActivated` listeners.
            *   In the listener, check if `tab.url` matches `https://www.linkedin.com/in/*`.
    *   **Verification/Deliverable(s):** `background.js` correctly identifies navigation to LinkedIn profile URLs.

*   **Task 2.3: Implement Automatic Popup Feature** [ ]
    *   **Objective:** Automatically open the extension popup if the feature is enabled. (US-005)
    *   **Action(s):**
        1.  In `background.js`, when a LinkedIn profile URL is detected:
            *   Read the `settings_autoOpenPopup` value from `chrome.storage.local`.
            *   If true, and if `userLinkedInProfileData` exists (to ensure user is set up), call `chrome.action.openPopup()`.
    *   **Verification/Deliverable(s):** Popup opens automatically on LinkedIn profiles if the setting is enabled and user is set up.

#### **9. Manifest (`extension/manifest.json`) Updates**

*   **Task 2.4: Update `manifest.json` for V2** [ ]
    *   **Objective:** Configure the manifest file for V2 structure and features.
    *   **Action(s):**
        1.  Update `action.default_popup` to `popup/popup_shell.html`.
        2.  Set `background.service_worker` to `background/background.js`.
        3.  Change `options_page` to `settings/settings.html`.
        4.  Verify permissions: `storage`, `scripting`, `activeTab`, `tabs`.
        5.  Update `host_permissions`: ensure `*://*.linkedin.com/*` is present. For n8n, use `*://*/*` if dynamic permissions are too complex for MVP, but document this security trade-off. (As per `rules/system.md`).
        6.  Add `_locales/en/messages.json` to `default_locale`.
        7.  Update version number for V2.
    *   **Verification/Deliverable(s):** `manifest.json` is correctly configured for V2.

---

### **Phase 3: Scraper and N8N Integration & Refinement**

#### **10. LinkedIn Scraper (`extension/content_scripts/linkedin_scraper.js`)**

*   **Task 3.1: Ensure `linkedin_scraper.js` Compatibility and Data Return** [ ]
    *   **Objective:** Verify the scraper works when called by `popup_core.js` and returns data as expected.
    *   **Action(s):**
        1.  Modify `popup_core.js` to call `linkedin_scraper.js` using `chrome.scripting.executeScript`.
            *   The scraper function executed should return the scraped data object.
            *   Handle the promise returned by `executeScript` to get the results.
        2.  Test scraping both user's own profile (during setup) and target profiles.
        3.  Store successfully scraped user's profile data to `chrome.storage.local.userLinkedInProfileData`.
        4.  Store scraped target profile data temporarily in `popup_core.js` for n8n call and display.
    *   **Verification/Deliverable(s):** `linkedin_scraper.js` is successfully invoked, returns data to `popup_core.js`. Data is stored correctly.

#### **11. N8N Webhook Integration**

*   **Task 3.2: Implement N8N Webhook Call in `popup_core.js`** [ ]
    *   **Objective:** Send target and user profile data to the configured n8n webhook and receive the score. (US-006)
    *   **Action(s):**
        1.  In `popup_core.js`, after target profile is scraped:
            *   Retrieve `userLinkedInProfileData` from `chrome.storage.local`.
            *   Retrieve `n8nWebhookUrl` from `chrome.storage.local`.
            *   Construct the JSON payload: `{ targetProfileData: {...}, userProfileData: {...} }`.
            *   Make a `POST` request using `fetch` to `n8nWebhookUrl` with the payload.
            *   Implement `try/catch` for the `fetch` call. On failure, call `displayError()`.
        2.  Handle the response from n8n:
            *   Parse the JSON response (expecting `{ score, reasons_bullets }`).
            *   If successful, pass data to `displayScoreScreen()` (Task 1.5).
            *   If response is invalid or missing key fields, call `displayError()`.
    *   **Verification/Deliverable(s):** Data is sent to n8n; score and reasons are received and processed or errors handled.

#### **12. Styling and UI Refinements**

*   **Task 3.3: Apply Tailwind CSS and Custom Styles** [ ]
    *   **Objective:** Ensure all UI views (`ui/*.html`, `settings/settings.html`, `popup/popup_shell.html`) are styled correctly.
    *   **Action(s):**
        1.  Thoroughly review all views and apply Tailwind CSS classes as per mockups and PRD descriptions.
        2.  Use `popup.css` and `settings.css` for any necessary custom global styles or overrides not easily achievable with Tailwind.
        3.  Ensure a consistent look and feel across all views.
        4.  Test for responsiveness within the popup constraints.
    *   **Verification/Deliverable(s):** All UI views are styled correctly and consistently.

---

### **Phase 4: Testing, Documentation, and Finalization**

#### **13. Testing**

*   **Task 4.1: Implement Basic Unit Tests** [ ]
    *   **Objective:** Test key logic functions in JavaScript files.
    *   **Action(s):**
        1.  Write unit tests for critical functions in `popup_core.js` (e.g., view loading decision logic, data formatting for n8n, state changes).
        2.  Write unit tests for `settings.js` (e.g., saving/loading settings to/from mock storage).
        3.  Write unit tests for URL matching logic in `background.js`.
        4.  (Optional for MVP, but recommended by `rules/system.md`) Consider Jest or a simple assertion library.
    *   **Verification/Deliverable(s):** Unit tests for key JavaScript logic are implemented and passing.

*   **Task 4.2: Perform Manual End-to-End Testing** [ ]
    *   **Objective:** Test all user flows and features of the V2 extension.
    *   **Action(s):**
        1.  Test initial setup flow (US-001).
        2.  Test managing user's own profile (US-002, US-003, US-004).
        3.  Test target profile analysis, including auto-popup and manual popup opening if applicable (US-005, US-006, US-007, US-008).
        4.  Test navigation from score screen (US-009).
        5.  Test settings configuration (US-010, US-011).
        6.  Test all error handling paths (US-012, US-013).
        7.  Test against various LinkedIn profile layouts if possible.
        8.  Test with different valid and invalid n8n webhook URLs.
    *   **Verification/Deliverable(s):** All user stories and acceptance criteria are met. Major bugs are identified and fixed.

#### **14. Documentation and Cleanup**

*   **Task 4.3: Update `README.md`** [ ]
    *   **Objective:** Provide comprehensive documentation for V2.
    *   **Action(s):**
        1.  Update `README.md` with:
            *   Overview of V2 features.
            *   Instructions for installation.
            *   How to configure and use the extension (including n8n webhook setup).
            *   Troubleshooting common issues.
    *   **Verification/Deliverable(s):** `README.md` is updated for V2.

*   **Task 4.4: Add Code Comments and Docstrings** [ ]
    *   **Objective:** Improve code maintainability.
    *   **Action(s):**
        1.  Add comments to complex sections of code in all `.js` files.
        2.  Add JSDoc-style docstrings to functions, explaining their purpose, parameters, and return values.
    *   **Verification/Deliverable(s):** Codebase is well-commented and documented.

*   **Task 4.5: Final Code Review and Cleanup** [ ]
    *   **Objective:** Ensure code quality and remove any unused V1 artifacts.
    *   **Action(s):**
        1.  Perform a final review of all V2 code.
        2.  Remove any dead code or old V1 files/logic that are no longer needed (e.g., V1 `popup.html`, `popup.js`, `options/*` if not fully repurposed).
        3.  Ensure consistent formatting and adherence to `rules/system.md`.
    *   **Verification/Deliverable(s):** Codebase is clean, reviewed, and ready for packaging.

---

**Conclusion:** Upon completion of these tasks, LinkedIn Insight V2 will deliver an enhanced user interface, a novel networking score feature, and improved configurability, significantly upgrading the extension's value proposition.
--- 