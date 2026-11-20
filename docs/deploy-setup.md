# Keyless deploy setup (Workload Identity Federation)

GitHub Actions deploys Present to Firebase **without any stored key**. Google
is told to trust one thing only: a workflow run from the repository
`krp12345/Present` (matched by its permanent numeric id, `1366601975`, owner id
`20662495`) on the `main` branch. Each run gets a credential that expires
within the hour.

Everything here is free and needs no card or billing account.

## 1. Run the setup script in Cloud Shell

1. Open https://console.cloud.google.com and, in the project picker at the
   top, select your Firebase project.
   If a banner offers a **free trial** or asks you to **activate billing**,
   ignore it: that is the step that asks for a card.
2. Click the **Activate Cloud Shell** icon (`>_`, top right). A terminal opens
   at the bottom of the page. Cloud Shell is free.
3. Paste the script below. **Change only the first line** to your project id
   (Firebase console → gear → Project settings → Project ID), then press Enter.
   If Cloud Shell asks to authorize, click **Authorize**.

```bash
PROJECT_ID="your-project-id"

gcloud config set project "$PROJECT_ID"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
REPO_ID="1366601975"        # krp12345/Present
OWNER_ID="20662495"         # krp12345
SA="github-deploy@${PROJECT_ID}.iam.gserviceaccount.com"
POOL="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github"

# APIs the deploy and the keyless sign-in use (all free).
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com \
  firebase.googleapis.com firebasehosting.googleapis.com \
  firestore.googleapis.com firebaserules.googleapis.com

# The account GitHub acts as, with only deploy permissions.
gcloud iam service-accounts create github-deploy --display-name="GitHub deploy (Present)"
for ROLE in roles/firebase.admin roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${SA}" \
    --role="$ROLE" --condition=None --quiet >/dev/null
done

# Trust GitHub's tokens, but only from this repository's main branch.
gcloud iam workload-identity-pools create github --location=global \
  --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc present-repo --location=global \
  --workload-identity-pool=github --display-name="krp12345/Present main" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.ref=assertion.ref" \
  --attribute-condition="assertion.repository_id=='${REPO_ID}' && assertion.repository_owner_id=='${OWNER_ID}' && assertion.ref=='refs/heads/main'"

# Let only that repository act as the deploy account.
gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL}/attribute.repository_id/${REPO_ID}" >/dev/null

echo
echo "Done. Add these three repository VARIABLES in GitHub:"
echo "  FIREBASE_PROJECT_ID             = ${PROJECT_ID}"
echo "  GCP_WORKLOAD_IDENTITY_PROVIDER  = ${POOL}/providers/present-repo"
echo "  GCP_SERVICE_ACCOUNT             = ${SA}"
```

If a step fails because something already exists (for example you ran the
script twice), that part is already done; it is safe to continue.

## 2. Add the three variables in GitHub

https://github.com/krp12345/Present → **Settings → Secrets and variables →
Actions → Variables** tab → **New repository variable**, three times, with the
names and values the script printed.

These are **variables, not secrets**: they only name your project and
account. Without GitHub's signed token from this repository's `main` branch,
they grant nothing.

No secrets are needed. If you created a `FIREBASE_SERVICE_ACCOUNT` secret or
downloaded a JSON key earlier, delete both (GitHub secret, and the key under
Cloud console → IAM & Admin → Service accounts → github-deploy → Keys).

## 3. Deploy

Once the workflow is on `main`: **Actions → Deploy to Firebase → Run
workflow** (branch `main`).

## Revoking

Any of these stops GitHub from deploying, immediately:

- Cloud console → IAM & Admin → **Workload Identity Federation** → disable or
  delete the `github` pool.
- Delete the `github-deploy` service account.
