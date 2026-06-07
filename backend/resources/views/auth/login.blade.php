<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Superadmin Login - Faction Panel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #030712;
            --surface: rgba(17, 24, 39, 0.7);
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --text: #f3f4f6;
            --text-muted: #9ca3af;
            --border: rgba(255, 255, 255, 0.08);
            --error-bg: rgba(239, 68, 68, 0.1);
            --error-border: rgba(239, 68, 68, 0.3);
            --error-text: #f87171;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg);
            background-image: 
                radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
                radial-gradient(at 100% 100%, rgba(147, 51, 234, 0.1) 0px, transparent 50%);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* Subtle glowing orb in background */
        .orb {
            position: absolute;
            width: 300px;
            height: 300px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
            top: 25%;
            left: 20%;
            z-index: 0;
            pointer-events: none;
            filter: blur(40px);
        }

        .login-container {
            width: 100%;
            max-width: 440px;
            padding: 2.5rem;
            background: var(--surface);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 
                        inset 0 1px 1px rgba(255, 255, 255, 0.05);
            z-index: 10;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .header {
            text-align: center;
            margin-bottom: 2rem;
        }

        .logo {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, var(--accent), #8b5cf6);
            border-radius: 16px;
            margin: 0 auto 1.25rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .logo svg {
            width: 28px;
            height: 28px;
            fill: none;
            stroke: white;
            stroke-width: 2;
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 800;
            letter-spacing: -0.025em;
            margin-bottom: 0.375rem;
            background: linear-gradient(to right, #ffffff, #e5e7eb);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            color: var(--text-muted);
            font-size: 0.875rem;
            font-weight: 500;
        }

        .error-alert {
            background: var(--error-bg);
            border: 1px solid var(--error-border);
            color: var(--error-text);
            padding: 0.875rem 1rem;
            border-radius: 12px;
            font-size: 0.8125rem;
            margin-bottom: 1.5rem;
            line-height: 1.4;
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
        }

        .error-alert svg {
            flex-shrink: 0;
            width: 16px;
            height: 16px;
            margin-top: 1px;
        }

        .form-group {
            margin-bottom: 1.25rem;
        }

        label {
            display: block;
            font-size: 0.8125rem;
            font-weight: 600;
            color: #d1d5db;
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .input-wrapper {
            position: relative;
        }

        .input-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
            display: flex;
            align-items: center;
        }

        .input-icon svg {
            width: 18px;
            height: 18px;
            stroke: currentColor;
            stroke-width: 2;
            fill: none;
        }

        input[type="text"],
        input[type="password"] {
            width: 100%;
            padding: 0.875rem 1rem 0.875rem 2.75rem;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text);
            font-family: inherit;
            font-size: 0.9375rem;
            outline: none;
            transition: all 0.2s ease;
        }

        input[type="text"]:focus,
        input[type="password"]:focus {
            border-color: var(--accent);
            background: rgba(255, 255, 255, 0.04);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
        }

        .options-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 1.25rem;
            margin-bottom: 1.75rem;
        }

        .checkbox-container {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
            font-size: 0.8125rem;
            color: var(--text-muted);
            user-select: none;
        }

        .checkbox-container input {
            cursor: pointer;
            width: 16px;
            height: 16px;
            accent-color: var(--accent);
        }

        .btn-submit {
            width: 100%;
            background: linear-gradient(135deg, var(--accent), #4f46e5);
            color: white;
            padding: 0.875rem;
            border: none;
            border-radius: 12px;
            font-size: 0.875rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(59, 130, 246, 0.35);
            filter: brightness(1.05);
        }

        .btn-submit:active {
            transform: translateY(1px);
        }

        .footer {
            margin-top: 2rem;
            text-align: center;
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .footer a {
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
        }

        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="orb"></div>
    <div class="login-container">
        <div class="header">
            <div class="logo">
                <svg viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            </div>
            <h1>Superadmin Access</h1>
            <div class="subtitle">Enter credentials to monitor server performance</div>
        </div>

        @if ($errors->any())
            <div class="error-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{{ $errors->first() }}</span>
            </div>
        @endif

        <form action="/admin/login" method="POST">
            @csrf
            <div class="form-group">
                <label for="username">Username</label>
                <div class="input-wrapper">
                    <div class="input-icon">
                        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <input type="text" id="username" name="username" value="{{ old('username') }}" placeholder="Enter username" required autofocus autocomplete="username">
                </div>
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <div class="input-wrapper">
                    <div class="input-icon">
                        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <input type="password" id="password" name="password" placeholder="Enter password" required autocomplete="current-password">
                </div>
            </div>

            <div class="options-row">
                <label class="checkbox-container">
                    <input type="checkbox" name="remember" id="remember">
                    <span>Keep me logged in</span>
                </label>
            </div>

            <button type="submit" class="btn-submit">Sign In</button>
        </form>

        <div class="footer">
            &copy; {{ date('Y') }} Faction Panel &bull; <a href="/">Back to App</a>
        </div>
    </div>
</body>
</html>
