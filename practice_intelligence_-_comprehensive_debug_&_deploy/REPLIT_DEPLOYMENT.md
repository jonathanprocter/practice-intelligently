# Replit Deployment Guide for Practice Intelligence

This guide provides step-by-step instructions for deploying and managing the Practice Intelligence application on Replit.

## 1. Initial Setup (Automated)

The project is configured to set itself up automatically when you click the **"Run"** button in Replit. The `replit-init.sh` script handles the following:

1.  **Installs Dependencies**: Runs `npm install`.
2.  **Sets Up Environment**: Copies `.env.development` to `.env` if it doesn't exist.
3.  **Initializes Database**: Creates and seeds the local SQLite database using `server/seed-database.js`.
4.  **Runs System Audit**: Verifies that all core components are working.
5.  **Starts the Server**: Launches the application using `pm2`.

**To start the application, simply click the "Run" button.**

## 2. Managing the Application with PM2

We use `pm2`, a process manager for Node.js, to keep the application running reliably.

-   **Check Status**:
    ```bash
    npx pm2 status
    ```
-   **View Logs**:
    ```bash
    npx pm2 logs
    ```
-   **Restart the Application**:
    ```bash
    npx pm2 restart practice-intelligence
    ```
-   **Stop the Application**:
    ```bash
    npx pm2 stop practice-intelligence
    ```

## 3. Environment Variables (Secrets)

For production deployment, you must configure secrets in Replit.

1.  Go to the **"Secrets"** tab in the left-hand sidebar.
2.  Add the following keys with their corresponding values:

    -   `NODE_ENV`: `production`
    -   `DATABASE_URL`: Your PostgreSQL connection string from a provider like Neon or Supabase.
    -   `SESSION_SECRET`: A long, random, and secure string.
    -   `OPENAI_API_KEY`: (Optional) Your API key for OpenAI.
    -   `ANTHROPIC_API_KEY`: (Optional) Your API key for Anthropic.

**Note**: When `NODE_ENV` is set to `production`, the application will attempt to connect to the PostgreSQL database specified in `DATABASE_URL`. For development, it defaults to the local SQLite database.

## 4. Database Migrations

When you switch to a production PostgreSQL database, you will need to run migrations to set up the schema.

```bash
npm run migrate
```

*(Note: The `migrate` script is currently a placeholder. You will need to add your migration logic, for example, using a library like `node-pg-migrate`.)*

## 5. Troubleshooting

-   **Server not starting?** Check the logs with `npx pm2 logs`. Look for errors related to missing dependencies or incorrect environment variables.
-   **Database connection issues?**
    -   For SQLite (dev), ensure the `data/therapy.db` file has the correct permissions.
    -   For PostgreSQL (prod), double-check your `DATABASE_URL` secret.
-   **"502 Bad Gateway" in Webview?** The server likely crashed. Use `npx pm2 logs` to diagnose the issue. You can try restarting it with `npx pm2 restart practice-intelligence`.

## 6. Default Login

The development database is seeded with a default user:

-   **Email**: `admin@example.com`
-   **Password**: `admin123`