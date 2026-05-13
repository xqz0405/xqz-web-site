#!/bin/bash
set -e

cd "$(git rev-parse --show-toplevel)"

echo "Updating submodule..."
git submodule update --remote xqz-web

CHANGED=$(git diff --name-only xqz-web)
if [ -z "$CHANGED" ]; then
  echo "No new commits in submodule, nothing to do."
  exit 0
fi

echo "New commits detected, committing and pushing..."
git add xqz-web
git commit -m "chore: update submodule xqz-web"
git push

echo "Done! CI/CD will rebuild and deploy."
