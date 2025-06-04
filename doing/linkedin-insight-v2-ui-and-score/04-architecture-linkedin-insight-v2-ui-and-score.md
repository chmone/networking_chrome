---

## 1. Current File Structure

```
.
├── .aisdlc
├── .aisdlc.lock
├── .git/
├── .venv/
├── ai-sdlc-repo/
├── doing/
│   └── linkedin-insight-v2-ui-and-score/
│       ├── 01-idea-linkedin-insight-v2-ui-and-score.md
│       ├── 02-prd-linkedin-insight-v2-ui-and-score.md
│       └── 03-prd-plus-linkedin-insight-v2-ui-and-score.md
├── done/
│   └── linkedin-shrome-extension-support/
│       ├── ... (archived V1 ai-sdlc docs)
├── extension/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── manifest.json
│   └── src/
│       ├── content_scripts/
│       │   └── linkedin_scraper.js
│       ├── options/
│       │   ├── options.css
│       │   ├── options.html
│       │   └── options.js
│       └── popup/
│           ├── popup.css
│           ├── popup.html
│           └── popup.js
├── prompts/
│   ├── 01-idea-prompt.md
│   ├── 02-prd-prompt.md
│   ├── 03-prd-plus-prompt.md
│   └── 04-architecture-prompt.md
│   └── ... (other ai-sdlc prompts)
├── temp_files/ # (Assuming this is for temporary items, may not be part of core)
└── ui/
    ├── error.html
    ├── main.html
    ├── profile.html
    ├── score_screen.html
    └── successful_scrape.html
```

*(Note: `.venv`, `ai-sdlc-repo`, `temp_files` and `.git` are part of the development environment but not the core extension's deployable structure. The `doing`, `done`, and `prompts` directories are for the `ai-sdlc` process.)*

## 2. Proposed File Structure

The proposed structure aims to organize the V2 features clearly, especially the new `background.js` and the UI views.

```
.
├── .aisdlc
├── .aisdlc.lock
├── .git/
├── .venv/
├── ai-sdlc-repo/
├── doing/
│   └── linkedin-insight-v2-ui-and-score/
│       ├── ... (V2 ai-sdlc docs)
├── done/
├── extension/
│   ├── _locales/ # For future internationalization (good practice)
│   │   └── en/
│   │       └── messages.json
│   ├── background/
│   │   └── background.js      # Handles LinkedIn URL detection & auto-popup
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── manifest.json
│   ├── content_scripts/
│   │   └── linkedin_scraper.js # Existing scraper
│   ├── options/                # For V2, this will be renamed/refactored to settings
│   │   ├── settings.css
│   │   ├── settings.html
│   │   └── settings.js
│   ├── popup/
│   │   ├── popup_shell.html    # Minimal shell for injecting views
│   │   ├── popup_core.js       # Main logic: view loading, state, n8n calls, etc.
│   │   └── popup.css           # Global styles for popup (if any beyond Tailwind in views)
│   └── ui/                     # HTML views for the popup
│       ├── error.html
│       ├── loading.html        # New loading screen
│       ├── main.html
│       ├── profile.html
│       └── score_screen.html
│       # successful_scrape.html likely removed or repurposed
├── prompts/
│   └── ... (ai-sdlc prompts)
├── README.md                   # Project README
└── .gitignore
```

## 3. Architectural Explanation

The current file structure has served V1 well. For V2, with the introduction of a background script, multiple UI views, and more complex logic in `popup.js`, a slightly more organized `extension` directory is beneficial.

**Key changes and benefits of the proposed structure:**

1.  **Dedicated `background/` directory:** `background.js` is a distinct component and deserves its own directory for clarity, separating it from popup or content script logic.
2.  **Refined `popup/` directory:**
    *   `popup.html` is renamed to `popup_shell.html` to emphasize its role as a minimal container.
    *   `popup.js` is renamed to `popup_core.js` to reflect its central role as the controller/view-manager.
    *   `popup.css` can house any truly global styles for the popup shell if needed, though the primary styling comes from Tailwind CSS within the `ui/` HTML files.
3.  **Renamed `options/` to `settings/`:** To match the terminology used in the V2 UI (`ui/settings.html` as per PRD). The files within will be `settings.html`, `settings.js`, and `settings.css`. This is more intuitive for V2's functionality.
4.  **`ui/` directory remains:** This is a good separation for the HTML views that `popup_core.js` will load. `loading.html` is added as per V2 requirements. `successful_scrape.html` is noted as likely removed/repurposed based on the V2 flow.
5.  **`_locales/` directory:** Added as a placeholder for future internationalization (i18n). While not an immediate V2 requirement, it's good architectural foresight for Chrome extensions.
6.  **Top-level `README.md` and `.gitignore`:** Standard for projects.

This structure maintains simplicity while providing better modularity for the new V2 components. It directly supports the PRD by:
*   Providing clear homes for `background.js`, the new UI view files (`ui/`), and the refactored popup/settings logic.
*   Aligning naming conventions (e.g., `settings/` instead of `options/`).
*   Keeping the core scraping logic (`content_scripts/linkedin_scraper.js`) intact but clearly separated.

This approach is robust enough for V2 features and can be implemented efficiently as it's an evolution of the existing structure rather than a complete overhaul.

## 4. System Patterns

### A. System Architecture

**Modular Monolith (within the Chrome Extension context)**

*   **Description:** The Chrome extension itself is a monolith (a single deployable unit). However, internally, we are striving for a modular design. Each key part of the extension (background script, popup UI/logic, content script, settings page) acts as a distinct module with clear responsibilities.
*   **Justification:**
    *   **Simplicity & Rapid Implementation:** For a browser extension of this scale, a full microservices or overly complex architecture would be over-engineering. A modular monolith is well-suited.
    *   **Chrome Extension Nature:** Extensions are inherently packaged as a single unit.
    *   **Clear Separation of Concerns:** The proposed file structure promotes this modularity (e.g., `background.js` for background tasks, `popup_core.js` for UI management, `linkedin_scraper.js` for scraping).

### B. Key Technical Decisions

*   **Core Programming Languages:**
    *   **JavaScript (ES6+):** For all extension logic (`background.js`, `popup_core.js`, `settings.js`, `linkedin_scraper.js`). It's the native language for Chrome extensions and web technologies.
    *   **HTML5 & CSS3:** For structuring UI views (`ui/*.html`, `popup_shell.html`, `settings.html`) and styling (Tailwind CSS utility classes embedded in HTML, and potentially `popup.css`/`settings.css` for specific overrides).
*   **Frameworks/Key Libraries:**
    *   **Tailwind CSS:** Already adopted for the `ui/*.html` files. Continue its use for rapid UI development with utility classes.
    *   **No other major JavaScript frameworks (e.g., React, Vue, Angular) for the popup UI in V2 MVP:**
        *   **Rationale:** To maintain simplicity and speed of implementation as highlighted in the PRD-Plus concerns about `popup.js` complexity. Dynamically loading HTML snippets (from `ui/` files) and managing them with vanilla JavaScript in `popup_core.js` is sufficient for the described V2 views. Introducing a framework would add a learning curve, build process complexity, and increase package size unnecessarily for the current scope. This addresses the PRD-Plus point about `popup.js` complexity by *not* adding a framework on top of it for now.
*   **Key Browser APIs:**
    *   `chrome.storage.local`: For storing user data, settings, n8n URL.
    *   `chrome.scripting.executeScript`: To inject `linkedin_scraper.js`.
    *   `chrome.tabs.onUpdated`, `chrome.tabs.onActivated`, `chrome.action.openPopup()`: For `background.js` functionality.
    *   `fetch` API: For making `POST` requests to the n8n webhook.
*   **Database:** None directly within the extension beyond `chrome.storage.local`. The "database" of profiles is effectively LinkedIn itself, and user/target data is transient or stored locally by the browser.

### C. Design Patterns in Use

1.  **Module Pattern (JavaScript ES6 Modules):**
    *   **Description:** Encapsulates related functions and data into reusable modules. ES6 modules provide `import`/`export` syntax for this.
    *   **Application & Benefit:**
        *   `linkedin_scraper.js` can be structured as a module exporting its scraping functions.
        *   `popup_core.js` will internally be organized into modules/functions for view loading, event handling, API calls, and state management.
        *   `background.js` and `settings.js` will also be self-contained modules.
        *   **Benefit:** Improves code organization, reusability, maintainability, and helps manage namespaces, reducing global scope pollution.

2.  **Observer Pattern (via Chrome Extension Event Listeners):**
    *   **Description:** A pattern where an object (subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes. Chrome's event system (`chrome.tabs.onUpdated`, `chrome.runtime.onMessage`, DOM event listeners) is a prime example.
    *   **Application & Benefit:**
        *   `background.js` observes `chrome.tabs.onUpdated` and `chrome.tabs.onActivated` to detect LinkedIn profile navigation.
        *   `popup_core.js` observes DOM events (clicks on buttons in `ui/` views) to trigger actions.
        *   `popup_core.js` listens for messages from `linkedin_scraper.js` (if any direct messaging is kept, though V1 primarily used storage).
        *   **Benefit:** Decouples components. `background.js` doesn't need to know the internals of `popup_core.js` to trigger the popup; it just reacts to tab events. UI views react to user events.

3.  **Strategy Pattern (Conceptual for View Loading):**
    *   **Description:** Defines a family of algorithms, encapsulates each one, and makes them interchangeable.
    *   **Application & Benefit (Conceptual):**
        *   In `popup_core.js`, the logic for loading and displaying each specific view (`main.html`, `score_screen.html`, etc.) can be thought of as separate strategies. A central function `loadView(viewName)` could fetch and inject the HTML, then call a view-specific setup function.
        *   **Benefit:** Makes `popup_core.js` cleaner by delegating view-specific logic. Adding new views or modifying existing ones becomes more manageable as each view's setup logic is encapsulated. This helps manage the complexity of `popup_core.js` by breaking it down.

### D. Component Relationships

*   **`manifest.json`:** Defines the extension, permissions, and entry points for `background.js`, popup (`popup_shell.html`), content scripts (`linkedin_scraper.js`), and options/settings (`settings.html`).
*   **`background.js`:**
    *   Listens to `chrome.tabs` events.
    *   Interacts with `chrome.action.openPopup()`.
    *   Reads `settings_autoOpenPopup` from `chrome.storage.local`.
*   **`popup_shell.html`:** Minimal container for views. Includes `<script src="popup_core.js"></script>`.
*   **`popup_core.js` (Main Controller):**
    *   Loads HTML content from `ui/*.html` files into `popup_shell.html`.
    *   Attaches event listeners to elements within the loaded UI views.
    *   Manages application state (e.g., current view, loaded data).
    *   Calls `chrome.scripting.executeScript({ target: { tabId }, files: ['content_scripts/linkedin_scraper.js'] })` to run the scraper.
    *   Receives scraped data (likely via a message or by scraper writing to a temporary agreed-upon storage/variable that `popup_core.js` then reads).
    *   Retrieves `userLinkedInProfileData` and `n8nWebhookUrl` from `chrome.storage.local`.
    *   Makes `fetch` calls to the n8n webhook.
    *   Updates UI views with data (profile info, scores, errors).
    *   Navigates between views.
*   **`ui/*.html` files:** HTML snippets for different views. Contain Tailwind CSS. Interact with `popup_core.js` via DOM events.
*   **`content_scripts/linkedin_scraper.js`:**
    *   Executed in the context of the LinkedIn page.
    *   Scrapes DOM elements.
    *   Sends scraped data back to `popup_core.js` (e.g., via `chrome.runtime.sendMessage` or by returning a promise from `executeScript` if its function returns data directly).
*   **`settings.js`:**
    *   Handles logic for `settings.html`.
    *   Reads/writes `n8nWebhookUrl`, user's LinkedIn profile URL, and `settings_autoOpenPopup` to `chrome.storage.local`.
    *   Triggers re-scrape of user's profile if URL changes.

**Simplified Flow (Target Profile Analysis):**
1.  User navigates to LinkedIn profile.
2.  `background.js` (if auto-popup enabled) -> `chrome.action.openPopup()`.
3.  `popup_shell.html` loads `popup_core.js`.
4.  `popup_core.js` determines context (target profile) -> loads `ui/loading.html`.
5.  `popup_core.js` -> `chrome.scripting.executeScript(linkedin_scraper.js)`.
6.  `linkedin_scraper.js` scrapes page -> sends data to `popup_core.js`.
7.  `popup_core.js` retrieves `userLinkedInProfileData` & `n8nWebhookUrl` from `chrome.storage.local`.
8.  `popup_core.js` -> `fetch(n8nWebhookUrl, { targetData, userData })`.
9.  `popup_core.js` receives n8n response -> loads `ui/score_screen.html` -> populates with score & reasons.
10. User interacts with `ui/score_screen.html` (e.g., clicks "Settings") -> `popup_core.js` loads `settings.html`.

### E. Critical Implementation Paths

1.  **Popup View Management Core (`popup_core.js`):**
    *   Implement function to load HTML from `ui/` files into `popup_shell.html`.
    *   Basic state management for current view.
    *   Implement navigation between a couple of basic views (e.g., `main.html` to `profile.html`).
2.  **Initial User Setup Flow (US-001):**
    *   Implement logic in `popup_core.js` to check for `userLinkedInProfileData`.
    *   Display `ui/main.html`.
    *   Handle "Get Started": navigate tab, trigger scrape of user's own profile, save to storage, show `ui/profile.html`.
3.  **Settings Page (`settings.html`, `settings.js`):**
    *   Implement saving/loading of n8n URL, user profile URL, and auto-open toggle to `chrome.storage.local`.
4.  **Background Script (`background.js`):**
    *   Implement LinkedIn profile URL detection.
    *   Implement `chrome.action.openPopup()` trigger based on settings.
5.  **Core Scoring Flow (US-005, US-006, US-007):**
    *   `popup_core.js` logic for when popup opens on a target profile.
    *   Integrate `linkedin_scraper.js` call for target profile.
    *   Implement `fetch` call to n8n with target and user data.
    *   Display `ui/score_screen.html` with data from n8n.
    *   Implement `ui/loading.html` and `ui/error.html` display during this flow.
6.  **Displaying Full Profile Data:**
    *   Enhance `ui/profile.html` to render all scraped sections of the user's profile.
    *   Implement "Scraped Information" toggle in `ui/score_screen.html` to show target's full data.
7.  **Testing:** Unit/integration tests for key logic in `popup_core.js`, `settings.js`, and `background.js`. Test scraping against sample HTML.

--- 