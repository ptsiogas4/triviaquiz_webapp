# AGENTS.md: Xerolas web hosting (build output only)

This repo (public, `ptsiogas4/triviaquiz_webapp`) holds only the **built** Kotlin/Wasm bundle of the Xerolas trivia app,
served by Firebase Hosting. There is no source code here: never edit files in `kserolas/` by hand.
Source of the web app: KMP repo `ptsiogas4/triviaquiz`, source set `composeApp/src/wasmJsMain` (+ shared `commonMain`).
Product, UI or logic changes go there, not here.

## Layout
- `kserolas/`: Firebase Hosting public dir. `index.html` loads `composeApp.js`, which loads the hashed `*.wasm` files.
  `composeResources/` holds bundled fonts, images, strings and question JSON copied from the KMP build.
- `firebase.json`: hosting config (public `kserolas`, SPA rewrite to `/index.html`). `.firebaserc`: project `trivialquiz-c9f60`.
- `.firebase/`: local deploy cache, ignored.

## How the bundle is produced (in the KMP repo)
1. `export JAVA_HOME=$(/usr/libexec/java_home -v 17)` (Gradle 8.9 fails on newer JDKs).
2. `./gradlew :composeApp:wasmJsBrowserDistribution`
3. Output: `composeApp/build/dist/wasmJs/productionExecutable/`.
4. Replace the whole contents of `kserolas/` with that folder (delete old hashed `*.wasm` first; stale ones pile up today),
   and copy `composeApp/app-ads.txt` to `kserolas/app-ads.txt` (AdMob verification; currently missing here).
5. Commit on a branch (`build: web bundle <version>`), open a PR. The version lives in KMP `composeApp/src/commonMain/kotlin/Version.kt`.

## Deploy
- Firebase Hosting, free Spark plan only. Command (for a human, after approval): `firebase deploy --only hosting`.
- **Never deploy without explicit board approval.** Agents must not run `firebase deploy`, `firebase hosting:*`
  or the KMP `deployWasmToFirebase` task, and must not change the Firebase plan or project.
- Local preview is free: `npx serve kserolas` or `firebase serve --only hosting` (no deploy).

## Rules for agents
- Do not read `*.wasm`, `*.js.map`, `composeApp.js` or `kserolas/composeResources/**` (MBs of generated output); see `.claudeignore`.
  To inspect a build, use `ls -la kserolas` and `head -c 400 kserolas/index.html`.
- Never commit secrets. This repo is public.
- GitHub account `ptsiogas4`: `GH_TOKEN=$(gh auth token -u ptsiogas4) gh ...`. Feature branch, push, PR against `main`
  ready for review. Never push to main, merge, or force-push.
- Never spend money. Never use the em dash character.
