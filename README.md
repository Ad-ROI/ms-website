# MindStream.ing Website — Custom Code

This repo tracks all custom code for the MindStream.ing WordPress site hosted on LiquidWeb (adroisites.com).

## Structure

```
ms-website/
├── local-source/          # All local dev files (synced from G: drive)
│   ├── autopilot.html     # Autopilot page HTML mockup
│   ├── brain-section-new.html
│   ├── what-you-get-mockup/index.html
│   ├── ms-autopilot-page.php
│   ├── ms-responsive-fix.php
│   ├── ms-taskhitlist-page.php
│   └── ...
├── server/
│   ├── mu-plugins/        # Must-use plugins from LiquidWeb (pull needed — see below)
│   └── public_html/       # Custom templates from LiquidWeb (pull needed — see below)
└── README.md
```

## LiquidWeb Server Files — ACTION REQUIRED

The following files need to be pulled from the LiquidWeb server and committed here:

**Server:** adroisites.com (WHM: host.1dash.pro:2087)
**Account:** mindstream

### Files to pull:
- `/home/mindstream/public_html/wp-content/mu-plugins/` (entire directory)
- `/home/mindstream/public_html/ms-home-tpl.php`
- `/home/mindstream/public_html/mockup-home.html`
- Any `ms-*.php` files in `/home/mindstream/public_html/`

### How to pull (once WHM token is stored in Secret Manager):
```bash
# Via WHM File Manager API or SSH
# Secret: liquidweb-whm-token (currently placeholder — needs real token)
# Secret: liquidweb-ssh-password (currently placeholder — needs real password)
```

To complete: store the real WHM API token in GCP Secret Manager secret `liquidweb-whm-token`, then re-run the pull script.

## Auth

- **GitHub PAT:** `GitHub-PAT` in GCP Secret Manager (project: mindstream-486223)
- **WHM token:** `liquidweb-whm-token` (⚠️ placeholder — needs real value)
- **SSH password:** `liquidweb-ssh-password` (⚠️ placeholder — needs real value)
