# Lucid

**Study clearly. Learn deeply.**

Lucid is an offline-first student productivity app built with React Native, Expo, and TypeScript. It brings essential study tools into one place, with a focus on simplicity, privacy, and on-device AI.

> **Development status:** Early development. Features and architecture may change as the project evolves.

## Features

### Study tools
- **Flashcards** — Create and review study cards.
- **Quizzes** — Practice with questions and review answers.
- **Calculator** — Solve everyday mathematical problems.
- **Periodic table** — Explore chemical elements and their properties.

### On-device AI — Planned / in progress
- Local AI chat for study assistance.
- AI-generated summaries from study notes.
- Automatic flashcard and quiz generation.
- Document question answering.
- Model selection and download management.
- Offline inference after the selected model has been downloaded.

Lucid is intended to run supported language models directly on the device, reducing reliance on cloud inference services.

## Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile UI |
| Expo | Mobile development and builds |
| TypeScript | Type-safe application code |
| Expo Router | File-based navigation |
| NobodyWho | On-device language model inference |
| GGUF models | Local language model files |

The exact model choices, supported device requirements, and AI features will be confirmed during implementation and testing.

## Platforms

- Android
- iOS

Native AI functionality requires a compatible development or production build. Expo Go alone is not sufficient for native modules that are not included in its binary.

## Getting Started

### Prerequisites

Install the following:

- Node.js version supported by your installed Expo SDK.
- npm.
- Android Studio and Android SDK for local Android builds.
- macOS with Xcode for local iOS builds, or EAS Build for cloud builds.

### Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd lucid
```

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

### Native Android build

After configuring the Android development environment and installing compatible native dependencies:

```bash
npx expo run:android
```

### iOS build

On macOS with Xcode:

```bash
npx expo run:ios
```

Alternatively, use Expo Application Services (EAS) for cloud builds.

## Local AI

Lucid uses NobodyWho as the planned on-device inference engine.

The intended model management workflow is:

1. Browse supported models.
2. Select a model appropriate for the device.
3. Download the model.
4. Load the model through NobodyWho.
5. Run inference locally.
6. Reuse the cached model for subsequent offline sessions.

Only models compatible with NobodyWho's runtime and the target device will be offered. Model availability, licensing, memory requirements, and download sizes must be verified before distribution.

## Privacy Principles

Lucid aims to prioritize local data processing and offline usability.

- Run supported AI inference on-device.
- Avoid sending study materials to a remote AI service by default.
- Make model downloads and storage visible to users.
- Clearly disclose any features that require network access.
- Validate AI-generated content before saving or using it.

These are project goals and should be verified against the final implementation.

## Development Guidelines

- Use TypeScript for application code.
- Keep UI components separate from business logic and AI services.
- Preserve modular feature boundaries.
- Validate generated flashcards and quizzes before saving.
- Handle model loading, download failures, and insufficient memory gracefully.
- Test on physical Android and iOS devices before release.

## Project Status

Lucid is currently in early development.

The initial focus is to establish the Expo application, integrate NobodyWho, verify native builds, and demonstrate local model inference. The model selector and remaining AI study workflows will be implemented and tested incrementally.

## License

No license has been selected yet. All rights reserved unless a license is added to this repository.

---

**Lucid — Your space to understand.**