#!/bin/bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  echo "Git is not installed in this environment." >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This directory is not a Git repository." >&2
  exit 1
fi

REMOTE_URL=${REPLIT_GIT_REMOTE:-"https://github.com/jonathanprocter/practice-intelligence_clients.git"}
DEFAULT_BRANCH=${REPLIT_GIT_BRANCH:-"main"}

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Configuring origin remote to $REMOTE_URL"
  git remote add origin "$REMOTE_URL"
else
  current_remote=$(git remote get-url origin)
  echo "Origin remote already set to $current_remote"
fi

if [[ -n "${REPLIT_GIT_USER_NAME:-}" ]]; then
  git config user.name "$REPLIT_GIT_USER_NAME"
  echo "Configured git user.name to $REPLIT_GIT_USER_NAME"
fi

if [[ -n "${REPLIT_GIT_USER_EMAIL:-}" ]]; then
  git config user.email "$REPLIT_GIT_USER_EMAIL"
  echo "Configured git user.email to $REPLIT_GIT_USER_EMAIL"
fi

echo "Fetching from origin..."
if git fetch origin --prune; then
  echo "Fetch completed."
else
  echo "Fetch failed. Ensure network connectivity or credentials for private repositories." >&2
fi

CURRENT_BRANCH=$(git branch --show-current)
if [[ -z "$CURRENT_BRANCH" ]]; then
  echo "No branch checked out. Checking out $DEFAULT_BRANCH"
  git checkout "$DEFAULT_BRANCH" || true
fi

echo
echo "✅ Git is configured for Replit. Use the commands below to sync changes:"
echo "   git pull origin ${CURRENT_BRANCH:-$DEFAULT_BRANCH}  # Fetch latest changes"
echo "   git push origin ${CURRENT_BRANCH:-$DEFAULT_BRANCH}  # Push your work (requires a GitHub token)"
