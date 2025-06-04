# linkedin-shrome-extension-support

## Problem
Users browsing LinkedIn want a quick and easy way to assess the networking potential of profiles they view. Manually evaluating each profile against their own background and networking goals can be time-consuming and subjective.

## Solution
Develop a Chrome extension that provides a "networking score" for LinkedIn profiles.
The extension will:
1. Scrape the content of the currently viewed LinkedIn profile.
2. Send this scraped data, along with the user's own resume and/or LinkedIn profile (provided by the user), to a Large Language Model (LLM).
3. The LLM will analyze this information and generate a rating (e.g., out of 100) indicating how good of a networking contact the viewed profile might be for the user.
4. Display this score in a pop-up or overlay within the browser.

The immediate focus for this initial idea phase is to get a basic, functioning Chrome extension built that can perform some of these core actions, even if simplified (e.g., basic scraping and displaying static info before full LLM integration).

## Rabbit Holes
Potential challenges, complexities, or areas to investigate further:
- **LLM Integration:**
    - Selecting the appropriate LLM (cost, capabilities, API availability).
    - Managing API keys securely.
    - Prompt engineering for effective and consistent scoring.
    - Potential costs associated with LLM API calls.
- **Scraping LinkedIn:**
    - Adherence to LinkedIn's Terms of Service regarding data scraping.
    - Robustness of the scraper against changes in LinkedIn's page structure.
    - Handling different profile layouts and data availability.
- **User Data Privacy & Security:**
    - Securely storing and handling the user's resume and/or LinkedIn profile data.
    - Ensuring no sensitive PII is unnecessarily stored or transmitted.
- **Scoring Logic & Bias:**
    - Defining what constitutes a "good networking person" and how the LLM should evaluate this.
    - Potential biases in LLM scoring and ensuring fairness/objectivity.
    - Transparency of the scoring mechanism for the user.
- **Chrome Extension Development:**
    - Permissions required by the extension.
    - UI/UX design of the pop-up/overlay for a good user experience.
    - Performance implications of scraping and LLM calls.
- **Rate Limiting & Abuse:**
    - Handling potential rate limits from LinkedIn or the LLM provider.
    - Preventing misuse of the extension.
