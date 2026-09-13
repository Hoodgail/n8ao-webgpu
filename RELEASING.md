# Releasing

## Verify the package

```sh
npm ci
npm run check
python -m pip install -r requirements-test.txt
python -m playwright install chromium
npm run test:browser
npm pack
```


## GitHub Pages

In the fork's Settings → Pages, select **GitHub Actions** as the source. The Pages workflow builds the documentation and examples from the default branch. It can also be started manually. The expected URL is https://hoodgail.github.io/n8ao-webgpu/.

## npm

The package name is `three-n8ao-webgpu` and access is public. Publishing requires permission to the `@hoodgail` scope.

For a first release, authenticate with npm and publish the verified tarball:

```sh
npm login
npm publish ./hoodgail-three-n8ao-webgpu-1.0.1.tgz --access public
```

For subsequent releases, configure an npm trusted publisher for `Hoodgail/n8ao-webgpu`, workflow `publish.yml`, environment `npm`. Protect that GitHub environment with a required reviewer. The workflow runs only after a GitHub release is published and checks that the tag matches `package.json`. It uses OIDC and does not require a stored npm token.

Before creating a release, update the version and lockfile, describe changes in CHANGELOG.md, and verify the browser suite. Use tags such as `v1.0.1`. Publishing a version to npm is permanent; do not publish an unverified build.
