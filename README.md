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

#### Chrome Extension Setup
1. Clone this repository:
   ```bash
   git clone https://github.com/Cam/networking_chrome.git
   cd networking_chrome
   ```

2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `extension/` directory

#### AI-SDLC Development Environment (Optional)
For systematic feature development using AI-SDLC workflow:

1. **Windows (PowerShell)**:
   ```powershell
   cd ai-sdlc-latest
   .\dev-setup.ps1 build
   .\dev-setup.ps1 start
   ```

2. **Linux/macOS**:
   ```bash
   cd ai-sdlc-latest
   ./dev-setup.sh build
   ./dev-setup.sh start
   ```

The Docker environment provides a structured 8-step development workflow with AI assistance.

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

### ✅ V2.1 Complete (January 2025)
- Multi-screen UI implementation with dynamic view loading
- Profile scraping and secure local storage
- N8N webhook integration with AI-powered scoring
- Settings management and auto-popup functionality
- Enhanced UX with loading states and error handling
- Idle screen integration for user's own profile
- Comprehensive testing and production-ready code

### 🚀 V3 Development (Current - January 2025)
- **AI-SDLC Integration**: Systematic development workflow using Docker environment
- **Enhanced Security**: Rate limiting and improved data validation
- **Advanced Features**: Expanding networking analysis capabilities
- **Code Quality**: Following structured 8-step AI-SDLC development process

## 🤝 Contributing

This project follows a structured AI-SDLC (Software Development Life Cycle) approach for systematic feature development:

### Development Workflow
1. **AI-SDLC Process**: All new features follow an 8-step development workflow (idea → PRD → architecture → tasks → tests)
2. **Version Control**: Use the `v3` branch for current development, `main` for stable releases
3. **Docker Environment**: Leverage the included Docker setup for consistent development experience

### Contributing Guidelines
- Follow the existing code patterns and architectural decisions documented in `rules/system.md`
- Use the AI-SDLC workflow for major features and enhancements
- Ensure all changes maintain compatibility with Chrome Extension APIs
- Test thoroughly on actual LinkedIn profiles before submitting

## 📄 License

MIT License - This project is open source and available under the MIT License.

## 🔮 Roadmap

### Future Features
- Resume parsing integration
- Company page analysis
- CRM integrations
- Advanced LLM insights
- Batch profile analysis

---

**Note**: This extension is designed for professional networking enhancement and should be used in compliance with LinkedIn's Terms of Service. 