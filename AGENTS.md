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

## Useful checks

- Run `npm run typecheck` after code changes.
- For launcher changes, run:
  - `npm test -- ios-metro-host.test.ts run-native-ios-readiness.test.ts`
- If you touch iOS launch behavior, verify both:
  - connected physical iPhone default path
  - cold-start behavior with a fresh Metro bundle
