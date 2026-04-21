# {{PLAYBACK_TITLE}}

## Viewing Locally

Open `index.html` in a web browser to view this playback.

## Hosting on GitHub Pages

1. Create a new repository on GitHub named `{{SLUG}}`
2. Push this directory to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/{{SLUG}}.git
   git push -u origin main
   ```
3. Go to your repository on GitHub
4. Click **Settings** > **Pages**
5. Under "Source", select **Deploy from a branch**
6. Select the **main** branch and **/ (root)** folder
7. Click **Save**
8. Your playback will be available at `https://YOUR_USERNAME.github.io/{{SLUG}}/`

## Hosting on GitLab Pages

GitLab Pages deployment is automatic with the included `.gitlab-ci.yml` file.

1. Create a new project on GitLab named `{{SLUG}}`
2. Push this directory to the project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://gitlab.com/YOUR_USERNAME/{{SLUG}}.git
   git push -u origin main
   ```
3. GitLab will automatically build and deploy your site
4. Your playback will be available at `https://YOUR_USERNAME.gitlab.io/{{SLUG}}/`

## Embedding

To embed this playback in another web page, use this iframe snippet:

```html
<iframe
  src="https://YOUR_USERNAME.github.io/{{SLUG}}/?embed=true"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
  title="{{PLAYBACK_TITLE}}">
</iframe>
```

Replace `YOUR_USERNAME` with your actual GitHub or GitLab username.

This is a code playback created with [Storyteller](https://github.com/markm208/storyteller).
