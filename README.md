
# Torn RPG Dashboard

A full-stack web application for tracking Torn RPG stats, company, faction, and bazaar information.

## Running on Glitch

This project is configured to work on Glitch with minimal setup:

1. Import the project from GitHub
2. Glitch will automatically detect the package.json and install dependencies
3. The application will start using the commands specified in glitch.json

### Important Notes for Glitch

- If you encounter "npm command not found" errors, edit your .env file in Glitch and add:
  ```
  NPM_PATH=/opt/nvm/versions/node/v16/bin/npm
  NODE=/opt/nvm/versions/node/v16/bin/node
  ```
- The application runs on port 5000 internally, but Glitch will handle port mapping for you
- Use the Glitch .env editor to set any environment variables your app needs
- If the app still doesn't start, try manually running `refresh` in the Glitch terminal
