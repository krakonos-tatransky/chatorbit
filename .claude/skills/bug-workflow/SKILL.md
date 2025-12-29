# Bug Workflow Skill

## Description

Comprehensive bug tracking and development workflow for ChatOrbit. Creates GitHub issues, manages feature branches, and guides development through to merge.

## Trigger

Use `/bug` command followed by a description of the bug or feature.

## Workflow Steps

### Step 1: Gather Information

Ask the user for:
1. **Type**: Bug fix or Feature request
2. **Component**: Frontend / Backend / Mobile / All
3. **Title**: Short descriptive title
4. **Description**: Detailed description of the issue or feature
5. **Priority**: Critical / High / Medium / Low

### Step 2: Create GitHub Issue

Use the `gh` CLI to create an issue:

```bash
gh issue create \
  --title "[COMPONENT] Title" \
  --body "## Description

[Description from user]

## Type
- [ ] Bug fix
- [x] Feature

## Component
- [ ] Frontend
- [ ] Backend
- [ ] Mobile
- [x] All

## Priority
Medium

---
Created via /bug workflow" \
  --label "bug" \
  --assignee "@me"
```

### Step 3: Create Feature Branch

After issue is created, create a branch:

```bash
# Get the issue number from the created issue
ISSUE_NUM=$(gh issue list --limit 1 --json number --jq '.[0].number')

# Create branch name: type/issue-number-short-description
# Examples: fix/42-video-reconnect, feat/43-token-minting

git checkout master
git pull origin master
git checkout -b fix/${ISSUE_NUM}-short-description
```

### Step 4: Development Loop

Guide the user through:
1. Make code changes
2. Run tests:
   - Backend: `cd backend && pytest`
   - Frontend: `cd frontend && pnpm lint && pnpm test`
   - Mobile: `cd mobile/v2 && npx tsc --noEmit`
3. If tests fail, fix issues
4. Repeat until all tests pass

### Step 5: Commit and Push

When tests pass:

```bash
git add .
git commit -m "fix(component): description

Fixes #ISSUE_NUM

- Change 1
- Change 2

Generated with [Claude Code](https://claude.com/claude-code)"

git push -u origin fix/${ISSUE_NUM}-short-description
```

### Step 6: Create PR and Merge

```bash
gh pr create \
  --title "fix(component): description" \
  --body "## Summary
Fixes #ISSUE_NUM

## Changes
- Change 1
- Change 2

## Testing
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Mobile compiles

Generated with [Claude Code](https://claude.com/claude-code)" \
  --base master

# After review/approval
gh pr merge --squash --delete-branch
```

### Step 7: Update Version (if needed)

For significant changes, update version:

```bash
# Update VERSION file at root
# Update component versions in:
# - frontend/package.json
# - mobile/v2/app.json
# - backend/app/config.py
```

## Labels

Use these labels for issues:
- `bug` - Bug fix
- `feature` - New feature
- `frontend` - Frontend related
- `backend` - Backend related
- `mobile` - Mobile related
- `critical` - Urgent priority
- `documentation` - Docs update

## Branch Naming Convention

```
type/issue-number-short-description

Types:
- fix/    - Bug fixes
- feat/   - New features
- docs/   - Documentation
- refactor/ - Code refactoring
- test/   - Test additions
```

## Example Usage

User: `/bug Video reconnection fails after phone sleep`