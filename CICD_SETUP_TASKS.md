# CI/CD Setup — What's Left

The repository is initialized, pushed to GitHub, and CI workflows exist (`backend-ci`, `frontend-ci`, `codeql`, `deploy-dev`, `deploy-prod`). Dockerfiles exist for every backend module + the frontend.

This file lists only the parts that still need configuration — secrets and (optional) deployment servers.

---

## 1. Docker Hub credentials (required for image publishing)

If the `Backend CI/CD` or `Frontend CI/CD` workflow fails at the "Login to Docker Hub" step, these aren't set yet.

1. Sign in at https://hub.docker.com.
2. Account Settings → Security → **New Access Token** (Read & Write).
3. In the GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**:

   | Secret name | Value |
   |---|---|
   | `DOCKERHUB_USERNAME` | your Docker Hub username |
   | `DOCKERHUB_TOKEN` | the access token from step 2 |

4. Re-run the failed workflow to verify.

---

## 2. (Optional) Dev server auto-deploy

Only needed if you have a long-running dev environment that should redeploy on every push to `main`.

1. Generate a dedicated SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_dev
   ```
2. Copy the public key to the dev server:
   ```bash
   ssh-copy-id -i ~/.ssh/github_actions_dev.pub user@your-dev-server.com
   ```
3. Add GitHub secrets:

   | Secret name | Value |
   |---|---|
   | `DEV_SSH_PRIVATE_KEY` | contents of `~/.ssh/github_actions_dev` (the private key) |
   | `DEV_SSH_USER` | SSH username on the dev server |
   | `DEV_SERVER_HOST` | dev server IP or hostname |

4. On the dev server:
   ```bash
   sudo mkdir -p /opt/rigoo-marine-dev
   sudo chown $USER:$USER /opt/rigoo-marine-dev
   scp docker-compose.yml user@your-dev-server:/opt/rigoo-marine-dev/
   ```

5. Verify with a manual `docker compose up -d` once before relying on the workflow.

---

## 3. (Optional) Production deployment

When ready to ship:

1. GitHub repo → Settings → **Environments** → New environment named `production` (gives you required-reviewer protection on prod deploys).
2. Generate a separate SSH key (do **not** reuse the dev key).
3. Add the same shape of secrets, scoped to the `production` environment:

   | Secret name | Value |
   |---|---|
   | `PROD_SSH_PRIVATE_KEY` | private key contents |
   | `PROD_SSH_USER` | SSH username on prod |
   | `PROD_SERVER_HOST` | prod server IP or hostname |
   | `PROD_DOMAIN` | public domain name |

4. Production deploys are triggered by **creating a GitHub Release** (not by push to `main`).

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Workflow fails at "Login to Docker Hub" | `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` missing or wrong (regenerate the token) |
| Workflow fails at "Build with Maven" | Run `mvn clean verify -B` locally to reproduce; check the failing module's `pom.xml` |
| Workflow fails at "Build and push" | Docker Hub username in the secret doesn't match the `image:` field in the workflow, or Docker Hub storage is full |
| `docker compose up` fails on a server | Check `docker compose logs -f`; ensure ports 8080, 8761, 5432 are free; verify `.env` exists on the server |
