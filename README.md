# TSX Gym Form Automation

This project automates the submission of gym booking forms for TSX using GitHub Actions.

## 🔧 Setup Instructions

### 1. Fork or Clone the Repository

First, fork this repository to your own GitHub account or clone it locally.

### 2. Set up GitHub Secrets

To run the GitHub Action, you need to configure the following secrets in your repository:

#### How to Add Secrets:

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret listed below

#### Required Secrets:

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `NAME` | Your full name for the booking form | `John Doe` |
| `EMAIL` | Your email address | `john.doe@company.com` |
| `COMPANY` | Your company name | `Acme Corp` |
| `PHONE` | Your phone number | `12345678` |
| `TSX_URL` | The actual TSX form URL | `https://docs.google.com/forms/d/e/.../formResponse` |
| `MOCK_URL` | URL for testing (optional) | `https://docs.google.com/forms/d/e/.../formResponse` |

#### Finding the Form URL:

To get the correct `TSX_URL`:

1. Open the TSX booking form in your browser
2. Copy the unique form id from the URL after `/forms/d/e/` and before the next `/`
3. Replace `...` with your unique form id `https://docs.google.com/forms/d/e/.../formResponse`
4. Add this URL to your GitHub secret as `TSX_URL`

### 3. Running the Action

#### Manual Trigger:
**Note: The script only books weekdays from next week, not the current week**

1. Go to the **Actions** tab in your repository
2. Click on **Call Submit Form** workflow
3. Click **Run workflow**
4. Optionally specify days (1=Monday, 2=Tuesday, etc.)
   - Example: `1 3 5` for Monday, Wednesday, Friday
   - Leave empty to book all weekdays
5. Click **Run workflow**

### Logs and Debugging:

- Check the Actions tab for detailed logs
- Review the Python script output in the action logs

## 📝 Local Development

For local testing:

1. Copy `.env.example` to `.env`
2. Fill in your actual values
3. Install dependencies: `pip install -r requirements.txt`
4. Run: `python submit_form.py`