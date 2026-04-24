# DoneYet?

DoneYet? is a fully offline Expo React Native task app for persistent reminder checking. It stores everything locally with SQLite and schedules local notifications until a task is explicitly marked done.

## Run

```bash
npm install
npx expo start
```

For a native Android debug launch, use `npm run android`. The repo now keeps a checked-in `android/` project alongside the existing `ios/` project, so native-affecting `app.json` changes should be synchronized intentionally instead of being left to drift. If you change fields such as the app icon, splash, scheme, orientation, `userInterfaceStyle`, or anything under `expo.android`, regenerate the Android project with `npm run android:sync-native` and review the resulting native diff before committing it.

For a native iOS debug launch, use `npm run ios` so the app starts the Expo dev server, waits for Metro, and waits for the first iOS Expo bundle to finish compiling before opening the app. When a physical iPhone is connected, the launcher prefers that device by default; if you want a specific target, pass `--device`, pass `--simulator`, or set `IOS_DEVICE_NAME`. The script uses `lan` for physical devices and `localhost` for simulators so the runtime bundle URL and the Metro server stay aligned, and the phone must be able to reach your Mac on the local network. You can still override that with `IOS_METRO_HOST_MODE` if you need to force a specific host mode. If you build or archive a release app, the bundled `main.jsbundle` is used instead, so Metro is not required.

## Android Release

Android store publishing uses EAS, not Fastlane. The `production` EAS profile now requires a clean git state before it will start, so release builds must come from a reviewed commit instead of the current dirty worktree.

The configured release commands are:

```bash
npm run android:build:production
npm run android:submit:production
npm run android:play:prepare
npm run android:play:validate
npm run android:play:closed-testing
```

The build command creates a remote production AAB for `com.furkancakir.doneyet`. The submit command targets the Google Play `production` track and expects the service account key JSON at `/Users/furkancakir/.google-play/doneyet-google-play-service-account.json`, which must stay outside the repo.

Because Google Play API submissions do not work until an app has been uploaded manually once, the first DoneYet Android release is a two-step process:

1. Run `npm run android:build:production` from a clean release snapshot.
2. Upload that first AAB manually in Google Play Console for `com.furkancakir.doneyet`.

After that first manual upload and after the service account key has access to the Play app, future releases can use `npm run android:submit:production` to submit the latest EAS Android build from the CLI.

Closed testing uses fastlane supply on the `alpha` track. `npm run android:play:prepare` stages localized Play metadata under `fastlane/metadata/android`, generates a 512x512 store icon from `assets/icon.png`, and copies the raw unframed `home` and `task-detail` screenshots for `en-US` and `tr-TR`. `npm run android:play:validate` performs a Google Play dry run with the latest DoneYet production AAB from `~/Downloads`, and `npm run android:play:closed-testing` uploads that AAB plus the staged metadata to the closed testing track.

## Tests

```bash
npm test
```
