# Version Check Skill

## Description

Display version information for all ChatOrbit components. Shows local versions and can check deployed versions.

## Trigger

Use `/version` command to display all component versions.

## Version Locations

| Component | Location | How to Read |
|-----------|----------|-------------|
| Project | `/VERSION` | Parse PROJECT= line |
| Frontend | `/frontend/package.json` | Read "version" field |
| Backend | `/backend/app/config.py` | Read VERSION constant |
| Mobile | `/mobile/v2/app.json` | Read "expo.version" field |

## Actions

### Show Local Versions

Read version from each location:

```bash
# All versions at once
echo "=== ChatOrbit Version Status ==="
echo ""
echo "Local Versions:"
echo "  Project:  $(grep '^PROJECT=' VERSION | cut -d= -f2)"
echo "  Frontend: $(grep '"version"' frontend/package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')"
echo "  Backend:  $(grep '^VERSION' backend/app/config.py | sed 's/.*"\([^"]*\)".*/\1/')"
echo "  Mobile:   $(grep '"version"' mobile/v2/app.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')"
```

### Check Deployed Backend Version

```bash
curl -s https://endpoints.chatorbit.com/api/version | jq -r '.version'
```

### Output Format

```
ChatOrbit Version Status
========================

Local Versions:
  Project:  2.0.0
  Frontend: 2.0.0
  Backend:  2.0.0
  Mobile:   2.0.0

Deployed Versions:
  Backend API: 2.0.0

Status: All components in sync
```

## Version Bump Commands

### Patch Release (2.0.0 -> 2.0.1)
```bash
# Bug fixes, minor changes
./scripts/bump-version.sh patch
```

### Minor Release (2.0.0 -> 2.1.0)
```bash
# New features, backwards compatible
./scripts/bump-version.sh minor
```

### Major Release (2.0.0 -> 3.0.0)
```bash
# Breaking changes
./scripts/bump-version.sh major
```

## Semantic Versioning Rules

- **MAJOR**: Breaking API changes, major rewrites
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, minor improvements

## Version Sync Check

Ensure all components have matching versions:

```bash
PROJECT_V=$(grep '^PROJECT=' VERSION | cut -d= -f2)
FRONTEND_V=$(grep '"version"' frontend/package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
BACKEND_V=$(grep '^VERSION' backend/app/config.py | sed 's/.*"\([^"]*\)".*/\1/')
MOBILE_V=$(grep '"version"' mobile/v2/app.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')

if [ "$PROJECT_V" = "$FRONTEND_V" ] && [ "$PROJECT_V" = "$BACKEND_V" ] && [ "$PROJECT_V" = "$MOBILE_V" ]; then
  echo "All versions in sync: $PROJECT_V"
else
  echo "Version mismatch!"
  echo "  Project:  $PROJECT_V"
  echo "  Frontend: $FRONTEND_V"
  echo "  Backend:  $BACKEND_V"
  echo "  Mobile:   $MOBILE_V"
fi
```

## Example Usage

User: `/version`

Response:
```
ChatOrbit Version Status
========================

Local Versions:
  Project:  2.0.0
  Frontend: 2.0.0
  Backend:  2.0.0
  Mobile:   2.0.0

All components in sync!
```
