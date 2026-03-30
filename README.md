# DoneYet?

DoneYet? is a fully offline Expo React Native task app for persistent reminder checking. It stores everything locally with SQLite and schedules local notifications until a task is explicitly marked done.

## Run

```bash
npm install
npx expo start
```

For a native iOS debug launch, use `npm run ios` so the app starts the Expo dev server, waits for Metro, and waits for the first iOS Expo bundle to finish compiling before opening the app. When a physical iPhone is connected, the launcher prefers that device by default; if you want a specific target, pass `--device`, pass `--simulator`, or set `IOS_DEVICE_NAME`. The script uses `lan` for physical devices and `localhost` for simulators so the runtime bundle URL and the Metro server stay aligned, and the phone must be able to reach your Mac on the local network. You can still override that with `IOS_METRO_HOST_MODE` if you need to force a specific host mode. If you build or archive a release app, the bundled `main.jsbundle` is used instead, so Metro is not required.

## Tests

```bash
npm test
```
