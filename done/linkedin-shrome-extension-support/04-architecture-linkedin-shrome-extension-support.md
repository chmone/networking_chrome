# Architecture Document: LinkedIn Insight Chrome Extension

## 1. Current File Structure

(Assuming a relatively clean slate after `aisdlc init` and subsequent file creation, the current structure for the core logic is minimal. The `ai-sdlc-repo` is for the `aisdlc` tool itself, not the extension.)

```
.
├── .aisdlc
├── .aisdlc.lock
├── .git/
├── ai-sdlc-repo/
│   └── ... (cloned ai-sdlc tool)
├── doing/
│   └── linkedin-shrome-extension-support/
│       ├── 01-idea-linkedin-shrome-extension-support.md
│       ├── 02-prd-linkedin-shrome-extension-support.md
│       └── 03-prd-plus-linkedin-shrome-extension-support.md
├── prompts/
│   └── ... (default ai-sdlc prompts)
└── test_prompt.md
```

## 2. Proposed File Structure

```
.
├── .aisdlc
├── .aisdlc.lock
├── .git/
├── ai-sdlc-repo/
│   └── ...
├── doing/
│   └── linkedin-shrome-extension-support/
│       ├── 01-idea-linkedin-shrome-extension-support.md
│       ├── 02-prd-linkedin-shrome-extension-support.md
│       ├── 03-prd-plus-linkedin-shrome-extension-support.md
│       └── 04-architecture-linkedin-shrome-extension-support.md
├── prompts/
│   └── ...
├── extension/
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── src/
│   │   ├── content_scripts/
│   │   │   └── linkedin_scraper.js
│   │   ├── popup/
│   │   │   ├── popup.html
│   │   │   ├── popup.js
│   │   │   └── popup.css
│   │   └── background/
│   │       └── background.js (optional, if needed for future state/event management)
│   ├── options/ (optional, for user-inputted LinkedIn URL)
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   └── lib/ (optional, for any shared utility functions if src/ gets complex)
├── README.md
└── test_prompt.md
```

## 3. Architectural Explanation

The current file structure is primarily for the `ai-sdlc` process itself. The proposed structure introduces a dedicated `extension/` directory. This clearly separates the Chrome extension's codebase from the project management files.

**Rationale for Proposed Structure:**

*   **Clarity and Organization:** Standard Chrome extension structure (`manifest.json` at the root of `extension/`, dedicated folders for `icons`, `content_scripts`, `popup`, `background` (if needed), and `options` (if needed)). This is familiar to extension developers and easy to navigate.
*   **Simplicity for MVP:** The PRD and PRD-Plus have emphasized a lean MVP. This structure supports that by not over-complicating. We can add `background.js` or `options/` if explicitly required by US-001's simplified version, but they can be omitted if not immediately necessary.
*   **Scalability:** While simple, this structure can easily accommodate future growth. More complex logic can be broken into more files within `src/` or `lib/`.
*   **Rapid Implementation:** Follows conventions, reducing setup time. Developers can immediately start on `manifest.json`, then `linkedin_scraper.js` and the `popup/` components, which are the MVP's core.
*   **Alignment with PRD:**
    *   `content_scripts/linkedin_scraper.js`: Directly supports US-002 (LinkedIn Profile Scraping).
    *   `popup/`: Directly supports US-003 (Basic Information Display) and US-004 (Extension Icon & Basic UI via manifest and popup).
    *   `options/`: Caters to the simplified US-001 (User Onboarding & Configuration) if allowing users to input their LinkedIn URL is pursued for MVP.
    *   `icons/`: For US-004.

This structure avoids over-engineering, focuses on the essential components for a functioning MVP as defined in the *updated* PRD, and allows for quick iteration.

## 4. System Patterns

### A. System Architecture

**Modular Client-Side Application (Chrome Extension Architecture)**

The extension is a client-side application running within the user's browser. Its architecture is inherently modular due to the nature of Chrome extensions:

*   **Content Scripts:** Isolated JavaScript environments that run in the context of web pages (LinkedIn profiles).
*   **Popup UI:** A separate HTML/CSS/JS environment for user interaction.
*   **Background Script (Optional for MVP):** For managing long-term state or events, if needed later.
*   **Options Page (Optional for MVP):** For user configuration.

This is not a monolithic backend system but rather a collection of components interacting through Chrome's extension APIs. This is the standard and most straightforward architecture for Chrome extensions.

### B. Key Technical Decisions

*   **Core Languages/Frameworks:**
    *   **HTML, CSS, JavaScript (ES6+):** Standard for Chrome extension development. No complex frameworks (like React/Vue) are proposed for the MVP's popup to maintain simplicity and speed, unless popup complexity grows significantly. Vanilla JS is sufficient.
    *   **Rationale:** Lowest barrier to entry, direct access to Chrome APIs, fast to implement for the defined MVP scope.
*   **Database Choices:**
    *   **`chrome.storage.local`:** For any user-provided configuration (like their own optional LinkedIn URL as per simplified US-001).
    *   **Rationale:** Built-in, asynchronous, and designed for extension storage. Sufficient for the MVP's minimal storage needs.
*   **Key Libraries or Tools:**
    *   None explicitly mandated for MVP core logic beyond what the browser provides.
    *   **Rationale:** Keep dependencies minimal for MVP to ensure rapid development and reduce potential points of failure or maintenance overhead. If DOM parsing becomes very complex, a lightweight utility might be considered, but start without.
*   **`manifest.json`:**
    *   The heart of the extension, defining permissions, scripts, UI components.
    *   **Rationale:** Essential for any Chrome extension.

### C. Design Patterns in Use

1.  **Module Pattern (JavaScript - ES6 Modules)**
    *   **Description:** Encapsulates related code into separate files/modules, managing scope and dependencies. ES6 modules (`import`/`export`) provide a standard way to do this.
    *   **Application & Benefit:**
        *   `linkedin_scraper.js` will be a module responsible for DOM interaction and data extraction on LinkedIn pages.
        *   `popup.js` will be a module handling the logic for the popup UI.
        *   (If used) `options.js` and `background.js` would also be modules.
        *   **Benefit:** Improves code organization, maintainability, and reusability. Prevents global namespace pollution. Makes it easier for multiple developers (if applicable) to work on different parts.

2.  **Observer Pattern (Implicit via `chrome.runtime.onMessage` / `chrome.tabs.sendMessage`)**
    *   **Description:** A pattern where an object (subject) maintains a list of its dependents (observers) and notifies them automatically of any state changes. In Chrome extensions, this is often used for communication between different parts of the extension (e.g., content script to popup or background script).
    *   **Application & Benefit:**
        *   When `linkedin_scraper.js` (content script) finishes scraping data, it will send a message (acting as a subject's notification).
        *   `popup.js` (or `background.js` if an intermediary is needed later) will listen for these messages (acting as an observer) to update the UI or process the data.
        *   **Benefit:** Decouples the content script (data producer) from the popup (data consumer), allowing them to operate and evolve independently. This is the standard way to communicate between extension components.

3.  **Facade Pattern (Potentially for `linkedin_scraper.js`)**
    *   **Description:** Provides a simplified interface to a larger, more complex body of code.
    *   **Application & Benefit:**
        *   The `linkedin_scraper.js` could expose a simple API (e.g., `scrapeCurrentProfile()`) to its consumers (e.g., when triggered by the popup via a message). Internally, this function would handle the complexities of DOM traversal, data extraction, and error handling for various profile sections.
        *   **Benefit:** Hides the complexity of scraping logic from other parts of the extension. If LinkedIn's structure changes, modifications are ideally localized within this "scraping facade" without affecting how other components request scraping.

### D. Component Relationships

1.  **User Interaction (Toolbar Icon Click) -> `popup.html` / `popup.js`**
    *   User clicks the extension icon.
    *   `popup.html` is displayed, `popup.js` executes.
2.  **`popup.js` -> `content_scripts/linkedin_scraper.js` (via `chrome.tabs.sendMessage`)**
    *   If the user initiates scraping from the popup, `popup.js` sends a message to the content script active on the current LinkedIn tab, requesting a scrape.
3.  **`content_scripts/linkedin_scraper.js` (DOM Interaction)**
    *   Receives the message, accesses and parses the DOM of the LinkedIn profile page.
4.  **`content_scripts/linkedin_scraper.js` -> `popup.js` (via `chrome.runtime.sendMessage`)**
    *   After scraping, `linkedin_scraper.js` sends a message containing the scraped data (or an error) back.
5.  **`popup.js` (Update UI)**
    *   Receives the data/error from the content script.
    *   Updates `popup.html` to display the information or error message.
6.  **(Optional) `options.js` <-> `chrome.storage.local`**
    *   If user provides their LinkedIn URL via `options.html`, `options.js` saves it to `chrome.storage.local`.
    *   `linkedin_scraper.js` or `popup.js` could potentially read this from storage if needed for context in the future (though less relevant for current MVP definition).

**Simplified Flow for MVP:**

`Toolbar Click` -> `Popup` -> `Message to Content Script` -> `Content Script Scrapes` -> `Message to Popup` -> `Popup Displays Data`

### E. Critical Implementation Paths

1.  **Manifest & Basic Extension Setup:**
    *   Create `extension/manifest.json` with core permissions (`activeTab`, `storage`, host permissions for `linkedin.com`), icons, and definitions for browser action (popup).
    *   Create basic `popup.html` and `popup.js`.
    *   Load the extension in Chrome for testing.
2.  **Content Script - Core Scraping Logic (US-002):**
    *   Develop `content_scripts/linkedin_scraper.js`.
    *   Implement function to extract name, headline, and summary from a LinkedIn profile page's DOM.
    *   Initial focus on common profile layouts.
3.  **Communication - Popup to Content Script & Back:**
    *   Implement message passing from `popup.js` to trigger scraping in `linkedin_scraper.js`.
    *   Implement message passing from `linkedin_scraper.js` to send scraped data (or error) back to `popup.js`.
4.  **Popup UI - Display Scraped Data (US-003):**
    *   Enhance `popup.html` and `popup.js` to receive and display the key scraped data points.
    *   Implement basic error display in the popup.
5.  **(Optional MVP) User Configuration (Simplified US-001):**
    *   If providing a user's own LinkedIn URL is included in MVP:
        *   Create `options.html` and `options.js`.
        *   Implement logic to save/load URL from `chrome.storage.local`.
6.  **Testing & Refinement:**
    *   Test on various LinkedIn profiles.
    *   Refine selectors in `linkedin_scraper.js` for robustness.
    *   Test basic error handling.

--- 