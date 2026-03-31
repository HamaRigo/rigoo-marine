# CI/CD Setup - Step by Step Tasks

## Phase 1: Initialize Git Repository

- [ ] 1. Open terminal in the project root (`/Users/hammarigo/Desktop/Rigoomarine`)
- [ ] 2. Run `git init` to initialize git repository
- [ ] 3. Run `git add .` to stage all files
- [ ] 4. Run `git commit -m "Initial commit with CI/CD pipeline"`
- [ ] 5. Create a new repository on GitHub (do not initialize with README)
- [ ] 6. Run `git branch -M main` to rename branch
- [ ] 7. Run `git remote add origin <your-github-repo-url>`
- [ ] 8. Run `git push -u origin main` to push code

---

## Phase 2: Create Docker Hub Account

- [ ] 1. Go to https://hub.docker.com and sign up/login
- [ ] 2. Remember your Docker Hub username
- [ ] 3. Go to Account Settings → Security → Access Tokens
- [ ] 4. Click "New Access Token"
- [ ] 5. Give it a name (e.g., "GitHub Actions CI")
- [ ] 6. Select "Read & Write" permissions
- [ ] 7. Copy the generated token (save it securely)

---

## Phase 3: Configure GitHub Secrets

- [ ] 1. Go to your GitHub repository
- [ ] 2. Click **Settings** tab
- [ ] 3. In left sidebar, click **Secrets and variables** → **Actions**
- [ ] 4. Click **New repository secret**
- [ ] 5. Add these secrets one by one:

| Secret Name | Value |
|-------------|-------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | The token you just created |

- [ ] 6. Click "Add secret" for each

---

## Phase 4: Verify Dockerfiles Exist

- [ ] 1. Check that all Dockerfiles exist:
  - `rigoo-marine-backend/gateway-module/Dockerfile`
  - `rigoo-marine-backend/client-module/Dockerfile`
  - `rigoo-marine-backend/vessel-module/Dockerfile`
  - `rigoo-marine-backend/service-module/Dockerfile`
  - `rigoo-marine-backend/work-order-module/Dockerfile`
  - `rigoo-marine-backend/technician-module/Dockerfile`
  - `rigoo-marine-backend/invoice-module/Dockerfile`
  - `rigoo-marine-backend/notification-module/Dockerfile`
  - `rigoo-marine-backend/discovery-service/Dockerfile`
  - `rigoo-marine-frontend/Dockerfile`

---

## Phase 5: Test Local Build (Optional but Recommended)

- [ ] 1. Run `cd rigoo-marine-backend`
- [ ] 2. Run `mvn clean verify -B` to test backend build
- [ ] 3. Run `cd ../rigoo-marine-frontend`
- [ ] 4. Run `npm install` (if not already done)
- [ ] 5. Run `npm run build` to test frontend build

---

## Phase 6: Push and Trigger CI/CD

- [ ] 1. Push your code to GitHub (if not done in Phase 1)
- [ ] 2. Go to GitHub repository → **Actions** tab
- [ ] 3. You should see workflows running (Backend CI/CD, Frontend CI/CD)
- [ ] 4. Wait for builds to complete (green checkmark)
- [ ] 5. Check Docker Hub to see images being pushed

---

## Phase 7: (Optional) Set Up Development Server Deployment

If you have a server for development:

- [ ] 1. Generate SSH key for GitHub Actions:
  ```bash
  ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_dev
  ```
- [ ] 2. Copy public key to your dev server:
  ```bash
  ssh-copy-id -i ~/.ssh/github_actions_dev.pub user@your-dev-server.com
  ```
- [ ] 3. Add GitHub secrets:
  - `DEV_SSH_PRIVATE_KEY` - contents of `~/.ssh/github_actions_dev`
  - `DEV_SSH_USER` - SSH username on dev server
  - `DEV_SERVER_HOST` - dev server IP or hostname

- [ ] 4. On your dev server, create deployment directory:
  ```bash
  sudo mkdir -p /opt/rigoo-marine-dev
  sudo chown $USER:$USER /opt/rigoo-marine-dev
  ```

- [ ] 5. Copy `docker-compose.yml` to the server and test:
  ```bash
  scp docker-compose.yml user@your-dev-server:/opt/rigoo-marine-dev/
  ssh user@your-dev-server
  cd /opt/rigoo-marine-dev
  docker compose up -d
  ```

---

## Phase 8: (Optional) Set Up Production Deployment

When ready for production:

- [ ] 1. Create production environment in GitHub:
  - Go to Settings → Environments → New environment
  - Name it "production"
  - Add required secrets

- [ ] 2. Generate separate SSH key for production

- [ ] 3. Add production secrets:
  - `PROD_SSH_PRIVATE_KEY`
  - `PROD_SSH_USER`
  - `PROD_SERVER_HOST`
  - `PROD_DOMAIN`

---

## Checklist Summary

| Phase | Task | Status |
|-------|------|--------|
| 1 | Git repository initialized | [ ] |
| 1 | Code pushed to GitHub main branch | [ ] |
| 2 | Docker Hub account created | [ ] |
| 2 | Docker Hub access token generated | [ ] |
| 3 | GitHub secrets configured | [ ] |
| 4 | All Dockerfiles verified | [ ] |
| 5 | Local build tested (optional) | [ ] |
| 6 | CI/CD workflows running | [ ] |
| 7 | Dev server configured (optional) | [ ] |
| 8 | Prod server configured (optional) | [ ] |

---

## Troubleshooting

### Workflow fails at "Login to Docker Hub"
- Check that `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets are correct
- Regenerate Docker Hub token if needed

### Workflow fails at "Build with Maven"
- Check that `pom.xml` files are correct
- Run `mvn clean verify -B` locally to see detailed errors

### Workflow fails at "Build and push"
- Ensure Docker Hub username in secrets matches the one in workflow
- Check Docker Hub account has available storage

### Services don't start with docker-compose
- Check logs: `docker compose logs -f`
- Ensure ports 8080, 8761, 5432 are not in use
- Check `.env` file exists with correct values

---

## Next Steps After Setup

1. Create a `develop` branch for ongoing development:
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

2. Make changes and push to `develop` for auto-deployment

3. When ready, create a Pull Request to `main`

4. After merging to `main`, create a GitHub Release for production deployment
