# System Design Patterns and Architectural Rules for LinkedIn Insight V2

## 1. Overarching Architectural Style

*   **Chosen Style:** Modular Monolith (within the Chrome Extension context)
*   **Rationale:** This style is chosen for its simplicity and suitability for the scale of a browser extension. It allows for rapid implementation while enabling a clear separation of concerns between different parts of the extension (background, popup, content scripts, settings). This aligns with the project goal of efficient development for V2.
*   **Key Characteristics & Constraints:**
    *   Modules (e.g., `background/`, `popup/`, `content_scripts/`, `settings/`) should be as self-contained as possible.
    *   Communication between major JavaScript components (e.g., background to popup) should primarily use Chrome's messaging APIs (`chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`) or storage events, rather than direct function calls across contexts.
    *   The popup UI logic (`popup_core.js`) will handle dynamic view loading and act as the central controller for the user interface.
    *   Content scripts (`linkedin_scraper.js`) are responsible *only* for DOM interaction and data extraction from LinkedIn pages. All other logic resides in the popup or background scripts.

## 2. Core Technology Stack & Rationale

*   **A. Programming Languages:**
    *   `JavaScript (ES6+)`: Primary language for all extension logic including `background/background.js`, `popup/popup_core.js`, `content_scripts/linkedin_scraper.js`, and `settings/settings.js`. Chosen for its native support in Chrome extensions and web technologies.
    *   `HTML5 & CSS3`: For structuring UI views (files in `ui/`, `popup/popup_shell.html`, `settings/settings.html`) and for styling.
*   **B. Data Persistence:**
    *   `Chrome Storage API (chrome.storage.local)`: Used for storing the user's own scraped LinkedIn profile (`userLinkedInProfileData`), their n8n webhook URL (`n8nWebhookUrl`), and user preferences like the auto-open popup setting (`settings_autoOpenPopup`). Chosen for its built-in availability in Chrome extensions, ease of use for client-side storage, and suitability for the amount and type of data.
*   **C. Key Libraries & Frameworks:**
    *   `Tailwind CSS`: For utility-first CSS styling within the HTML views (`ui/`, `settings/`). Chosen for rapid UI development and consistency.
    *   *No other major JavaScript frameworks (e.g., React, Vue, Angular) for V2 MVP popup UI:* To maintain simplicity, reduce build complexity, and keep the extension lightweight. Vanilla JavaScript will be used for DOM manipulation and view management in `popup_core.js`.
*   **D. Version Control:**
    *   `Git`: For version control.
    *   *Branching Strategy Suggestion (if not already in place):* A simple flow like GitHub Flow (create branches from `main` for features/fixes, merge back via Pull Requests) is recommended for this project size.

## 3. Key Design Patterns Employed

*   **Pattern 1: Module Pattern (JavaScript ES6 Modules)**
    *   **Description:** Encapsulates related functions and data into reusable modules using ES6 `import`/`export` syntax.
    *   **Project Application:**
        *   `linkedin_scraper.js` will export its main scraping function(s).
        *   `popup_core.js` will be internally structured using functions and potentially helper modules if it grows complex (e.g., for API interactions, view rendering logic).
        *   `background.js` and `settings.js` will be self-contained modules.
    *   **Example Snippet/Context (Conceptual):**
        In `popup_core.js`, different functionalities like loading views, handling API calls, and managing state will be organized into clearly defined functions or objects, promoting modularity.
        ```javascript
        // Conceptual: popup_core.js
        // import { scrapeProfile } from '../content_scripts/linkedin_scraper.js'; // If direct import was possible, illustrates module use
        // For extensions, actual call is via chrome.scripting.executeScript

        const ViewManager = {
          load: async (viewName) => { /* fetch and inject HTML */ },
          populateScore: (data) => { /* update score_screen.html */ }
        };
        // ...
        // document.getElementById('analyzeButton').addEventListener('click', async () => {
        //   ViewManager.load('loading');
        //   // ... call scraper and n8n
        // });
        ```

*   **Pattern 2: Observer Pattern (via Chrome Extension Event Listeners)**
    *   **Description:** An object (subject) maintains a list of dependents (observers) and notifies them of state changes. Chrome's event system is a natural fit.
    *   **Project Application:**
        *   `background.js` listens to `chrome.tabs.onUpdated` and `chrome.tabs.onActivated` to observe browser navigation.
        *   `popup_core.js` listens to DOM events (e.g., button clicks in `ui/` views).
        *   Communication between `linkedin_scraper.js` and `popup_core.js` will use `chrome.runtime.sendMessage` (scraper sends, popup listens) or the callback of `chrome.scripting.executeScript`.
    *   **Example Snippet/Context (Conceptual):**
        ```javascript
        // background.js
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          if (changeInfo.status === 'complete' && tab.url && tab.url.includes('linkedin.com/in/')) {
            // Potentially trigger chrome.action.openPopup() based on settings
          }
        });

        // popup_core.js
        // (Inside a function that runs after a view is loaded)
        // document.getElementById('saveSettingsButton').addEventListener('click', handleSaveSettings);
        ```

*   **Pattern 3: Strategy Pattern (Conceptual for View Loading & State Handling in `popup_core.js`)**
    *   **Description:** Defines a family of algorithms (strategies), encapsulates each one, and makes them interchangeable.
    *   **Project Application:** The way `popup_core.js` handles different states (e.g., `STATE_INITIAL_SETUP`, `STATE_SHOWING_SCORE`, `STATE_LOADING`, `STATE_ERROR`) and loads corresponding views (`ui/main.html`, `ui/score_screen.html`, etc.) can be seen as applying different strategies based on the application's current state or user action. Each state might have a dedicated function to set up the UI and event listeners.
    *   **Example Snippet/Context (Conceptual):**
        ```javascript
        // popup_core.js
        let currentState = 'INITIAL';

        async function switchView(viewName, data) {
          const htmlContent = await fetchHTMLView(viewName); // hypothetical
          document.getElementById('view-container').innerHTML = htmlContent;
          
          if (viewName === 'score_screen') {
            setupScoreScreen(data); // Strategy for score screen
          } else if (viewName === 'main') {
            setupMainScreen();    // Strategy for main screen
          }
          // ... other views
        }
        ```

## 4. Component Interaction & Communication

*   **A. Primary Communication Style:**
    *   **Within Popup (`popup_core.js` & loaded `ui/` views):** Direct DOM event handling and DOM manipulation.
    *   **Popup to Content Script (`popup_core.js` to `linkedin_scraper.js`):** `chrome.scripting.executeScript`. Scraped data returned via the `executeScript` callback or `chrome.runtime.sendMessage`.
    *   **Background to Popup (`background.js` to `popup_core.js`):** Primarily by `background.js` triggering `chrome.action.openPopup()`. State or messages can be passed via `chrome.storage` if needed before popup opens, or `chrome.runtime.sendMessage` if popup is already open.
    *   **Popup to N8N:** Asynchronous `fetch` API calls (HTTPS POST requests).
*   **B. Data Flow Diagram (Conceptual for Target Profile Analysis):**
    1.  **User Action:** Navigates to LinkedIn Profile URL.
    2.  **`background.js`:** Detects URL (if auto-popup enabled) -> `chrome.action.openPopup()`.
    3.  **`popup_shell.html` / `popup_core.js`:** Loads. Determines it's a target profile context.
    4.  **`popup_core.js`:** Loads `ui/loading.html`.
    5.  **`popup_core.js`:** `chrome.scripting.executeScript({ files: ['linkedin_scraper.js'] })`.
    6.  **`linkedin_scraper.js`:** Scrapes DOM -> Returns data to `popup_core.js` (via callback/message).
    7.  **`popup_core.js`:** Retrieves `userLinkedInProfileData` & `n8nWebhookUrl` from `chrome.storage.local`.
    8.  **`popup_core.js`:** `fetch(n8nWebhookUrl, { method: 'POST', body: JSON.stringify({ targetData, userData }) })`.
    9.  **N8N Service (External):** Processes data, calls LLM, returns `{ score, reasons_bullets }`.
    10. **`popup_core.js`:** Receives n8n response.
    11. **`popup_core.js`:** Loads `ui/score_screen.html` and populates it with score and reasons.
    12. **User Interaction with `ui/score_screen.html`:** (e.g., click "Settings") -> `popup_core.js` loads `settings.html`.
*   **C. API Design Principles (for N8N Webhook Interaction):**
    *   **Request:** `POST` request with a clear JSON body: `{ "targetProfileData": {...}, "userProfileData": {...} }`.
    *   **Response:** Expected JSON response: `{ "score": number, "reasons_summary": string (optional), "reasons_bullets": string[] }`.
    *   **Error Handling:** Extension will handle standard HTTP errors from `fetch`. N8N workflow should ideally return meaningful JSON error responses if internal processing fails, which the extension can then display on `ui/error.html`.

## 5. Directory Structure & Code Organization Rules

*   **A. Approved Directory Structure:**
    ```
    ./extension/
    ├── _locales/
    │   └── en/
    │       └── messages.json
    ├── background/
    │   └── background.js
    ├── icons/
    │   ├── icon16.png
    │   ├── icon48.png
    │   └── icon128.png
    ├── manifest.json
    ├── content_scripts/
    │   └── linkedin_scraper.js
    ├── settings/  # Previously options/
    │   ├── settings.css
    │   ├── settings.html
    │   └── settings.js
    ├── popup/
    │   ├── popup_shell.html
    │   ├── popup_core.js
    │   └── popup.css
    └── ui/
        ├── error.html
        ├── loading.html
        ├── main.html
        ├── profile.html
        └── score_screen.html
    ```
*   **B. Module/Component Guidelines:**
    *   `popup_core.js`: Will contain the primary logic for view loading, event handling for UI elements, state management related to the current view and data, and calls to n8n. Aim to keep functions focused on single responsibilities.
    *   `background.js`: Solely for background tasks like detecting URL changes and triggering the popup.
    *   `settings.js`: Logic specific to the settings page interactions and storage.
    *   `linkedin_scraper.js`: Pure DOM scraping logic for LinkedIn pages. No business logic.
    *   Helper functions that might be shared (though unlikely for V2 MVP to be complex enough) could be in a `common/utils.js` if needed later, but avoid premature abstraction.
*   **C. Naming Conventions:**
    *   JavaScript: `camelCase` for variables and functions. `PascalCase` for classes (if any are introduced, though not planned for V2 MVP).
    *   Files: `kebab-case.js` or `snake_case.js` (current seems to be `snake_case` or `camelCase` like `linkedin_scraper.js`, `popup_core.js`). Consistency is key; `popup_core.js` suggests `camelCase` or `snake_case` for filenames. Let's standardize on **`snake_case.js`** for new JS files for readability (e.g., `popup_core.js` is fine, `background_script.js` if it were more descriptive). HTML/CSS files are `kebab-case`.
    *   CSS: Use Tailwind utility classes primarily. If custom classes are needed in `popup.css` or `settings.css`, use `kebab-case` and try to scope them or make them specific to avoid clashes.
*   **D. Styling Approach:**
    *   Primarily use Tailwind CSS utility classes directly in the `ui/*.html`, `settings.html`, and `popup_shell.html` files.
    *   Custom CSS in `popup.css` or `settings.css` should be minimal, used only for styles not easily achievable with Tailwind or for very specific component overrides.

## 6. State Management (Popup UI Focus)

*   **A. Chosen Approach:** Vanilla JavaScript object(s) and event-driven updates within `popup_core.js`.
*   **B. Rationale:** For the V2 MVP scope, a full-fledged state management library (like Redux, Zustand) is overkill and adds complexity. The state is relatively simple (current view, temporary data for display, loading/error flags) and can be managed effectively with plain JavaScript objects and functions that update the DOM accordingly when state changes.
*   **C. Key State Variables/Objects (Conceptual in `popup_core.js`):**
    *   `let currentView = 'loading';`
    *   `let userProfile = null;`
    *   `let targetProfileScrapedData = null;`
    *   `let n8nScoreData = null;`
    *   `let isLoading = false;`
    *   `let currentError = null;`
    *   `let appSettings = { n8nUrl: '', userLinkedInUrl: '', autoOpen: true };` (loaded from `chrome.storage.local`)

## 7. Error Handling & Logging Strategy

*   **A. Error Handling Approach:**
    *   Use `try/catch` blocks in `popup_core.js`, `settings.js`, and `background.js` for operations like `fetch` calls, `chrome.storage` access, and `chrome.scripting.executeScript`.
    *   When an error occurs that affects the user flow, `popup_core.js` will load `ui/error.html` and populate a designated element within it with a user-friendly message. Specific details (like HTTP status from n8n, if safe) can be included.
    *   The "Try Again" button in `ui/error.html` will trigger a function in `popup_core.js` to re-attempt the last failed major operation (e.g., re-scrape, re-call n8n). This requires `popup_core.js` to remember the context of the last action.
*   **B. Logging:**
    *   `console.log()`: For general development-time debugging and tracing flow.
    *   `console.warn()`: For non-critical issues or unexpected situations that don't halt execution.
    *   `console.error()`: For caught exceptions and significant errors.
    *   No persistent client-side logging to external services for V2 MVP to maintain user privacy and simplicity.

## 8. Testing Strategy

*   **A. Types of Tests:** Focus on Unit Tests and manual Integration/E2E testing for V2 MVP.
*   **B. Frameworks/Tools:**
    *   Consider a simple assertion library or vanilla JS for basic unit tests if Jest/Mocha setup is deemed too heavy for initial V2. However, **Jest** is recommended if time permits setting it up for more robust testing, especially of `popup_core.js` logic.
*   **C. Testing Focus for MVP:**
    *   **Unit Tests:**
        *   Logic within `popup_core.js` (e.g., functions that determine which view to load based on state, data formatting for n8n).
        *   Functions in `settings.js` for saving/loading settings from `chrome.storage.local`.
        *   URL matching logic in `background.js`.
    *   **Manual Integration/E2E Tests:**
        *   Full user flows: initial setup, changing settings, auto-popup and scoring a target profile, error states.
        *   Scraping `linkedin_scraper.js` against current LinkedIn profile structures (using developer tools to inject and run).
*   **D. Code Coverage:** Aspirational for V2 MVP. Focus on testing critical paths and complex logic first.

## 9. Build & Deployment (Brief for Chrome Extension)

*   **A. Build Process:** Manual zipping of the `extension/` directory. No automated build steps (transpilation, minification, etc.) are planned for V2 MVP to keep it simple. Ensure all necessary files defined in `manifest.json` are correctly placed.
*   **B. Deployment:** Manual upload of the zipped package to the Chrome Web Store.

## 10. Security Considerations

*   **A. Data Storage:**
    *   User's LinkedIn profile data, n8n URL, and settings are stored in `chrome.storage.local`. This is client-side and sandboxed to the extension, but accessible via dev tools by the user. No highly sensitive information beyond what's on a public LinkedIn profile and the user's n8n URL is stored.
    *   Inform users about what is stored (e.g., in a small note on the settings page or a first-run notice if deemed necessary later).
*   **B. API Interactions (N8N):**
    *   The extension will enforce or strongly recommend HTTPS for the n8n webhook URL entered by the user in `settings.js`.
    *   The user is responsible for the security of their n8n endpoint. The extension itself will not add an authentication layer to this user-defined URL.
    *   Basic validation of the n8n URL format in `settings.js` to prevent trivial input errors.
*   **C. Content Script Interactions (`linkedin_scraper.js`):**
    *   The scraper has access to the DOM of LinkedIn pages. It should only extract the defined data points and avoid collecting or transmitting any unrelated or sensitive information from the page.
    *   Data sent from the content script to `popup_core.js` should be treated as potentially untrusted until validated or used in expected ways.
*   **D. Permissions (`manifest.json`):**
    *   Request only the minimum necessary permissions: `storage`, `scripting`, `activeTab`, `tabs`.
    *   `host_permissions`: Will include `*://*.linkedin.com/*` for scraping. For the n8n webhook, as it's user-defined, the manifest will need a broad permission like `*://*/*` if we cannot dynamically request permissions for the specific user-entered domain (which is complex). This is a security trade-off for user-defined webhooks. *Revisit if a more restrictive approach for n8n host permissions is feasible without excessive complexity.* For V2, proceed with the broad permission but ensure `fetch` calls in `popup_core.js` *only* target the user-specified URL.
*   **E. Input Sanitization:** While not a heavy focus for internal display from trusted sources like LinkedIn (assuming LinkedIn itself handles XSS on its own data), be mindful if any user-input data (like n8n URL) is ever directly rendered in HTML in a way that could be an XSS vector (though unlikely for a URL input). 