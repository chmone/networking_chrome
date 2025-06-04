# Product Requirements Document: LinkedIn Insight V2 - UI Enhancements & Networking Score

## 1. Introduction

This document outlines the product requirements for **LinkedIn Insight V2**. The primary goal of V2 is to significantly enhance the user experience of the LinkedIn Insight Chrome extension by introducing a dynamic, multi-screen user interface and integrating an LLM-powered networking score. This score will provide users with a quick assessment of LinkedIn profiles in relation to their own, along with actionable insights.

This PRD details the project's objectives, target audience, features, user stories, technical considerations, and success metrics. It serves as a guide for the development team to ensure that the final product meets the specified requirements and user needs.

The foundation for this V2 development is based on the approved V2 Idea document: `01-idea-linkedin-insight-v2-ui-and-score.md`.

## 2. Goals and objectives

The primary goals for LinkedIn Insight V2 are:

*   **Enhance User Experience:** Transition from a single-view popup to a more intuitive, multi-screen interface that guides the user through different states and functionalities.
*   **Provide Actionable Insights:** Implement an LLM-driven networking score that compares a target LinkedIn profile with the user's own profile, offering a numerical score and qualitative reasons.
*   **Improve Configurability:** Allow users to easily manage their own profile data, n8n webhook URL, and extension behavior (e.g., automatic popup).
*   **Streamline Workflow:** Automate the analysis of LinkedIn profiles by having the extension popup activate when a user navigates to a relevant page.

## 3. Target audience

The target audience for LinkedIn Insight V2 includes:

*   **Sales Professionals & Business Developers:** To quickly assess leads and tailor outreach.
*   **Recruiters & Talent Acquisition Specialists:** To evaluate candidate profiles efficiently.
*   **Job Seekers:** To understand how their profile might compare to others in their field.
*   **General Networkers:** Anyone looking to expand their professional network strategically and gain quick insights into profiles they encounter.
*   **Existing Users of LinkedIn Insight V1:** Who are looking for improved usability and more advanced features.

## 4. Product features

### 4.1. Multi-Screen User Interface

The extension will feature a dynamic UI managed by `popup.js`, loading views from separate HTML files:

*   **`ui/main.html` (Initial Setup):**
    *   **Purpose:** Onboard new users or users without saved profile data.
    *   **Content:** Input field for user's LinkedIn profile URL, resume upload element (non-functional in V2 MVP), "Get Started" button.
    *   **Interaction:** On "Get Started", navigates to the user's URL, scrapes and saves their profile, then shows `ui/profile.html`.
*   **`ui/profile.html` (User's Own Profile View):**
    *   **Purpose:** Display the user's own scraped LinkedIn profile data.
    *   **Content:** All scraped sections (summary, experience, education, licenses/certifications).
    *   **Interaction:** Accessed after initial setup or via a "My Profile" link from `ui/score_screen.html`.
*   **`ui/score_screen.html` (Target Profile Analysis & Score):**
    *   **Purpose:** Display the networking score and analysis for a target LinkedIn profile.
    *   **Content:** Target's basic info (name, photo, headline), networking score (0-100) with visual representation, "Why this score?" bullet points from LLM, "Scraped Information" button to reveal full target profile details. Dropdown menu for "My Profile" and "Settings".
    *   **Interaction:** Primary view when a target profile is analyzed.
*   **`ui/loading.html` (Loading Indicator):**
    *   **Purpose:** Indicate background activity.
    *   **Content:** Simple loading animation/message.
    *   **Interaction:** Shown during scraping or n8n API calls.
*   **`ui/error.html` (Error Display):**
    *   **Purpose:** Inform user of errors.
    *   **Content:** User-friendly error message, "Try Again" button, potential error details.
    *   **Interaction:** Shown on any operational failure.
*   **`ui/settings.html` (Extension Configuration):**
    *   **Purpose:** Allow user to configure the extension.
    *   **Content:** Inputs for n8n webhook URL, user's LinkedIn profile URL. Toggle for "automatic popup" feature. Button to clear saved user profile data.
    *   **Interaction:** Accessed from `ui/score_screen.html`. Saving changes persists them.

### 4.2. LLM-Powered Networking Score

*   **Data Collection:** When analyzing a target profile, both target's scraped data and user's stored profile data are used.
*   **N8N Webhook Integration:** Data is `POST`ed to the user-configured n8n webhook.
*   **N8N Workflow (External):** User's n8n workflow processes data, queries an LLM, and generates a score + reasons.
*   **Expected Response:** JSON with `score` (number) and `reasons_bullets` (array of strings).
*   **Display:** Score and reasons shown on `ui/score_screen.html`.

### 4.3. Automatic Popup on LinkedIn Profiles

*   A background script (`background.js`) will detect navigation to LinkedIn profile URLs (`linkedin.com/in/...`).
*   If enabled in settings, the extension popup will automatically open, initiating the analysis flow.

### 4.4. Configuration Options

Users can configure:
*   Their own LinkedIn profile URL (triggers re-scrape on change).
*   N8N webhook URL for the scoring service.
*   Toggle for the automatic popup feature.
*   Ability to clear their stored LinkedIn profile data.

## 5. User stories and acceptance criteria

---
**Epic: User Onboarding & Initial Setup**
---

**US-001:** As a new user, I want to be prompted to enter my LinkedIn profile URL when I first open the extension so that my profile can be saved for analysis.
*   **AC-001.1:** If `userLinkedInProfileData` is not found in `chrome.storage.local`, the `ui/main.html` view is displayed in the popup.
*   **AC-001.2:** `ui/main.html` presents an input field for a LinkedIn profile URL and a "Get Started" button.
*   **AC-001.3:** Clicking "Get Started" without a URL or with an invalidly formatted URL shows an inline error message.
*   **AC-001.4:** Clicking "Get Started" with a valid LinkedIn URL instructs the browser to navigate the current active tab to this URL.
*   **AC-001.5:** After successful navigation, the extension attempts to scrape the user's profile from this page.
*   **AC-001.6:** Upon successful scraping, the data is saved to `chrome.storage.local` under the key `userLinkedInProfileData`.
*   **AC-001.7:** After saving, the popup view transitions to `ui/profile.html`, displaying the user's scraped data.
*   **AC-001.8:** If scraping fails, the `ui/error.html` view is displayed with a relevant error message.
*   **AC-001.9:** The resume upload element on `ui/main.html` is visually present but non-functional for V2 MVP (e.g., clicking it does nothing or shows a "coming soon" message).

---
**Epic: Managing User's Own Profile**
---

**US-002:** As a user, I want to be able to view my own saved LinkedIn profile information within the extension.
*   **AC-002.1:** `ui/profile.html` correctly displays all sections of the stored `userLinkedInProfileData` (summary, experience, education, licenses/certifications).
*   **AC-002.2:** `ui/profile.html` is accessible from `ui/score_screen.html` via a "My Profile" link/button in a dropdown menu.

**US-003:** As a user, I want to be able to update my LinkedIn profile URL in the settings and have the new profile scraped and saved.
*   **AC-003.1:** `ui/settings.html` provides an input field to view and edit the user's saved LinkedIn profile URL.
*   **AC-003.2:** Changing the URL and clicking "Save" (or an equivalent action) triggers a re-scrape of the new URL.
*   **AC-003.3:** The current tab is navigated to the new user profile URL for scraping.
*   **AC-003.4:** Upon successful re-scrape, `userLinkedInProfileData` in `chrome.storage.local` is updated.
*   **AC-003.5:** An appropriate success or error message is displayed.

**US-004:** As a user, I want to be able to clear my saved LinkedIn profile data from the extension.
*   **AC-004.1:** `ui/settings.html` provides a "Clear My Saved Profile" button.
*   **AC-004.2:** Clicking the button prompts for confirmation.
*   **AC-004.3:** Upon confirmation, `userLinkedInProfileData` is removed from `chrome.storage.local`.
*   **AC-004.4:** The user is then redirected to `ui/main.html` as if they were a new user.

---
**Epic: Target Profile Analysis & Scoring**
---

**US-005:** As a user with a saved profile, when I navigate to a target LinkedIn profile page, I want the extension popup to open automatically (if enabled) and initiate analysis.
*   **AC-005.1:** If `userLinkedInProfileData` exists and the "auto-open popup" setting is enabled in `ui/settings.html`.
*   **AC-005.2:** Navigating to a URL matching `https://www.linkedin.com/in/*` in the browser triggers `chrome.action.openPopup()`.
*   **AC-005.3:** The popup, upon opening in this context, transitions to the `ui/loading.html` view.

**US-006:** As a user, when a target profile is being analyzed, I want the extension to scrape its data and send it along with my profile to the n8n webhook for scoring.
*   **AC-006.1:** After the popup opens (manually or automatically on a target profile page), `linkedin_scraper.js` is injected to scrape the target profile.
*   **AC-006.2:** `userLinkedInProfileData` is retrieved from `chrome.storage.local`.
*   **AC-006.3:** A `POST` request is made to the n8n webhook URL (from settings) with a JSON payload containing `targetProfileData` and `userProfileData`.
*   **AC-006.4:** While scraping and waiting for n8n response, `ui/loading.html` is displayed.

**US-007:** As a user, after a target profile is analyzed, I want to see the networking score and the reasons for it.
*   **AC-007.1:** Upon successful n8n response, the popup transitions to `ui/score_screen.html`.
*   **AC-007.2:** `ui/score_screen.html` displays the target's basic info (name, photo, headline) derived from `targetProfileData`.
*   **AC-007.3:** The numerical score from n8n (e.g., 75) is displayed, ideally with a visual aid (e.g., radial progress bar).
*   **AC-007.4:** The `reasons_bullets` (array of strings) from n8n are displayed as a list.
*   **AC-007.5:** If n8n response is missing `score` or `reasons_bullets`, or is not valid JSON, `ui/error.html` is shown with a relevant message.

**US-008:** As a user viewing the score, I want to be able to see the full scraped information of the target profile.
*   **AC-008.1:** `ui/score_screen.html` contains a "Scraped Information" button/toggle.
*   **AC-008.2:** Clicking this button reveals a section displaying all scraped details of the target profile (summary, experience, education, licenses/certifications).
*   **AC-008.3:** Clicking it again hides the details.

---
**Epic: Navigation & Settings Management**
---

**US-009:** As a user on the score screen, I want to easily navigate to my own profile view or the settings page.
*   **AC-009.1:** `ui/score_screen.html` has a dropdown menu.
*   **AC-009.2:** The dropdown contains a "My Profile" link that, when clicked, loads `ui/profile.html` with the user's data.
*   **AC-009.3:** The dropdown contains a "Settings" link that, when clicked, loads `ui/settings.html`.

**US-010:** As a user, I want to be able to configure my n8n webhook URL.
*   **AC-010.1:** `ui/settings.html` has an input field for the n8n webhook URL, pre-filled if a value exists in storage.
*   **AC-010.2:** User can edit the URL.
*   **AC-010.3:** A "Save Settings" button persists the URL to `chrome.storage.local`.
*   **AC-010.4:** Inline validation checks for a basic URL format.

**US-011:** As a user, I want to be able to enable or disable the automatic popup feature.
*   **AC-011.1:** `ui/settings.html` has a toggle switch for "Automatically open popup on LinkedIn profiles".
*   **AC-011.2:** The state of the toggle reflects the current setting in `chrome.storage.local`.
*   **AC-011.3:** Changing the toggle state and saving settings updates the stored value.

---
**Epic: Error Handling**
---

**US-012:** As a user, if profile scraping fails (either my own or a target's), I want to see a clear error message.
*   **AC-012.1:** If `linkedin_scraper.js` fails to extract required data or encounters an exception, the popup displays `ui/error.html`.
*   **AC-012.2:** `ui/error.html` shows a generic scraping error message and may include specific details if available.
*   **AC-012.3:** A "Try Again" button on `ui/error.html` re-initiates the last attempted action (e.g., re-scrape target profile, re-scrape user's profile during setup).

**US-013:** As a user, if communication with the n8n webhook fails or returns an error, I want to see a clear error message.
*   **AC-013.1:** If the `fetch` call to n8n results in a network error (e.g., 4xx, 5xx status code) or a timeout, `ui/error.html` is displayed.
*   **AC-013.2:** `ui/error.html` shows an n8n communication error message, potentially including the HTTP status code or parts of the error response.
*   **AC-013.3:** The "Try Again" button re-initiates the n8n call with the same data.

## 6. Design and UI/UX considerations

*   **Interface Style:** The UI should be clean, modern, and professional, aligning with the visual style presented in the `ui/*.html` mockups which utilize Tailwind CSS.
*   **Intuitive Navigation:** Transitions between views should be clear. User actions should have immediate and understandable feedback.
*   **Responsiveness:** While primarily a popup, the content within should be well-structured and readable. The `ui/*.html` files are built with responsiveness in mind.
*   **Clarity of Information:** Scores, reasons, and profile data must be presented in an easily digestible format.
*   **Accessibility:** Standard HTML best practices should be followed to ensure a reasonable level of accessibility (e.g., proper use of headings, ARIA attributes where necessary if not already in mockups).
*   **Embedded CSS:** Styles are primarily embedded in each `ui/*.html` file via `<style>` tags and Tailwind CSS classes. This approach will be maintained for V2.

## 7. Technical requirements

*   **Background Script (`background.js`):**
    *   Uses `chrome.tabs.onUpdated` and `chrome.tabs.onActivated` listeners to detect navigation to LinkedIn profile URLs.
    *   Uses `chrome.action.openPopup()` to programmatically open the extension popup.
    *   Manages the "auto-open" feature state.
*   **Popup Shell (`extension/popup.html`):**
    *   Minimal HTML structure, primarily a container element (e.g., `<div id="view-container"></div>`) where different UI views will be loaded.
*   **Popup Logic (`extension/src/popup/popup.js`):**
    *   Manages current view and transitions (loading HTML content from `ui/*.html` files into `view-container`).
    *   Handles all user interactions from the loaded views by attaching event listeners.
    *   Orchestrates the scraping process using `chrome.scripting.executeScript` to inject `linkedin_scraper.js`.
    *   Manages storage interactions (`chrome.storage.local.get`, `chrome.storage.local.set`, `chrome.storage.local.remove`) for user data, settings, and webhook URL.
    *   Handles `fetch` API calls to the n8n webhook.
    *   Contains logic for initial setup flow vs. regular operation.
*   **Content Scraper (`extension/src/content_scripts/linkedin_scraper.js`):**
    *   Core logic for extracting data from LinkedIn profile pages. Existing selectors and functions will be reused and must be robust.
*   **Storage:** `chrome.storage.local` will be used for:
    *   `userLinkedInProfileData`: Stores the user's own scraped LinkedIn profile.
    *   `n8nWebhookUrl`: Stores the user-configured n8n webhook URL.
    *   `settings_autoOpenPopup`: Boolean, stores user preference for automatic popup.
*   **Permissions (manifest.json):**
    *   `activeTab`: To interact with the current page.
    *   `scripting`: To inject `linkedin_scraper.js`.
    *   `storage`: To store user data and settings.
    *   `tabs`: For `background.js` to get URL of updated tabs.
    *   `host_permissions`: Will require the n8n webhook domain specified by the user, and potentially `*://*.linkedin.com/*`. The manifest will need to accommodate a user-defined host for the n8n webhook or use broad permissions if dynamically setting specific host permissions is too complex (though less secure). *Security Note: Broad host permissions should be carefully considered.* For V2, we will proceed with requiring the user to input their specific n8n domain, which `popup.js` will use in `fetch`. If manifest `host_permissions` can't be dynamically updated, a more general permission might be needed, or we stick to what V1 had and ensure the new n8n URL is covered. For now, assume the V1 host permission approach for n8n is adaptable.

## 8. Success metrics

*   **User Adoption & Retention:**
    *   Number of new installations.
    *   Number of active users (e.g., weekly active users).
    *   Churn rate of existing V1 users upgrading to V2.
*   **Feature Engagement:**
    *   Frequency of profile analysis (scores generated per user).
    *   Usage of settings page and feature configurations (e.g., auto-popup toggle).
    *   Number of users successfully completing the initial profile setup.
*   **Task Success Rates:**
    *   Percentage of successful profile scrapes (target and user's own).
    *   Percentage of successful n8n webhook calls and score retrievals.
*   **User Satisfaction:**
    *   Qualitative feedback (if a feedback mechanism is implemented or via web store reviews).
    *   Ratings on the Chrome Web Store.
*   **Performance & Reliability:**
    *   Average time to display score after page load (for auto-popup).
    *   Number of errors reported/logged (scraping errors, n8n errors).

## 9. Out of scope for V2 initial release

The following features are considered out of scope for the initial V2 release described in this PRD:

*   **Functional Resume Parsing:** While UI elements for resume upload exist in `ui/main.html`, the actual parsing of resume files and integration of that data into `userProfileData` or the LLM call is deferred.
*   **LinkedIn Company Page Analysis:** All current V2 functionality is focused on individual LinkedIn profiles.
*   **Advanced LLM Use Cases:** Features like tailored icebreaker suggestions or other complex LLM-driven insights beyond the score and reasons.
*   **Customizable Scoring Weights/Criteria:** Users will not be able to adjust how the score is calculated.
*   **Batch Profile Analysis:** The extension will operate on one profile at a time.
*   **Integration with CRM or Other Tools:** No external tool integrations beyond the n8n webhook.

## 10. Future considerations

Based on the `future_features.txt` document and ongoing ideation, potential future enhancements beyond V2 include:

*   Implementing full resume parsing and integrating its data.
*   Extending analysis capabilities to LinkedIn Company Pages.
*   Providing an alternative manual trigger for analysis (e.g., context menu button).
*   Offering more granular error reporting and user guidance.
*   Expanding LLM use cases for deeper insights.

---
This PRD is subject to review and updates as the project progresses. 