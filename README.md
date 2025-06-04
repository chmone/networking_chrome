# LinkedIn Insight V2 - Chrome Extension

A powerful Chrome extension that analyzes LinkedIn profiles and provides AI-powered networking scores to help professionals make strategic connection decisions.

## 🚀 Features

### Current V2 Features
- **Multi-Screen UI**: Dynamic interface with separate views for setup, analysis, and results
- **Profile Scraping**: Automated extraction of LinkedIn profile data (experience, education, skills)
- **AI-Powered Scoring**: Integration with N8N webhooks and LLM analysis for networking compatibility scores
- **Automatic Popup**: Smart detection of LinkedIn profile pages with auto-activation
- **User Profile Management**: Save and manage your own LinkedIn profile data
- **Configurable Settings**: Customizable N8N webhook URLs and extension preferences

### UI Components
- **Main Screen**: Initial setup and onboarding
- **Profile View**: Display of user's own LinkedIn data
- **Score Screen**: Target profile analysis with networking scores and insights
- **Loading Screen**: Animated progress indicators
- **Idle Screen**: Clean interface for user's own profile
- **Settings**: Configuration management

## 🏗️ Architecture

### Directory Structure
```
extension/
├── popup/              # Main popup interface
│   ├── popup_shell.html
│   ├── popup_core.js
│   └── popup.css
├── ui/                 # Dynamic view templates
│   ├── main.html
│   ├── score_screen.html
│   ├── profile.html
│   ├── loading.html
│   ├── idle.html
│   └── error.html
├── background/         # Background processing
│   └── background.js
├── settings/           # Extension configuration
│   ├── settings.html
│   ├── settings.js
│   └── settings.css
├── content_scripts/    # LinkedIn page interaction
│   └── linkedin_scraper.js
├── icons/             # Extension icons
└── manifest.json      # Chrome extension manifest
```

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Tailwind CSS
- **Storage**: Chrome Storage API
- **APIs**: Chrome Extension APIs (scripting, storage, tabs, runtime)
- **AI Integration**: N8N webhook with LLM processing

## 🔧 Installation

### For Development
1. Clone this repository:
   ```bash
   git clone https://github.com/Cam/networking_chrome.git
   cd networking_chrome
   ```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension/` directory

### For Users
*Coming soon: Chrome Web Store publication*

## ⚙️ Configuration

1. **Initial Setup**: Enter your LinkedIn profile URL when first opening the extension
2. **N8N Webhook**: Configure your N8N webhook URL in settings for AI score analysis
3. **Auto-Popup**: Enable/disable automatic popup when visiting LinkedIn profiles

## 🔒 Security & Privacy

- Profile data is stored locally using Chrome's secure storage API
- No data is transmitted except to your configured N8N webhook
- All network requests are made over HTTPS
- Extension only accesses LinkedIn.com domains

## 📋 Development Status

### ✅ V2 Complete
- Multi-screen UI implementation
- Profile scraping and storage
- Basic N8N integration
- Settings management
- Auto-popup functionality

### 🚧 V2.1 In Progress
- Enhanced security with rate limiting
- Improved UX (no scrolling, better formatting)
- Idle screen integration
- Profile image display fixes
- Data transmission improvements

## 🤝 Contributing

This is currently a private development project. For questions or collaboration inquiries, please contact the development team.

## 📄 License

*License information to be added*

## 🔮 Roadmap

### Future Features
- Resume parsing integration
- Company page analysis
- CRM integrations
- Advanced LLM insights
- Batch profile analysis

---

**Note**: This extension is designed for professional networking enhancement and should be used in compliance with LinkedIn's Terms of Service. 