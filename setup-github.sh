#!/bin/bash
# Script to connect local repo to GitHub
# Replace YOUR_USERNAME with your actual GitHub username

echo "Enter your GitHub username:"
read GITHUB_USERNAME

echo "Enter your repository name (default: youtube):"
read REPO_NAME
REPO_NAME=${REPO_NAME:-youtube}

echo "Setting up remote..."
git remote add origin https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git

echo "Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "Done! Your repository is now on GitHub."
echo "Next steps:"
echo "1. Go to https://github.com/${GITHUB_USERNAME}/${REPO_NAME}/settings/secrets/actions"
echo "2. Add the required secrets (see README.md)"

