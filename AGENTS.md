# DoneYet? Agent Notes

This file applies to the repository root and everything under it.

## Project basics

- This is an Expo React Native app that uses Expo Router.
- The native iOS debug entrypoint is `npm run ios`, which calls `scripts/run-native-ios.mjs`.
- App data is local-first and stored with SQLite.

## Release basics

- Expo/EAS metadata is already linked for this app. Keep `expo.owner` and `expo.extra.eas.projectId` in `app.json` unless you are intentionally relinking the project in Expo.
- Release image assets referenced by `app.json` should stay PNG-based. If you replace the app icon, update `expo.icon`, `expo.splash.image`, and `expo.android.adaptiveIcon.foregroundImage` together.
- The iOS release identity currently comes from the native Xcode project:
  - Apple team: `9LYL5R6LS4`
  - native bundle identifier: `com.doneyet.appios`
  - App Store Connect app id: `6761344539`
- `app.json` currently still declares `com.doneyet.app` for Expo iOS/Android config. Treat that mismatch with the native iOS bundle identifier as intentional debt unless you are explicitly fixing release identifiers. Do not change only one side without understanding the store impact.
- Every TestFlight upload must use a strictly higher iOS build number than the last uploaded build. Update `CFBundleVersion` in `ios/DoneYet/Info.plist` and `CURRENT_PROJECT_VERSION` in `ios/DoneYet.xcodeproj/project.pbxproj` together.

## TestFlight workflow

- `npm run ios` is only the local debug path. It is not the release path for TestFlight.
- `eas.json` is configured for this project, but unattended `eas build` / `eas submit` can still fall back to interactive Apple login. If that blocks publishing, prefer the local Xcode archive/export/upload flow instead of forcing a half-configured EAS path.
- Keep App Store Connect API key material outside the repo. Read the key path and related metadata from `eas.json` or secure local config; never commit the `.p8` contents.
- The reliable local release flow is:
  - archive with `xcodebuild` from `ios/DoneYet.xcworkspace`, scheme `DoneYet`, configuration `Release`, destination `generic/platform=iOS`, plus `-allowProvisioningUpdates` and App Store Connect auth key arguments
  - export with `xcodebuild -exportArchive` using `method=app-store-connect` and `signingStyle=automatic`
  - upload the exported IPA with `xcrun altool --upload-app --wait`
- A successful upload does not mean App Store Connect processing is finished. Expect a short delay before the new build appears in TestFlight or the builds API.

## iOS launch behavior

- Do not assume `npm run ios` should prefer a simulator.
- In this repo, when a physical iPhone is connected, the default target should be the physical device.
- Explicit target selection still matters:
  - `--device` should target a physical device.
  - `--simulator` should target a simulator.
  - `IOS_DEVICE_NAME` should act as a preferred launch target override.
- Host mode must stay aligned with the target kind:
  - physical device => `lan`
  - simulator => `localhost`
  - `IOS_METRO_HOST_MODE` can override this when needed

## Cold-start regression to avoid

- A previous bug caused the app to show an error on first launch and only recover after tapping "Reload JS".
- The root cause was launching the native app as soon as Metro `/status` returned `packager-status:running`.
- That was too early: the real Expo iOS bundle was not always compiled yet.
- If you change the iOS launcher, keep this invariant:
  - wait for Metro status
  - then wait for `/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true&minify=false`
  - only proceed once that bundle responds with HTTP 200 and its body has been consumed
- If bundle readiness fails, prefer a clear terminal error over opening the app into a recoverable red screen.

## Script invariants

- `scripts/ios-metro-host.mjs` must keep simulator objects normalized with `kind: 'simulator'`.
- If that `kind` is missing, target selection and host-mode resolution can silently break.
- `ios/DoneYet/AppDelegate.swift` uses `.expo/.virtual-metro-entry` as the bundle root in debug builds. Keep launcher assumptions in sync with that.

## Notification invariant

- `expo-notifications` foreground handlers should not use deprecated `shouldShowAlert`.
- Use `shouldShowBanner` and / or `shouldShowList` to control foreground presentation instead.

## App Store screenshot pipeline

- The repo includes a reusable open-source screenshot pipeline based on `Maestro` for capture and `fastlane frameit` for framing.
- System dependencies for that pipeline are:
  - Homebrew `openjdk@17`
  - `maestro` on `PATH`
  - `imagemagick` on `PATH`
  - repo-local `fastlane` via `Gemfile` and `bundle exec`
- Do not replace the screenshot capture flow with a separate `expo start` path. The current scripts intentionally reuse the existing iOS launcher so Metro readiness stays aligned with the cold-start invariant above.
- The dev-only seed route is `doneyet://debug/screenshot-seed`.
  - Supported params:
    - `locale=en-US|tr`
    - `screen=home|calendar|list-detail|task-detail`
  - Example:
    - `doneyet://debug/screenshot-seed?locale=en-US&screen=task-detail`
- The screenshot seed flow replaces local app data with a `BackupPayload` v3 fixture, forces `onboardingCompleted=1`, and forces light theme. Keep it schema-compatible with the existing backup format instead of adding a screenshot-only migration.
- Stable screenshot fixtures and destination helpers live in `utils/screenshotFixtures.ts`.
- The screenshot seed screen lives in `app/debug/screenshot-seed.tsx`.
- Capture flows live under `.maestro/flows/`.
  - `prepare-app.yaml`
  - `capture-iphone.yaml`
  - `capture-ipad.yaml`
- The capture scripts intentionally target explicit simulators:
  - `iPhone 17 Pro Max`
  - `iPad Pro 13-inch (M5)`
- NPM commands:
  - `npm run screenshots:capture -- --device iphone --locale en-US`
  - `npm run screenshots:capture -- --device ipad --locale tr`
  - `npm run screenshots:frame`
  - `npm run screenshots:all`
- Output locations:
  - raw Maestro captures: `fastlane/screenshots/<locale>/`
  - framed screenshots: `fastlane/screenshots/<locale>/*_framed.png`
  - final App Store deliverables: `artifacts/app-store/<locale>/`
- Expected final deliverable set:
  - `en-US`: `home`, `calendar`, `list-detail`, `task-detail`, `ipad-home`
  - `tr`: `home`, `calendar`, `list-detail`, `task-detail`, `ipad-home`
  - total final PNG count: `10`
- The framing config lives in `fastlane/screenshots/Framefile.json`.
  - Locale copy lives in `fastlane/screenshots/en-US/title.strings` and `fastlane/screenshots/tr/title.strings`.
  - The current frame color is set to `SILVER` because `WHITE` was not reliably available for the chosen device frames.
- `scripts/screenshot-frame.mjs` is intentionally idempotent for normalized `.png` inputs, so rerunning `npm run screenshots:frame` after a partial success should work without regenerating `.capture.png` files.
- `frameit` may log harmless warnings about unsupported screen sizes when old Maestro debug artifact folders remain under `fastlane/` or when scanning non-screenshot assets. If framed outputs are created successfully in `fastlane/screenshots/<locale>/*_framed.png`, treat those warnings as non-blocking.
- If you want a cleaner rerun, it is safe to delete old timestamped Maestro debug folders under `fastlane/` before running `npm run screenshots:frame` again.

## Useful checks

- Run `npm run typecheck` after code changes.
- For launcher changes, run:
  - `npm test -- ios-metro-host.test.ts run-native-ios-readiness.test.ts`
- If you touch iOS launch behavior, verify both:
  - connected physical iPhone default path
  - cold-start behavior with a fresh Metro bundle
