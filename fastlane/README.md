fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### store_listing

```sh
[bundle exec] fastlane store_listing
```

Upload metadata and screenshots to App Store Connect

### store_metadata

```sh
[bundle exec] fastlane store_metadata
```

Upload only metadata to App Store Connect

### store_screenshots

```sh
[bundle exec] fastlane store_screenshots
```

Upload only screenshots to App Store Connect

----


## Android

### android play_validate

```sh
[bundle exec] fastlane android play_validate
```

Validate Android Play Store metadata, screenshots, and AAB for closed testing

### android play_closed_testing

```sh
[bundle exec] fastlane android play_closed_testing
```

Upload Android Play Store metadata, screenshots, and AAB to the closed testing track

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
