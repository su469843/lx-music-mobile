# AGENTS.md — LX Music Mobile

A React Native music player app for Android (5+). Aggregates music from multiple online sources (Kuwo, Kugou, Tencent, NetEase, Migu). Built with `react-native-navigation` (v1 — native stack), Redux-like stores, and TypeScript.

---

## Build / Test / Lint

```bash
# Install
npm ci

# Dev (run on connected Android device/emulator)
npm run dev          # react-native run-android --active-arch-only

# Metro bundler
npm start            # react-native start
npm run sc           # start --reset-cache

# Production APK
npm run pack:android # cd android && gradlew.bat assembleRelease

# Bundle (dev mode, for debugging bundle issues)
npm run bundle-android

# Lint
npm run lint
npm run lint:fix

# Release pipeline
npm run publish      # node publish (runs publish/index.js)
```

All commands in `package.json` scripts. There are **no unit tests** — no test runner or test files exist in the project. CI only runs lint + bundle test (`build-test.yml`).

---

## Architecture

### Navigation (react-native-navigation v1)

The app uses **native stack navigation** via `react-native-navigation`. Screens are registered once in `src/navigation/registerScreens.tsx` and shown/hidden via native stack operations.

- **Home screen** (`lxm.HomeScreen`) — the main hub, wrapped in a `DrawerLayout` on left side (menu/search/nav). Inside it, a `PagerView` (horizontal swipe) switches between pages (Search, SongList, Leaderboard, Mylist, Download, Setting).
- **Modal screens** — Version modal, Pact modal, Sync-mode modal registered as separate screens in the same registration call.
- **Push screens** — PlayDetail, SonglistDetail, Comment — pushed onto the stack from the Home screen.

### State Management

Not Redux — custom **Store + Event** pattern:

- `src/store/*/state.ts` — Plain mutable singleton objects (e.g. `settingState`, `playerState`, `commonState`).
- `src/store/*/action.ts` — Action functions that mutate the state object.
- `src/event/stateEvent.ts` — Event hub (`StateEvent`) that components subscribe to for reactivity. Uses `global.state_event.on/off`.
- `src/store/Provider/index.tsx` — Wraps the app to provide store context to React components.

### Core Modules (src/core/)

| Module | Purpose |
|--------|---------|
| `player/` | Playback orchestration (play, pause, next, prev, seek, mode switching) |
| `music/` | Music URL fetching, pic/lyric retrieval, quality selection |
| `download/` | Download manager (`manager.ts`) — in-memory task queue, concurrent download via RNFS |
| `list.ts` | Music list CRUD (add, remove, move, update) |
| `search/` | Search across sources |
| `init/` | Boot sequence: setting → theme → i18n → userApi → player → sync → deeplink |
| `common.ts` | Shared utilities: setting updates, language switch, pact modal |
| `sync.ts` | Multi-device data sync (lists, dislike list) |

### Settings System

Settings are flat key-value pairs stored as a plain object (`LX.AppSetting`):

- **Type definition**: `src/types/app_setting.d.ts` — all keys with JSDoc
- **Defaults**: `src/config/defaultSetting.ts`
- **Migration**: `src/config/migrate.ts`, `migrateSetting.ts`
- **Runtime access**: `useSettingValue(key)` hook from `src/store/setting/hook`
- **Update**: `updateSetting({ 'key': value })` from `@/core/common`
- **Settings UI**: Each top-level setting group is a React component in `src/screens/Home/Views/Setting/settings/*/index.tsx`

### UI Component Patterns

- **Theme**: Color tokens via `useTheme()` hook → `theme['c-font']`, `theme['c-primary']`, etc. Defined in `src/theme/`.
- **Styles**: `createStyle()` from `@/utils/tools` — wraps `StyleSheet.create`.
- **Common components**: `Text`, `Icon`, `CheckBox`, `Input` in `src/components/common/`.
- **Setting UI**: Reusable setting components at `src/screens/Home/Views/Setting/components/` (`Section`, `SubTitle`, `CheckBoxItem`, `InputItem`).

---

## Key Files & Directories

| Path | What |
|------|------|
| `src/app.ts` | Entry point — boots log, loads font-size, calls `init()` |
| `src/config/constant.ts` | Constants: nav menus, list IDs, storage prefixes, component IDs |
| `src/config/globalData.ts` | Initializes `global.lx.*` globals (used throughout the app) |
| `src/lang/` | i18n: `zh-cn.json`, `en-us.json`, `zh-tw.json` + `i18n.ts` loader |
| `src/types/` | TypeScript ambient declarations (`*.d.ts`) — all `LX.*` namespaces |
| `src/utils/tools.ts` | Swiss-knife: `confirmDialog`, `toast`, `formatMusicName`, device detection |
| `src/utils/fs.ts` | File system wrapper over `react-native-fs` + `react-native-file-system` |
| `src/plugins/storage.ts` | AsyncStorage wrapper for persistent data |
| `src/plugins/player/service.ts` | Background playback service registration |
| `publish/` | Release script — generates version info, changelog parsing |
| `android/` | Android native project (Gradle) |
| `.github/workflows/` | CI: build, test, sign-check, release (push to master triggers build + release) |

---

## Coding Conventions

### Naming
- **Files**: PascalCase for components (`PlayHighQuality.tsx`), camelCase for utilities (`tools.ts`)
- **Exports**: Default export for page/screen components, named exports for utilities and sub-components
- **Settings keys**: Dot-separated namespaced keys: `'player.playQuality'`, `'download.savePath'`
- **TypeScript**: Ambient declarations in `src/types/*.d.ts` under `declare namespace LX { ... }`. No `import`/`export` in those files.

### Error Handling
- Async errors caught with `.catch()` and displayed via `toast()` or `tipDialog()`
- `confirmDialog()` returns `Promise<boolean>`
- Download manager uses try/catch and sets `task.error` string

### Module Imports
- Uses `@/` alias → `src/` (configured in `babel.config.js` via `babel-plugin-module-resolver`)
- Example: `import { toast } from '@/utils/tools'`

### State Access
- Store singletons imported directly: `import settingState from '@/store/setting/state'`
- React hooks for reactive access: `import { useSettingValue } from '@/store/setting/hook'`
- Global event hub: `global.state_event.on('configUpdated', handler)`

---

## Git Workflow

- **Branch naming**: No enforced convention observed (single `master` branch, `dev` for PRs)
- **Commit messages**: Mix of Chinese and English, conventional-commits-like (`feat:`, `ci:`, `chore:`)
- **Tag format**: `v<semver>` (e.g. `v1.8.5`)

---

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| `build-test.yml` | PR to `dev` | `npm ci` → lint → bundle test |
| `release.yml` | Push to `master` | Build Android APK → create git tag → create GitHub Release with APK artifacts |
| `beta-pack.yml` | Push to `beta` | Same as release but for beta branch |
| `check-signing.yml` | Manual | Verifies keystore env vars are valid |
| `publish-version-info.yml` | Release published | Dispatches event to version-info repo |

**Critical**: The Release job in `release.yml` needs `permissions: contents: write` on the job level to create GitHub Releases. Default `GITHUB_TOKEN` is read-only.

---

## Tips for AI Agents

1. **No unit tests exist** — do not look for or try to run tests. The `test.js` file at root is a stub.
2. **Download manager is in-memory only** — `src/core/download/manager.ts` stores tasks in a plain array. Restarting the app loses all pending/in-progress downloads.
3. **Settings key namespace matters** — Always add new settings to 3 places: `src/types/app_setting.d.ts` (type), `src/config/defaultSetting.ts` (default), and the migration in `src/config/migrate.ts` if needed.
4. **i18n is manual** — New UI strings must be added to all 3 locale files (`zh-cn.json`, `en-us.json`, `zh-tw.json`) with the same key.
5. **Horizontal mode is separate** — The Home screen has both `Vertical/` and `Horizontal/` layouts. New views added to one must also be added to the other (`src/screens/Home/Horizontal/Main.tsx`).
6. **Setting screens are registered in 3 places** — `src/screens/Home/Views/Setting/Main.tsx` (routing switch), `SETTING_SCREENS` array, and `src/screens/Home/Views/Setting/Vertical/Main.tsx` (FlatList switch).
7. **`global.lx.*` globals** are initialized in `src/config/globalData.ts`. Before that file loads, these globals don't exist — be careful about import order.
8. **`publish/` is a Node.js script** for release metadata, not part of the mobile app. Changes to it affect only the release automation.
