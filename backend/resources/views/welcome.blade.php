<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faction Panel API</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #0a0a0a;
            --surface: #141414;
            --accent: #3b82f6;
            --text: #ffffff;
            --text-muted: #a1a1aa;
            --border: rgba(255, 255, 255, 0.1);
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            text-align: center;
            overflow: hidden;
        }

        .container {
            max-width: 600px;
            padding: 2rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo {
            width: 64px;
            height: 64px;
            background: var(--accent);
            border-radius: 16px;
            margin: 0 auto 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        .logo svg {
            width: 32px;
            height: 32px;
            fill: white;
        }

        h1 {
            font-size: 2rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: -0.05em;
            margin-bottom: 0.5rem;
            font-style: italic;
        }

        p {
            color: var(--text-muted);
            font-size: 0.9rem;
            line-height: 1.6;
            margin-bottom: 2rem;
            font-weight: 500;
        }

        .btn {
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            background: var(--accent);
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 900;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            transition: all 0.2s ease;
            box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.4);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4);
            filter: brightness(1.1);
        }

        .footer {
            margin-top: 2rem;
            font-size: 0.7rem;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            color: var(--text-muted);
            opacity: 0.5;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
        </div>
        <h1>Faction Panel API</h1>
        <p>
            You have reached the backend API service for Faction Panel. 
            This layer handles data processing, security, and integration 
            for the management platform.
        </p>
        <a href="/" class="btn" id="app-link">
            <span>Return to Application</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        </a>
        <div class="footer">
            &copy; {{ date('Y') }} Faction Panel Service
        </div>
    </div>

    <script>
        // Determine the app URL based on current host
        // If we're on api.example.com, the app might be on example.com
        // If we're on example.com/api (unlikely here), the app is at /
        const currentHost = window.location.hostname;
        const appLink = document.getElementById('app-link');
        
        if (currentHost.startsWith('api.')) {
            const domain = currentHost.split('.').slice(1).join('.');
            const protocol = window.location.protocol;
            appLink.href = `${protocol}//${domain}`;
        } else {
            // Default to root if not a subdomain setup
            appLink.href = '/';
        }
    </script>
</body>
</html>
