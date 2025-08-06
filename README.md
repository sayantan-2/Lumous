# 📁 Local Gallery

A lightning-fast, native desktop photo gallery built with Tauri + React that can index and display hundreds of thousands of images instantly.

## 🚀 Features

- **Blazing Fast**: Index thousands of images per second with instant thumbnail generation
- **Native Performance**: Built with Tauri (Rust) for minimal memory footprint
- **Modern UI**: React + Vite + shadcn/ui + Tailwind CSS
- **Offline First**: No cloud dependencies, all data stays local
- **Cross Platform**: Windows, macOS, and Linux support

## 🛠️ Tech Stack

- **Backend**: Tauri (Rust) + SQLite
- **Frontend**: React + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS
- **Package Manager**: Bun
- **Image Processing**: Rust image crates

## 📦 Installation

### Prerequisites

1. Install Bun:
   ```bash
   # Windows (using Scoop)
   scoop install bun
   
   # macOS/Linux
   curl -fsSL https://bun.sh/install | bash
   ```

2. Install Rust and Tauri CLI:
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install Tauri CLI
   cargo install tauri-cli --locked
   ```

### Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd local-gallery
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run in development mode:
   ```bash
   bun run tauri
   ```

### Building for Production

```bash
bun run tauri-build
```

## 🧪 Testing

```bash
# Unit tests
bun run test

# E2E tests
bun run e2e

# Lint
bun run lint

# Format
bun run format
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
