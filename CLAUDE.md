# Galaxy Simulation - galaxy.opkit.app

## Server SSH Connection
- **IP:** 62.169.21.242 (Contabo VPS)
- **User:** root
- **SSH Key:** ~/.ssh/resurrect

```bash
ssh -i ~/.ssh/resurrect root@62.169.21.242
```

## GitHub Repository
https://github.com/kalista78/galaxy-simulation

## Server Paths
- **Website files:** `/root/galaxy/`
- **Docker compose:** `/opt/stacks/galaxy/docker-compose.yml`
- **Container:** `galaxy-frontend` (nginx:alpine)

## Deployment Workflow
1. Make changes locally
2. Commit and push to GitHub
3. SSH to server and pull:
   ```bash
   ssh -i ~/.ssh/resurrect root@62.169.21.242 "cd /root/galaxy && git pull"
   ```

Or one-liner deploy:
```bash
git push && ssh -i ~/.ssh/resurrect root@62.169.21.242 "cd /root/galaxy && git pull"
```
