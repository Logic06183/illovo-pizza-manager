# Git Worktrees Guide - Parallel Development

## What Are Git Worktrees?

Git worktrees allow you to work on multiple branches simultaneously without switching back and forth. Each worktree is a separate working directory linked to the same git repository.

## Your Current Setup

### Main Development (Production)
**Location:** `illovo-pizza-manager/`
**Branch:** `main`
**Use for:** Stable code, hotfixes, production deployments

### Feature Development
**Location:** `illovo-feature-1/`
**Branch:** `feature/new-feature`
**Use for:** New features, experiments, breaking changes

## How to Use Worktrees

### Working in Different Directories

```bash
# Work on main branch (stable)
cd "illovo-pizza-manager"
# Make changes, commit, push to main

# Work on new feature (in parallel)
cd "../illovo-feature-1"
# Make changes, commit, push to feature/new-feature
```

### Creating More Worktrees

```bash
# From the main directory
cd "illovo-pizza-manager"

# Create a new worktree for another feature
git worktree add ../illovo-feature-2 -b feature/another-feature

# Create a worktree for a bugfix
git worktree add ../illovo-bugfix-1 -b bugfix/fix-search
```

### Listing All Worktrees

```bash
git worktree list
```

### Removing a Worktree (When Done)

```bash
# First, merge your feature branch if needed
cd "illovo-pizza-manager"
git checkout main
git merge feature/new-feature
git push

# Then remove the worktree
git worktree remove ../illovo-feature-1

# Delete the branch (optional)
git branch -d feature/new-feature
```

## Workflow Example

### Scenario: Work on main dashboard while testing new stats feature

1. **Main dashboard work:**
```bash
cd "illovo-pizza-manager"
# Edit app.js
git add app.js
git commit -m "Fix order sorting bug"
git push
```

2. **New stats feature (in parallel):**
```bash
cd "../illovo-feature-1"
# Edit stats-styles.css, add new chart
git add .
git commit -m "Add weekly sales chart"
git push -u origin feature/new-feature
```

3. **Testing locally:**
- Open `illovo-pizza-manager/index.html` in browser → Production version
- Open `illovo-feature-1/index.html` in another tab → New feature version

4. **When feature is ready:**
```bash
cd "illovo-pizza-manager"
git checkout main
git merge feature/new-feature
git push

# Create pull request on GitHub (optional but recommended)
gh pr create --base main --head feature/new-feature
```

## Benefits

✅ **Work on multiple features simultaneously** - No branch switching
✅ **Test both versions side-by-side** - Open both in different browser tabs
✅ **No conflicts** - Each worktree has its own files
✅ **Faster development** - No need to stash changes
✅ **Easy comparison** - See differences between directories

## Best Practices

1. **Keep main worktree stable** - Only tested, working code
2. **Use feature branches for experiments** - Break things in feature worktrees
3. **Regularly pull from main** - Keep feature branches up to date
4. **Clean up old worktrees** - Remove when features are merged
5. **Use descriptive branch names** - `feature/add-auth`, `bugfix/fix-timer`

## Common Commands

```bash
# List all worktrees
git worktree list

# Create new worktree
git worktree add <path> -b <branch-name>

# Remove worktree
git worktree remove <path>

# Move to different worktree
cd <path>

# Check current branch
git branch --show-current

# Pull latest from main (while in feature branch)
git pull origin main
```

## Your Current Worktrees

Run `git worktree list` to see:
- `/Users/craig/.../illovo-pizza-manager` → main
- `/Users/craig/.../illovo-feature-1` → feature/new-feature

## Firebase Testing Note

Both worktrees connect to the same Firebase project (`pizza-illovo-dashboard`), so be careful when testing:
- Changes to Firestore data affect both
- Changes to Firestore rules affect both
- Consider using different Firebase projects for feature testing if needed

---

**Quick Start:**
```bash
# Main work
cd "illovo-pizza-manager"

# Feature work
cd "../illovo-feature-1"
```
