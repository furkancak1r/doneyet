# DoneYet?

DoneYet? is a fully offline Expo React Native task app for persistent reminder checking. It stores everything locally with SQLite and schedules local notifications until a task is explicitly marked done.

## Run

```bash
npm install
npx expo start
```

For a native iOS debug launch, use `npm run ios` so the app starts the Expo dev server and waits for Metro before opening the simulator. If you build or archive a release app, the bundled `main.jsbundle` is used instead, so Metro is not required.

## Tests

```bash
npm test
```
