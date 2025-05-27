# Corgi VIN Decoder

A TypeScript library for decoding and validating Vehicle Identification Numbers (VINs) using a customized VPIC (Vehicle Product Information Catalog) database.

## Features

- Fully local VIN validation and decoding
- Comprehensive vehicle information extraction
- Plant and manufacturing information
- Engine specifications
- Pattern-based decoding with confidence scores
- Support for Node.js, browser, and Cloudflare environments
- TypeScript-first with complete type definitions
- Command-line interface for quick VIN lookups

## Installation

```bash
npm install @cardog/corgi
```

## Offline Database and How It Works

Corgi is designed for fully offline VIN decoding. It achieves this by bundling a customized, compressed SQLite database (`vpic.lite.db.gz`, approximately 40MB) derived from the NHTSA VPIC dataset.

### Node.js Environment

- When you call `await createDecoder()` without a `databasePath` option, Corgi automatically locates the bundled `vpic.lite.db.gz`.
- On the first run, this gzipped database is decompressed into a local cache directory at `~/.corgi-cache/vpic.lite.db`.
- Subsequent calls will use this cached, uncompressed database for faster initialization.
- If you need to force a re-decompress (e.g., if the cache is corrupted or after a package update that changes the bundled DB), you can use the `forceFresh: true` option: `await createDecoder({ forceFresh: true });`
- If you prefer to manage your own uncompressed SQLite database file, you can provide its path using the `databasePath` option: `await createDecoder({ databasePath: "/path/to/your/vpic.lite.db" });`

### Browser Environment

- In the browser, you **must** provide a `databasePath` option, which should be a URL pointing to where you are hosting the database file.
- **Recommended Method:** Host the compressed `vpic.lite.db.gz` file (found in the `dist/db/` directory of the installed `@cardog/corgi` package or from the [GitHub repository](https://github.com/cardog-ai/corgi)). Configure your web server to serve this `.gz` file with the `Content-Encoding: gzip` HTTP header. The browser will then handle decompression automatically.
  ```typescript
  // Browser (uses sql.js, server handles gzip decompression)
  const browserDecoder = await createDecoder({
    databasePath: "https://your-cdn.com/assets/vpic.lite.db.gz", // Path to your gzipped DB
    runtime: "browser",
  });
  ```
- **Alternative Method:** Host an uncompressed `vpic.lite.db` file. You would need to decompress the `vpic.lite.db.gz` file yourself first.
  ```typescript
  // Browser (uses sql.js, serving an uncompressed DB)
  const browserDecoder = await createDecoder({
    databasePath: "/assets/vpic.lite.db", // Path to your uncompressed DB
    runtime: "browser",
  });
  ```
  To get an uncompressed database, you can:
  1. Find `vpic.lite.db.gz` in `node_modules/@cardog/corgi/dist/db/`.
  2. Manually decompress it using a tool like `gunzip`.
  3. Place the resulting `vpic.lite.db` in your web server's public assets directory.

### Cloudflare D1 Environment

- For Cloudflare Workers using D1, the database is managed by D1. Initialize the D1 adapter using `initD1Adapter(env.D1_DATABASE)`. The `databasePath` in `createDecoder` is then a placeholder and not used to load a file.

  ```typescript
  import { createDecoder, initD1Adapter } from "@cardog/corgi";

  // In your worker setup (e.g., `fetch` handler or module scope)
  // initD1Adapter(env.YOUR_D1_BINDING); // Replace env.YOUR_D1_BINDING with your actual D1 binding

  // Then, when you need a decoder:
  const d1Decoder = await createDecoder({
    databasePath: "D1", // Path is ignored for D1 but still a required parameter
    runtime: "cloudflare",
  });
  ```

## Quick Start

```typescript
import { createDecoder } from "@cardog/corgi";

// Create a decoder (it will automatically find and use the bundled database)
const decoder = await createDecoder();

// Decode a VIN
const result = await decoder.decode("KM8K2CAB4PU001140");

console.log(result.components.vehicle);
// {
//   make: 'Hyundai',
//   model: 'Kona',
//   year: 2023,
//   series: 'SE',
//   bodyStyle: 'SUV',
//   driveType: '4WD/4-Wheel Drive/4x4',
//   fuelType: 'Gasoline',
//   doors: '5'
// }

// Don't forget to close when done
await decoder.close();
```

## Usage

### Environment-aware Decoder

The library automatically detects and configures itself for Node.js, browser, or Cloudflare environments:

```typescript
import { createDecoder } from "@cardog/corgi";

// Node.js (uses better-sqlite3)
// The library automatically finds the bundled database, decompresses it to a cache
// on first run (~/.corgi-cache/vpic.lite.db), and uses the cache thereafter.
const nodeDecoder = await createDecoder();

// Or, if you manage your own uncompressed database file:
// const nodeDecoder = await createDecoder({ databasePath: "/path/to/your/vpic.lite.db" });

// Browser (uses sql.js)
// See "Offline Database and How It Works" -> "Browser Environment" for details
// on how to host and provide the databasePath.
const browserDecoder = await createDecoder({
  databasePath: "https://your-cdn.com/assets/vpic.lite.db.gz", // Or /path/to/uncompressed.db
  runtime: "browser",
});

// Cloudflare (uses D1)
// See "Offline Database and How It Works" -> "Cloudflare D1 Environment" for details.
import { initD1Adapter } from "@cardog/corgi";

// Init D1 adapter once (e.g., in your worker setup)
// initD1Adapter(env.YOUR_D1_BINDING); // Replace with your D1 binding

// Then create decoder
const d1Decoder = await createDecoder({
  databasePath: "D1", // Path is ignored for D1 but still a required parameter
  runtime: "cloudflare",
});
```

### Configuration Options

```typescript
// Example for Node.js - will use cached DB if databasePath is omitted
const decoder = await createDecoder({
  // databasePath: "./db/vpic.lite.db", // Optional: omit to use auto-caching
  defaultOptions: {
    includePatternDetails: true, // Include pattern matching details
    includeRawData: false, // Include raw database records
    confidenceThreshold: 0.5, // Custom confidence threshold
    includeDiagnostics: true, // Include timing and debug info
  },
});

// Override options for specific decodes
const result = await decoder.decode("KM8K2CAB4PU001140", {
  modelYear: 2024, // Override model year detection
});
```

### Response Structure

```typescript
{
  vin: string;                    // Input VIN
  valid: boolean;                 // Overall validation status
  components: {
    wmi?: {                       // World Manufacturer Identifier info
      code: string;
      manufacturer: string;
      make: string;
      country: string;
      vehicleType: string;
      region: string;
    };
    modelYear?: {                 // Model year info
      year: number;
      source: "position" | "override" | "calculated";
      confidence: number;
    };
    checkDigit?: {                // Check digit validation
      position: number;
      actual: string;
      expected?: string;
      isValid: boolean;
    };
    vehicle?: {                   // Core vehicle info
      make: string;
      model: string;
      year: number;
      series?: string;
      trim?: string;
      bodyStyle?: string;
      driveType?: string;
      fuelType?: string;
      doors?: string;
    };
    plant?: {                     // Manufacturing plant info
      country: string;
      city?: string;
      manufacturer?: string;
      code: string;
    };
    engine?: {                    // Engine specifications
      model?: string;
      cylinders?: string;
      displacement?: string;
      fuel?: string;
      power?: string;
    };
  };
  errors: DecodeError[];          // Any validation or decode errors
  metadata?: {                    // Diagnostic metadata
    processingTime: number;
    confidence: number;
    schemaVersion: string;
    matchedSchema?: string;
  };
  patterns?: PatternMatch[];      // Pattern matching details (if requested)
}
```

### Error Handling

```typescript
import { ErrorCode, ErrorCategory, ErrorSeverity } from "@cardog/corgi";

try {
  const result = await decoder.decode("INVALID_VIN");

  if (!result.valid) {
    for (const error of result.errors) {
      console.log(`Error: ${error.message}`);
      console.log(`Category: ${error.category}`);
      console.log(`Severity: ${error.severity}`);

      // Check for specific error types
      if (error.code === ErrorCode.INVALID_CHECK_DIGIT) {
        console.log(`Expected: ${error.expected}, Actual: ${error.actual}`);
      }
    }
  }
} catch (error) {
  console.error("Decoder error:", error);
}
```

## Command Line Interface

The library includes a CLI for quick VIN lookups:

```bash
# Basic usage
npx corgi decode 1HGCM82633A123456

# Specify database path
npx corgi decode 1HGCM82633A123456 --database ./db/vpic.lite.db

# Include pattern details
npx corgi decode 1HGCM82633A123456 --patterns

# Override model year
npx corgi decode 1HGCM82633A123456 --year 2022

# JSON output
npx corgi decode 1HGCM82633A123456 --format json

# Help
npx corgi --help
```

The CLI also benefits from the automatic database caching. If you don't provide a `--database` path, it will use the bundled database and cache it in `~/.corgi-cache/` just like the Node.js library usage.

## Advanced Features

### Body Style Normalization

The library automatically normalizes database body class values to consistent body styles:

```typescript
import { BodyStyle } from "@cardog/corgi";

// Standard body style enum
console.log(BodyStyle.SUV); // "SUV"
console.log(BodyStyle.SEDAN); // "Sedan"
console.log(BodyStyle.PICKUP); // "Pickup"

// Raw database values are mapped to standard styles
// "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)" -> "SUV"
// "Sedan/Saloon" -> "Sedan"
// "Crew Cab Pickup" -> "Pickup"
```

### Confidence Scores

Each pattern match includes a confidence score:

```typescript
const result = await decoder.decode("KM8K2CAB4PU001140", {
  includePatternDetails: true,
});

// Overall confidence
console.log(`Overall: ${result.metadata?.confidence}`);

// Individual pattern confidences
for (const pattern of result.patterns || []) {
  console.log(`${pattern.element}: ${pattern.value} (${pattern.confidence})`);
}
```

## Contributing

Contributions are welcome! If you're looking to improve Corgi or add new features, here's a brief overview of how to get started:

- **Database:**
  - The source SQLite database (`db/vpic.db` - not included in repo, generated from NHTSA data) is processed by `db/optimize-db.sh` to create `db/vpic.lite.db`. This script slims down the database by removing unused tables and data.
  - The `scripts/prepare-db.js` script then compresses `db/vpic.lite.db` into `dist/db/vpic.lite.db.gz`, which is the file bundled with the npm package.
- **Development:**
  - After cloning the repository, install dependencies using your preferred package manager (e.g., `npm install` or `pnpm install`).
  - The library is written in TypeScript and uses `tsup` for building.
- **Tests:**
  - Run tests using `npm test` or `pnpm test`. Tests are written with `vitest`. Ensure any changes pass existing tests and add new tests for new functionality.

Please open an issue to discuss significant changes before submitting a pull request.

## License

ISC
