# Product Requirements Document: LinkedIn Insight V3 - Complete N8N Integration

## Overview

This document outlines the product requirements for completing the N8N integration in LinkedIn Insight V3, transforming it from a non-functional prototype into a working networking analysis tool. The primary goal is to establish a complete data pipeline from LinkedIn profile scraping through N8N AI analysis to displaying actionable networking insights in the extension UI.

## Project goals and objectives

### Primary Goal
Enable end-to-end networking analysis by completing the N8N integration pipeline to deliver AI-powered networking scores and bullet-point insights to users.

### Success Metrics
- **Functional Integration**: 100% of analysis attempts result in either successful scores/insights or clear error messages
- **User Experience**: Analysis completes within 10 seconds from initiation to results display
- **Data Quality**: User's actual LinkedIn profile data is transmitted (not defaults) in 100% of cases
- **Reliability**: System handles errors gracefully with informative feedback to users

### Business Objectives
- Transform LinkedIn Insight from prototype to functional product
- Provide measurable networking value to users
- Create foundation for future enterprise features and monetization

## Target audience and user personas

### Primary User: Professional Networker
- **Profile**: Working professionals seeking strategic networking opportunities
- **Use Case**: Evaluating LinkedIn connections for business development, job opportunities, or industry insights
- **Pain Points**: Time-consuming manual analysis of profiles, uncertainty about networking value
- **Success Criteria**: Quick, accurate assessment of networking compatibility with actionable insights

### Secondary User: Business Developer
- **Profile**: Sales professionals and business development managers
- **Use Case**: Qualifying prospects and identifying optimal connection approaches
- **Pain Points**: Manual research overhead, inconsistent prospect evaluation
- **Success Criteria**: Scalable prospect analysis with specific talking points and connection strategies

## User stories and acceptance criteria

### Core Analysis Flow

**US-001: Initiate Analysis**
- **Story**: As a user, I want to click "Analyze" on a LinkedIn profile page so that I can get AI-powered networking insights
- **Acceptance Criteria**:
  - User sees loading screen immediately after clicking analyze
  - Extension validates that required profile data exists before proceeding
  - System provides clear feedback if profile data is insufficient
  - Analysis cannot be initiated multiple times simultaneously

**US-002: Data Transmission to N8N**
- **Story**: As a system, I need to send properly formatted profile data to N8N so that the AI can generate networking analysis
- **Acceptance Criteria**:
  - User profile data is retrieved from Chrome storage (not defaults)
  - Target profile data is scraped from current LinkedIn page
  - JSON payload includes all required fields for analysis
  - POST request sent to configured N8N webhook URL
  - System logs transmission details when in diagnostic mode

**US-003: N8N Return Webhook Configuration**
- **Story**: As a system, I need to receive structured analysis results from N8N so that I can display them to the user
- **Acceptance Criteria**:
  - N8N configured with return webhook (GET or PUT endpoint)
  - Extension provides callback URL for N8N to return results
  - LLM within N8N generates structured output format
  - Extension receives and validates response format
  - System handles response timeouts and errors

**US-004: Display Analysis Results**
- **Story**: As a user, I want to see my networking score and insights so that I can make informed connection decisions
- **Acceptance Criteria**:
  - Numerical networking score displayed prominently in score_screen.html
  - Bullet-point insights rendered as clean, formatted list
  - Analysis completion time shown to user
  - Option to view detailed profile data used in analysis
  - Results persist until new analysis is performed

### Diagnostic and Testing Features

**US-005: Diagnostic Mode**
- **Story**: As a developer/power user, I want to enable diagnostic mode so that I can troubleshoot integration issues
- **Acceptance Criteria**:
  - Diagnostic mode toggle available in extension settings
  - When enabled, detailed logging shown in browser console
  - Step-by-step status indicators visible during analysis
  - Debug information includes data payloads and response details
  - Diagnostic mode disabled by default for regular users

**US-006: Mock Data Testing**
- **Story**: As a developer, I want to test with mock profile data so that I can develop without constantly using live LinkedIn profiles
- **Acceptance Criteria**:
  - Mock data can be loaded from HTML file or predefined dataset
  - Mock mode available in diagnostic settings
  - Mock data follows same structure as real LinkedIn profile data
  - System clearly indicates when using mock vs. real data
  - Mock data includes various profile types for comprehensive testing

### Error Handling and Edge Cases

**US-007: Network Error Handling**
- **Story**: As a user, I want clear feedback when analysis fails so that I understand what went wrong
- **Acceptance Criteria**:
  - Network errors display user-friendly error messages
  - User offered option to retry analysis
  - System differentiates between temporary and permanent failures
  - Error details logged when in diagnostic mode
  - Failed analysis doesn't leave user in loading state

**US-008: Incomplete Profile Data**
- **Story**: As a user, I want to know if a LinkedIn profile lacks sufficient data for analysis so that I can understand limitations
- **Acceptance Criteria**:
  - System validates minimum required profile fields before analysis
  - Clear message explains what data is missing
  - Option to proceed with limited analysis when appropriate
  - Graceful degradation when target profile has privacy restrictions

## Technical requirements

### N8N Integration Architecture

**Data Flow Requirements**:
1. Extension POST request to N8N webhook with profile data
2. N8N processes data through LLM workflow
3. N8N returns structured results via GET/PUT to extension callback
4. Extension parses response and updates UI

**Required API Endpoints**:
- **Outbound**: POST to existing N8N webhook URL
- **Inbound**: New endpoint in extension for N8N response callback
- **Format**: JSON structured input/output as defined with LLM

**Data Structure Requirements**:
- **Input**: `{ userProfile: {}, targetProfile: {}, analysisType: "networking" }`
- **Output**: `{ score: number, insights: string[], metadata: {}, timestamp: string }`

### Chrome Extension Requirements

**Storage Management**:
- Reliable Chrome storage API usage for user profile data
- Session storage for temporary analysis states
- Cache management for recent analysis results

**Performance Requirements**:
- Analysis initiation response within 500ms
- Complete analysis cycle within 10 seconds
- UI updates must be responsive during processing

**Security Requirements**:
- N8N webhook URL stored securely in extension settings
- Data transmission over HTTPS only
- No persistent storage of sensitive analysis data

## Design and user experience requirements

### UI/UX Requirements

**Loading States**:
- Immediate feedback upon analysis initiation
- Progressive loading indicators showing current step
- Estimated time remaining when possible
- Ability to cancel long-running analysis

**Results Display**:
- Prominent numerical score (1-100 scale recommended)
- Bullet-point insights formatted for readability
- Clear visual hierarchy between score and details
- Professional appearance matching existing extension design

**Error States**:
- Friendly error messages with suggested actions
- Option to retry failed analysis
- Help/support information when appropriate
- No technical error codes visible to end users

### Diagnostic Interface

**Debug Information Display**:
- Collapsible debug panel in diagnostic mode
- Real-time logging of analysis steps
- Data payload inspection capabilities
- Response timing and status information

## Dependencies and constraints

### External Dependencies

**N8N Workflow**:
- N8N workflow must be configured with return webhook capability
- LLM within N8N must generate consistent structured output
- Webhook endpoint must handle POST requests reliably

**LinkedIn Platform**:
- Continued access to LinkedIn profile pages
- Stable DOM structure for profile scraping
- Compliance with LinkedIn terms of service

### Technical Constraints

**Chrome Extension Limitations**:
- Content Security Policy restrictions on external requests
- Limited local storage capacity
- Cross-origin request handling requirements

**Performance Constraints**:
- Analysis must complete within reasonable timeframes
- Extension must remain responsive during processing
- Minimal impact on LinkedIn page performance

## Success criteria and metrics

### Functional Success Criteria

**Core Functionality**:
- [ ] User can initiate analysis on any LinkedIn profile page
- [ ] System successfully transmits actual user profile data (not defaults)
- [ ] N8N receives data, processes it, and returns structured results
- [ ] Extension displays networking score and insights in UI
- [ ] Error cases handled gracefully with user feedback

**Quality Metrics**:
- Analysis success rate > 95%
- Average analysis time < 8 seconds
- Zero cases of default data transmission
- User can complete analysis workflow without external assistance

### User Experience Success Criteria

**Usability**:
- First-time users can complete analysis without instructions
- Error messages are actionable and helpful
- Results provide clear value for networking decisions
- Interface remains responsive throughout process

**Reliability**:
- System recovers gracefully from temporary failures
- Diagnostic mode provides sufficient troubleshooting information
- Mock data testing enables rapid development iteration

## Timeline and milestones

### Phase 1: Foundation (Week 1)
- Implement diagnostic mode and debug logging
- Create mock data testing capability
- Validate current user profile data collection

### Phase 2: N8N Integration (Week 2)
- Configure N8N return webhook
- Define structured input/output formats
- Implement bidirectional communication

### Phase 3: UI Integration (Week 3)
- Complete response parsing and display
- Implement error handling and user feedback
- Test end-to-end workflow

### Phase 4: Testing and Polish (Week 4)
- Comprehensive testing with various profile types
- Performance optimization
- Documentation and user guidance

## Risks and mitigation strategies

### High-Risk Issues

**N8N Configuration Changes**:
- *Risk*: N8N workflow modifications break integration
- *Mitigation*: Document API contract, implement format validation

**LinkedIn Anti-Scraping**:
- *Risk*: LinkedIn blocks or limits profile scraping
- *Mitigation*: Implement respectful scraping practices, add delays

### Medium-Risk Issues

**Performance Degradation**:
- *Risk*: Analysis takes too long or fails frequently
- *Mitigation*: Implement timeouts, retry logic, and performance monitoring

**User Experience Confusion**:
- *Risk*: Users don't understand results or encounter errors
- *Mitigation*: Clear UI design, helpful error messages, documentation 