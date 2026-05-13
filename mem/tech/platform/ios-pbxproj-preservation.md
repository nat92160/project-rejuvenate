---
name: iOS pbxproj preservation
description: Never remove CODE_SIGN_ENTITLEMENTS or InfoPlist.strings refs in iOS project
type: constraint
---
NEVER remove or alter these in `ios/App/App.xcodeproj/project.pbxproj`:
- `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;` in BOTH Debug & Release buildSettings of target V15 (required for APNs push)
- References to `fr.lproj/InfoPlist.strings` and `en.lproj/InfoPlist.strings`
- Xcode scheme/target name: `V15`

**Why:** Without entitlements ref, iOS push notifications break. Localized InfoPlist.strings provide FR/EN permission prompts.
