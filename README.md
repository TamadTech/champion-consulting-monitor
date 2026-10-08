# Champion Consulting availability monitor

This repository checks only the public production endpoints for Champion Consulting. It contains no application source, credentials, database exports, or customer records.

## Checks

- **Champion runtime error alerts:** checks the durable server-error health signal every 15 minutes.
- **Champion production availability:** checks ten public routes and anonymous-access boundaries hourly.
- Failed checks open a deduplicated issue mentioning @TamadTech. A successful recovery check closes its incident issue. Scheduled execution can be delayed.
- An optional manual availability drill creates a clearly labeled test issue without disrupting production.

The runtime signal is acknowledged only after review using the private application's operations runbook. Closing a GitHub issue does not acknowledge server errors.

## Published information

Public hostname and endpoint paths, sanitized HTTP results, timestamps, public deployment release SHA, configuration-presence flags, and failure/recovery issues. The scripts do not print raw upstream bodies or error details. They do not sign in, create customers, send customer email, process payments, or modify the application.

## Permissions and cost

Each workflow uses the automatic repository GITHUB_TOKEN for contents read and issues write in this repository only. No application secrets are required. Actions are pinned to full commit IDs; no dependencies, caches or artifacts are installed or uploaded.

Standard GitHub-hosted runners in public repositories are free under GitHub's documented billing policy:
https://docs.github.com/en/billing/concepts/product-billing/github-actions

Do not switch to paid larger runners or increase spending limits. Scheduled workflows in inactive public repositories can be disabled after 60 days. Review activity and GitHub notifications regularly. This is periodic monitoring, not immediate paging or an uptime SLA.

## Validation

Run `npm test` with Node 22.13+; no dependency installation is required.
Manual and scheduled check results appear in Actions. Confirm actual alert receipt after setup. Availability success does not establish email delivery, live payment activation, backup restoration, physical-device acceptance, or complete customer launch readiness.
