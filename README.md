# 🐕 Corgi VIN Decoder

<div align="center">
  <img src="./corgi.png" alt="Corgi - Fast VIN Decoder" width="200" height="200">
  <br>
  <strong>The fastest and most lightweight open-source VIN decoding library on the planet.</strong>
</div>

<div align="center">

[![CI](https://github.com/cardog-ai/corgi/workflows/CI/badge.svg)](https://github.com/cardog-ai/corgi/actions)
[![codecov](https://codecov.io/gh/cardog-ai/corgi/branch/master/graph/badge.svg)](https://codecov.io/gh/cardog-ai/corgi)
[![npm version](https://badge.fury.io/js/%40cardog%2Fcorgi.svg)](https://badge.fury.io/js/%40cardog%2Fcorgi)
[![npm downloads](https://img.shields.io/npm/dm/@cardog/corgi.svg)](https://www.npmjs.com/package/@cardog/corgi)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![GitHub stars](https://img.shields.io/github/stars/cardog-ai/corgi.svg?style=social)](https://github.com/cardog-ai/corgi)

</div>

Corgi is a blazing-fast, fully offline VIN decoder built with TypeScript. Powered by an optimized VPIC database, it delivers comprehensive vehicle information with zero network dependencies and lightning-fast performance across Node.js, browsers, and Cloudflare Workers.

## ⚡ Performance First

- **Fully Offline**: No API calls, no network dependencies, no rate limits
- **Lightning Fast**: Optimized SQLite database with pattern-based decoding
- **Tiny Footprint**: ~20MB compressed bundle with complete NHTSA dataset
- **Zero Dependencies**: Self-contained with automatic database management
- **Universal**: Works everywhere - Node.js, browsers, and edge computing

## 🚀 Quick Start

```bash
npm install @cardog/corgi
```

```typescript
import { createDecoder } from "@cardog/corgi";

// One-line VIN decoding - database auto-managed
const decoder = await createDecoder();
const result = await decoder.decode("KM8K2CAB4PU001140");

console.log(result.components.vehicle);
// {
//   make: 'Hyundai',
//   makeId: '482', // Example NHTSA make id (provided when available)
//   model: 'Kona',
//   modelId: '2107', // Example NHTSA model id (provided when available)
//   year: 2023,
//   series: 'SE',
//   seriesId: '8452', // Example series id (when available)
//   bodyStyle: 'SUV',
//   drivetrain: '4WD/4-Wheel Drive/4x4',
//   drivetrainId: '5', // Example drivetrain id (when available)
//   driveType: '4WD/4-Wheel Drive/4x4',
//   fuelType: 'Gasoline',
//   fuelTypeId: '1', // Example fuel type id (when available)
//   trim: 'Limited', // When available
//   trimId: '15423', // Example trim id (when available)
//   cab: 'Crew/Super Crew/Crew Max', // When available
//   cabTypeId: '4', // Example cab id (when available)
//   bed: 'Short', // When available
//   bedTypeId: '2', // Example bed id (when available)
//   wheelbase: 'Medium', // When available
//   wheelbaseId: '6', // Example wheelbase id (when available)
//   doors: '5'
// }

await decoder.close();
```

## 📋 What You Get

Corgi extracts comprehensive vehicle information from any VIN:

- **Vehicle Details**: Make, model, year, series, trim, body style, cab configuration, bed classification, wheelbase class, plus NHTSA IDs for make/model/trim/drivetrain/fuel type/cab/bed/wheelbase when available
- **Technical Specs**: Engine details, drivetrain (also available as `driveType`), fuel type, doors
- **Manufacturing**: Plant location, manufacturer, production details
- **Quality Metrics**: Confidence scores and validation results
- **Standards Compliance**: Full NHTSA VPIC dataset integration

## 🏗️ Platform Support

### Node.js

```typescript
import { createDecoder } from "@cardog/corgi";

// Automatic database management - downloads and caches on first run
const decoder = await createDecoder();
const result = await decoder.decode("1HGCM82633A123456");

// Or provide your own database path
const customDecoder = await createDecoder({
  databasePath: "/path/to/vpic.lite.db",
});
```

### Browser

```typescript
// Host the database file and provide the URL
const browserDecoder = await createDecoder({
  databasePath: "https://cdn.example.com/vpic.lite.db.gz",
  runtime: "browser",
});
```

### Cloudflare Workers

```typescript
import { createDecoder, initD1Adapter } from "@cardog/corgi";

// Initialize D1 adapter with your binding
initD1Adapter(env.D1_DATABASE);

// Create decoder
const decoder = await createDecoder({
  databasePath: "D1",
  runtime: "cloudflare",
});
```

## ⚙️ Configuration

### Advanced Options

```typescript
const decoder = await createDecoder({
  databasePath: "./custom/db/path.db", // Custom database location
  forceFresh: true, // Force fresh database setup
  defaultOptions: {
    includePatternDetails: true, // Pattern matching details
    includeRawData: false, // Raw database records
    confidenceThreshold: 0.8, // Confidence threshold (0-1)
    includeDiagnostics: true, // Performance metrics
  },
});

// Override options per decode
const result = await decoder.decode("VIN12345678901234", {
  modelYear: 2024, // Override detected year
  includePatternDetails: true, // Include pattern analysis
});
```

### Quick Decode Helper

```typescript
import { quickDecode } from "@cardog/corgi";

// One-line decoding with shared instance
const result = await quickDecode("1HGCM82633A123456");
```

## 📊 Response Structure

```typescript
interface DecodeResult {
  vin: string; // Input VIN
  valid: boolean; // Overall validation status

  components: {
    vehicle?: {
      // Core vehicle information
      make: string; // e.g., "Honda", "Toyota"
      makeId?: string; // NHTSA make identifier when available
      model: string; // e.g., "Civic", "Camry"
      modelId?: string; // NHTSA model identifier when available
      year: number; // Model year
      series?: string; // Series level
      seriesId?: string; // Series identifier when available
      trim?: string; // Trim level
      trimId?: string; // Trim identifier when available
      bodyStyle?: string; // "Sedan", "SUV", "Pickup"
      driveType?: string; // "FWD", "AWD", "4WD" (legacy alias)
      driveTypeId?: string; // Drive type identifier when available
      drivetrain?: string; // Preferred drivetrain property
      drivetrainId?: string; // Drivetrain identifier when available
      fuelType?: string; // "Gasoline", "Electric"
      fuelTypeId?: string; // Fuel type identifier when available
      cab?: string; // Cab configuration when available
      cabTypeId?: string; // Cab identifier when available
      bed?: string; // Bed classification details when available
      bedTypeId?: string; // Bed identifier when available
      wheelbase?: string; // Wheelbase classification when available
      wheelbaseId?: string; // Wheelbase identifier when available
      doors?: string; // Number of doors
    };

    wmi?: {
      // World Manufacturer Identifier
      manufacturer: string; // Official manufacturer name
      make: string; // Brand name
      makeId?: number; // NHTSA make identifier when available
      country: string; // Country of origin
      region: string; // Geographic region
    };

    plant?: {
      // Manufacturing details
      country: string; // Production country
      city?: string; // Production city
      code: string; // Plant code
    };

    engine?: {
      // Engine specifications
      model?: string; // Engine model/code
      cylinders?: string; // Cylinder count
      displacement?: string; // Engine displacement
      fuel?: string; // Fuel type
    };

    modelYear?: {
      // Year detection details
      year: number; // Detected year
      source: string; // Detection method
      confidence: number; // Confidence score
    };

    checkDigit?: {
      // VIN validation
      isValid: boolean; // Check digit validity
      expected?: string; // Expected value
      actual: string; // Actual value
    };
  };

  errors: DecodeError[]; // Validation errors
  metadata?: DiagnosticInfo; // Performance metrics
  patterns?: PatternMatch[]; // Pattern details (optional)
}
```

## 🚨 Error Handling

```typescript
import { ErrorCode, ErrorCategory } from "@cardog/corgi";

const result = await decoder.decode("INVALID_VIN");

if (!result.valid) {
  result.errors.forEach((error) => {
    console.log(`${error.category}: ${error.message}`);

    // Handle specific error types
    switch (error.code) {
      case ErrorCode.INVALID_CHECK_DIGIT:
        console.log(`Expected: ${error.expected}, Got: ${error.actual}`);
        break;
      case ErrorCode.INVALID_LENGTH:
        console.log("VIN must be exactly 17 characters");
        break;
      case ErrorCode.WMI_NOT_FOUND:
        console.log("Unknown manufacturer code");
        break;
    }
  });
}
```

## 🖥️ Command Line Interface

```bash
# Quick VIN decode
npx @cardog/corgi decode 1HGCM82633A123456

# With options
npx @cardog/corgi decode 1HGCM82633A123456 \
  --patterns \
  --year 2022 \
  --format json

# Custom database
npx @cardog/corgi decode 1HGCM82633A123456 \
  --database ./custom/vpic.lite.db

# Help
npx @cardog/corgi --help
```

## 🌐 HTTP Endpoint Example

Expose the decoder through a minimal HTTP API without adding extra dependencies:

```bash
pnpm install
node examples/http-endpoint.js
```

This starts a server on port `3000` (override with `PORT=8080 node examples/http-endpoint.js`).

Decode any VIN by hitting the `/decode` endpoint:

```bash
curl "http://localhost:3000/decode?vin=KM8K2CAB4PU001140"
```

The JSON response contains the `vehicle`, `engine`, `plant`, and validation details surfaced by the library, including drivetrain, cab, bed classification, and wheelbase when available.

### Testing with Postman or API clients

Prefer a GUI over `curl`? Import the Postman assets in [`examples/postman`](examples/postman) and point them at your locally running server:

1. Start the example server (defaults to port `3000`).
2. In Postman, choose **File → Import**, select `examples/postman/corgi-decoder.postman_collection.json`, and optionally `examples/postman/local.postman_environment.json`.
3. Select the imported **Corgi VIN Decoder** collection and run the **Decode VIN** request. It is configured as a `GET` request to `{{baseUrl}}/decode` with a `vin` query parameter. The included environment sets `baseUrl` to `http://localhost:3000` so you can swap between local and remote servers quickly.

Any other REST client (Insomnia, Bruno, Hoppscotch, etc.) can hit the same `GET http://localhost:3000/decode?vin=YOURVIN` endpoint—just supply the VIN as the `vin` query parameter.

### Local VIN testing tips

- Use the CLI commands above for quick checks: `npx @cardog/corgi decode YOURVIN`.
- Run the HTTP example above to integrate with tools that expect an API or to test with Postman.

## 💾 Database & Caching

### Automatic Database Management

Corgi uses an intelligent caching system to provide optimal performance:

```typescript
// First run: Downloads, decompresses, and caches database
const decoder = await createDecoder();

// Subsequent runs: Uses cached database for instant startup
const decoder2 = await createDecoder();

// Force fresh download and cache refresh
const freshDecoder = await createDecoder({ forceFresh: true });
```

When no local database is available (for example, when running from a fresh clone of this repository), the decoder automatically
downloads the latest optimized VPIC snapshot from the official Corgi release and caches it in `~/.corgi-cache`. Override the
download source by setting `CORGI_DB_URL` (or `CORGI_DATABASE_URL`), or disable the automatic download with
`CORGI_DISABLE_DB_DOWNLOAD=1` and supply your own `databasePath`.

### Cache Storage Locations

- **Node.js**: `~/.corgi-cache/vpic.lite.db` (User home directory)
- **Browser**: Database loaded from your provided URL
- **Cloudflare**: Managed by D1 database service

### Database Details

- **Source**: Official NHTSA VPIC dataset (updated automatically)
- **Compressed Size**: ~20MB (vpic.lite.db.gz)
- **Uncompressed Size**: ~40MB (vpic.lite.db)
- **Update Frequency**: Monthly via automated pipeline
- **Coverage**: Complete VIN database with optimized queries

### Cache Management

```typescript
import { getDatabasePath } from "@cardog/corgi";

// Get current cached database path
const dbPath = await getDatabasePath();
console.log(`Database cached at: ${dbPath}`);

// Force cache refresh (useful after package updates)
const decoder = await createDecoder({ forceFresh: true });
```

## 🔬 Advanced Features

### Pattern-Based Decoding

```typescript
const result = await decoder.decode("VIN12345678901234", {
  includePatternDetails: true,
  confidenceThreshold: 0.8,
});

// Analyze individual pattern matches
result.patterns?.forEach((pattern) => {
  console.log(`${pattern.element}: ${pattern.value} (${pattern.confidence})`);
});

// Overall decode confidence
console.log(`Confidence: ${result.metadata?.confidence}`);
```

### Body Style Normalization

```typescript
import { BodyStyle } from "@cardog/corgi";

// Automatic normalization to standard values
console.log(BodyStyle.SUV); // "SUV"
console.log(BodyStyle.SEDAN); // "Sedan"
console.log(BodyStyle.PICKUP); // "Pickup"

// Raw values like "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)"
// become clean "SUV"
```

### Performance Diagnostics

```typescript
const result = await decoder.decode("VIN12345678901234", {
  includeDiagnostics: true,
});

console.log(`Processing time: ${result.metadata?.processingTime}ms`);
console.log(`Schema version: ${result.metadata?.schemaVersion}`);
```

## 🤝 Contributing

We welcome contributions from the automotive and developer communities! Corgi is built to be the fastest, most reliable VIN decoder available.

### Quick Start

```bash
git clone https://github.com/cardog-ai/corgi.git
cd corgi
pnpm install
pnpm approve-builds
pnpm test
```

### Development Workflow

- **Issues**: Report bugs or request features via GitHub Issues
- **Pull Requests**: Fork, create a feature branch, and submit a PR
- **Testing**: All changes must include tests and pass existing test suite
- **Standards**: Follow existing TypeScript patterns and conventions

### Database Updates

The VPIC database is automatically maintained via CI/CD pipelines. Manual database updates are rarely needed, but documentation is available for contributors.

### Community Guidelines

- Be respectful and inclusive
- Follow semantic versioning for changes
- Write clear commit messages
- Add tests for new functionality

---

**Made with ❤️ by the automotive community**

## 📄 License

ISC License - see [LICENSE](LICENSE) for details.
