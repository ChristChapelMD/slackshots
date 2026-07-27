<div align="center">
<h1><img src="https://github.com/ChristChapelMD/slackshots/raw/main/public/SSLOGO_NOBG.png" width="30"/> SlackShots</h1>

**Fast, private, and intelligent file management for Slack — with search that actually understands you.**

SlackShots is a web-based application designed to be a fast, private, and intelligent file management for Slack. It aims to solve the problem of uploading and managing large numbers of files within a user's Slack workspace, which can become difficult as the volume of files grows. The application provides a dedicated interface for users to browse, search, and manage their Slack files, with a focus on speed, and privacy.

</div>

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ChristChapelMD/slackshots.git
cd slackshots
```

### 2. Install dependencies

Using npm:

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the root directory and add the following variables:

```dotenv
MONGO_URI=mongodb://localhost:27017/slackshots
MONGO_DB_NAME=slackshots
BETTER_AUTH_SECRET=replace-with-a-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_OAUTH2_V2_REDIRECT_URI=http://localhost:3000/api/slack/oauth2_v2/callback

# Optional when the database contains more than one installed workspace
SLACK_WORKSPACE_ID=your-slack-team-id

# Optional PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### 4. Start the development server

```bash
npm run dev
```

The local script enables a development-only identity and opens the dashboard
without Slack OAuth. This bypass is rejected automatically in production. An
existing Slack workspace installation and bot token are still required to read
or upload Slack files.

To test real Slack sign-in through the stable HTTPS tunnel, set `BETTER_AUTH_URL`,
`NEXT_PUBLIC_APP_URL`, and `SLACK_OAUTH2_V2_REDIRECT_URI` to the public HTTPS
origin, add these callback paths to the Slack app, then run:

- `/api/auth/callback/slack`
- `/api/slack/oauth2_v2/callback`

```bash
npm run dev:tunnel -- your-cloudflare-tunnel-name
```

Open the public HTTPS origin when using tunnel mode. Do not open the app on
localhost and send authentication to the tunnel; OAuth state cookies must stay
on one origin.

_For more examples, please refer to the [Documentation](https://slackshots.app/docs)_

## Project Structure

- **app/**: Next.js app directory with page routes
  - **(marketing)/**: Marketing/landing pages
  - **auth/**: Authentication routes
  - **docs/**: Application documentation
  - **dashboard/**: Main application dashboard
  - **api/**: API routes for the frontend
- **components/**: Reusable UI components
- **services/**: API services for data fetching
- **stores/**: Zustand stores for state management
- **hooks/**: Custom React hooks
- **lib/**: Utility functions and third-party client wrappers

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License

## Links

- [Report an Issue](https://github.com/ChristChapelMD/slackshots/issues)
- [Slack API Documentation](https://api.slack.com/docs)
