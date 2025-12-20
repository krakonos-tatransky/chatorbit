# ChatOrbit Documentation Keeper

## Description

Expert documentation maintainer for ChatOrbit that keeps all project documentation synchronized, accurate, and up-to-date. Manages README files, architecture documentation, project context files, and changelogs across the entire codebase.

## Core Responsibilities

This skill maintains documentation across five key areas:

1. **Root README.md** - User-facing project overview and setup instructions
2. **CLAUDE.MD** - Internal project context for AI assistants
3. **docs/architecture.md** - Detailed technical architecture documentation
4. **docs/CHANGELOG.md** - Comprehensive project changelog
5. **Component READMEs** - Documentation in subdirectories (backend/, frontend/, mobile/, etc.)

## File Locations

```
/Users/erozloznik/Projects/chatorbit-mobile/
├── README.md                  # Main project documentation
├── CLAUDE.MD                  # AI assistant context
├── docs/
│   ├── architecture.md        # Technical architecture
│   └── CHANGELOG.md           # Project changelog
├── backend/README.md          # Backend-specific docs
├── frontend/README.md         # Frontend-specific docs
├── mobile/README.md           # Mobile app docs
└── mobile/src/i18n/README.md  # i18n system docs
```

## Documentation Standards

### README.md (Root)

**Purpose**: First point of contact for developers setting up ChatOrbit

**Must Include**:
- Brief project description (2-3 sentences)
- Technology stack table (Frontend/Backend/Mobile/Infra)
- Local development setup (step-by-step)
- Docker workflow
- Key concepts (token minting, session lifecycle, WebRTC)
- Brand assets location
- Project structure overview
- Environment variables reference

**Tone**: Clear, concise, actionable. Assume reader is a developer setting up for the first time.

**Update When**:
- New technology/framework added
- Setup process changes
- New environment variables required
- Major features added
- Directory structure changes

### CLAUDE.MD

**Purpose**: Comprehensive context for AI assistants working on ChatOrbit

**Must Include**:
- Project overview with business context
- Complete technology stack breakdown
- Detailed project structure with file descriptions
- Key concepts and patterns
- Important environment variables
- Development workflow
- Recent changes section (last 5-10 commits/features)
- Common patterns used in codebase
- Known issues & troubleshooting
- Brand assets information

**Tone**: Technical, detailed, insider perspective. Write for an AI that needs deep context.

**Update When**:
- Any significant code changes
- New patterns established
- Architecture decisions made
- Major bugs discovered/fixed
- New features added
- Dependencies updated
- File structure changes

**Special Notes**:
- Keep "Recent Changes" section fresh (remove old items after ~2 weeks)
- Cross-reference with architecture.md for technical details
- Include links to relevant code files

### docs/architecture.md

**Purpose**: Deep-dive technical architecture documentation

**Must Include**:

1. **System Overview**
   - High-level architecture diagram (ASCII or link to visual)
   - Component interaction flow
   - Data flow diagrams

2. **Frontend Architecture**
   - Next.js 14 App Router structure
   - Component organization
   - State management patterns
   - API integration layer
   - WebRTC implementation
   - i18n system architecture
   - Design system (colors, spacing, components)

3. **Mobile Architecture**
   - React Native structure
   - Navigation patterns
   - State management
   - WebRTC implementation (mobile-specific)
   - i18n system
   - Native module integration
   - Platform-specific considerations

4. **Backend Architecture**
   - FastAPI application structure
   - Database schema (SQLAlchemy models)
   - WebSocket gateway design
   - Session lifecycle state machine
   - Token management system
   - Rate limiting implementation
   - Email notification system

5. **Cross-Platform Patterns**
   - Design system consistency (frontend ↔ mobile)
   - i18n synchronization
   - WebRTC signaling flow
   - Encryption/decryption flow
   - Message exchange protocol

6. **Infrastructure**
   - Docker setup
   - Development vs Production configurations
   - Reverse proxy setup (ISPConfig)
   - Environment variable cascade

7. **Security**
   - End-to-end encryption (AES-GCM)
   - Token validation
   - Rate limiting strategy
   - CORS configuration
   - WebSocket authentication

8. **Data Models**
   - Session lifecycle states
   - Token structure
   - Message format
   - Participant model

**Tone**: Technical, detailed, assume reader is experienced developer or architect.

**Update When**:
- Architecture changes
- New systems added
- Security model changes
- Data models evolve
- Integration patterns established
- Infrastructure changes

### docs/CHANGELOG.md

**Purpose**: Chronological record of all notable changes

**Format**: Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to ChatOrbit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Feature descriptions

### Changed
- Modification descriptions

### Fixed
- Bug fix descriptions

### Security
- Security improvements

## [1.2.0] - 2025-01-15

### Added
- Mobile i18n system with AsyncStorage persistence
- Language switcher component for mobile app
- Cross-platform design sync skill

### Changed
- Updated AcceptScreen to use translations
- Wrapped App.tsx with LanguageProvider

## [1.1.0] - 2024-12-20

### Added
- WebRTC video chat for browser-to-mobile
...
```

**Update When**:
- Any feature added
- Any bug fixed
- Any breaking change
- Security patches
- Performance improvements
- Dependency updates

**Categories**:
- `Added` - New features
- `Changed` - Changes to existing functionality
- `Deprecated` - Features to be removed
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Security improvements

### Component READMEs

**Purpose**: Document specific modules/subsystems

**Examples**:
- `backend/README.md` - Backend-specific setup, API docs, testing
- `frontend/README.md` - Frontend build, components, styling system
- `mobile/README.md` - Mobile setup, testing, platform specifics
- `mobile/src/i18n/README.md` - i18n usage guide (already created)

**Must Include**:
- Subsystem overview
- Setup/installation specific to this component
- Usage examples
- API reference (if applicable)
- Testing instructions
- Common issues

**Update When**:
- Component architecture changes
- New patterns established in this subsystem
- Setup process changes
- New APIs added

## Workflow

### When Invoked

1. **Analyze Recent Changes**
   - Check git log for recent commits
   - Identify changed files and their purposes
   - Determine which documentation needs updates

2. **Audit Current Documentation**
   - Read all documentation files
   - Identify outdated sections
   - Find missing information
   - Detect inconsistencies between files

3. **Cross-Reference**
   - Ensure CLAUDE.MD and architecture.md don't duplicate
   - Keep README.md high-level while CLAUDE.MD and architecture.md go deep
   - Verify examples in docs match actual code
   - Check environment variables documented everywhere they're used

4. **Update Strategy**
   - **README.md**: Keep concise, update only major changes
   - **CLAUDE.MD**: Update "Recent Changes", add new patterns
   - **architecture.md**: Deep technical updates, diagrams, flows
   - **CHANGELOG.md**: Add entries chronologically with dates
   - **Component READMEs**: Update specific to changed subsystems

5. **Verify Accuracy**
   - Check code references are correct
   - Verify file paths exist
   - Ensure examples work
   - Validate environment variable names

### Update Triggers

**Automatic (when these occur)**:
- New feature merged to main
- Architecture refactored
- New dependencies added
- Environment variables changed
- Directory structure modified
- API endpoints added/changed
- Security patches applied

**On Request**:
- User asks to update documentation
- Documentation audit requested
- Pre-release documentation review
- Onboarding new developer (ensure docs are fresh)

## Content Guidelines

### Writing Style

**README.md**:
- Imperative mood ("Clone the repository" not "You should clone")
- Short sentences (max 20 words)
- Bullet points over paragraphs
- Code blocks for all commands
- Numbered steps for sequences

**CLAUDE.MD**:
- Descriptive and contextual
- Explain "why" not just "what"
- Include decision rationale
- Link to code examples
- Mention gotchas and edge cases

**architecture.md**:
- Technical precision
- Use diagrams/ASCII art for flows
- Explain design decisions
- Document alternatives considered
- Include performance implications
- Reference specific files (`frontend/lib/webrtc.ts:142`)

**CHANGELOG.md**:
- Start with verb (Added, Fixed, Changed)
- Be specific but concise
- Link to issues/PRs when relevant
- Group related changes
- Use present tense

### Code Examples

- Always test code examples before documenting
- Include full context (imports, setup)
- Show both success and error cases
- Annotate complex examples with comments
- Keep examples minimal but complete

### File Paths

- Always use absolute paths from repo root
- Format: `backend/app/main.py` not `./backend/app/main.py`
- Verify paths exist before documenting
- Update paths when files move

## Specific Scenarios

### New Feature Added

1. Update **CHANGELOG.md** with "Added" entry under [Unreleased]
2. Update **CLAUDE.MD** "Recent Changes" section
3. Add to **README.md** if user-facing or changes setup
4. Document in **architecture.md** if changes system design
5. Update component README if feature is subsystem-specific

### Architecture Refactor

1. Major update to **architecture.md** with new diagrams/flows
2. Update **CLAUDE.MD** with new patterns and rationale
3. Update **CHANGELOG.md** with "Changed" entry
4. Review **README.md** for any setup changes

### Bug Fix

1. Update **CHANGELOG.md** with "Fixed" entry
2. Update **CLAUDE.MD** "Known Issues" if it was documented there
3. Update **architecture.md** if fix reveals design insight
4. No README.md change unless bug affected setup

### Dependency Update

1. Update **CHANGELOG.md** with version change
2. Update **README.md** if installation process changes
3. Update **CLAUDE.MD** technology stack section
4. Update **architecture.md** if dependency changes architecture

### Environment Variable Added

1. Update **README.md** environment variables section
2. Update **CLAUDE.MD** important environment variables
3. Update **.env.example** file
4. Document in **architecture.md** how it affects system

## Cross-Platform Synchronization

Special attention to mobile ↔ frontend consistency:

### When Mobile Feature Added

- Document in `mobile/README.md`
- Check if frontend has equivalent
- Update architecture.md with cross-platform comparison
- Document differences in platform-specific sections

### When i18n Changed

- Update `mobile/src/i18n/README.md`
- Check `frontend/lib/i18n/` documentation
- Note sync requirements in architecture.md
- Document translation workflow

### When Design System Updated

- Document in both frontend and mobile READMEs
- Update architecture.md design system section
- Cross-reference color/spacing constants
- Document component equivalents

## Templates

### Architecture Section Template

```markdown
## [Component Name]

### Overview
[2-3 sentence description of component's purpose]

### Structure
```
[Directory tree or component diagram]
```

### Key Files
- `path/to/file.ts` - [Brief description]
- `path/to/other.ts` - [Brief description]

### Design Decisions
- **Decision**: [What was decided]
  - **Rationale**: [Why this approach]
  - **Trade-offs**: [What we gave up]

### Data Flow
[Diagram or step-by-step flow]

### Integration Points
- Integrates with [Component X] via [method]
- Depends on [Component Y] for [functionality]

### Configuration
- `ENV_VAR_NAME` - [Description]

### Examples
```typescript
// Example usage
```
```

### Changelog Entry Template

```markdown
### Added
- Mobile i18n system with automatic language detection and AsyncStorage persistence
- `LanguageSwitcher` component for mobile app with modal UI
- `useLanguage()` hook for accessing translations in React Native components

### Changed
- Wrapped `App.tsx` with `LanguageProvider` to enable i18n throughout mobile app
- Updated `AcceptScreen` to demonstrate i18n usage with `translations.termsModal.agree`

### Technical
- Installed `@react-native-async-storage/async-storage` and `expo-localization` dependencies
- Created `mobile/src/i18n/` directory structure matching frontend pattern
```

## Consistency Checks

Before finalizing documentation updates, verify:

### Cross-File Consistency
- [ ] Same technology versions mentioned in README, CLAUDE.MD, architecture.md
- [ ] File paths consistent across all docs
- [ ] Environment variables match .env.example
- [ ] Setup steps align between README and component READMEs

### Code Accuracy
- [ ] All code examples compile/run
- [ ] Import statements are correct
- [ ] File paths exist
- [ ] API examples match actual implementation

### Completeness
- [ ] All new features documented
- [ ] All breaking changes noted
- [ ] All environment variables explained
- [ ] All architectural decisions recorded

### Clarity
- [ ] No jargon without explanation
- [ ] Acronyms defined on first use
- [ ] Examples provided for complex concepts
- [ ] Diagrams for visual concepts

## When NOT to Update

- Trivial typo fixes (unless in user-facing docs)
- Internal refactoring with no API changes
- Test file changes
- CI/CD tweaks that don't affect users
- Code formatting changes

## Maintenance Schedule

### Weekly
- Review "Recent Changes" in CLAUDE.MD, remove stale items
- Check README.md still reflects current setup
- Verify all links work

### Monthly
- Full documentation audit
- Update architecture diagrams if system evolved
- Review CHANGELOG for completeness
- Check for outdated screenshots/examples

### Before Release
- Move [Unreleased] to version in CHANGELOG
- Update README with any new features
- Full accuracy check on all docs
- Verify all examples work

## Key Files to Monitor

Always watch these files for changes:

**Backend**:
- `backend/app/main.py` - API routes, WebSocket gateway
- `backend/app/models.py` - Database schema
- `backend/app/config.py` - Configuration, env vars

**Frontend**:
- `frontend/app/` - Page structure
- `frontend/components/` - Component library
- `frontend/lib/` - Utilities, API client

**Mobile**:
- `mobile/App.tsx` - Entry point
- `mobile/src/components/` - Component library
- `mobile/src/i18n/` - Internationalization
- `mobile/src/constants/` - Design system

**Infrastructure**:
- `.env.example` - Environment variables
- `infra/docker-compose.yml` - Development setup
- `package.json` (frontend, mobile) - Dependencies

## Output Format

When updating documentation, provide:

1. **Summary** of what changed in the codebase
2. **Affected Docs** - List which files need updates
3. **Proposed Changes** - Show diffs or describe updates
4. **Verification** - Confirm accuracy of updates
5. **Cross-References** - Note related documentation updated

Example output:
```
## Documentation Update

### Changes Detected
- Added mobile i18n system
- Installed new dependencies
- Created new directory structure

### Affected Documentation
1. ✏️ CLAUDE.MD - Add i18n system to Recent Changes
2. ✏️ docs/architecture.md - Document mobile i18n architecture
3. ✏️ docs/CHANGELOG.md - Add [Unreleased] entries
4. ✏️ mobile/README.md - Document i18n setup

### Updates Applied
[Specific changes made to each file]

### Verification
✅ All file paths verified
✅ Code examples tested
✅ Cross-references updated
✅ Consistency checked
```

## Success Criteria

Documentation is successful when:

1. **New developer can set up project** using only README.md
2. **AI assistant has full context** from CLAUDE.MD
3. **Architect understands system** from architecture.md
4. **Changelog accurately reflects** all notable changes
5. **No contradictions** between documentation files
6. **All examples work** when copy-pasted
7. **Documentation stays current** with code

## Priority Matrix

When time is limited, prioritize:

**High Priority** (Always update):
- CHANGELOG.md for user-facing changes
- README.md for setup process changes
- CLAUDE.MD for new patterns/recent changes

**Medium Priority** (Update when significant):
- architecture.md for design changes
- Component READMEs for subsystem changes

**Low Priority** (Update periodically):
- Internal documentation
- Comment documentation
- Example refinements
