import { createGunzip } from "zlib";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import { createLogger } from "../logger";
import { request } from "https";

const logger = createLogger("DbUtils");

// Get __dirname equivalent in both ESM and CJS environments
function getDirname() {
  try {
    // ESM
    if (typeof import.meta.url === "string") {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // CJS
    if (typeof __dirname === "string") {
      return __dirname;
    }
  }
  // Fallback
  return process.cwd();
}

const DIRNAME = getDirname();

// Path constants
const CACHE_DIR = join(homedir(), ".corgi-cache");
const CACHE_DB_PATH = join(CACHE_DIR, "vpic.lite.db");
const DEFAULT_DB_DOWNLOAD_URL =
  "https://github.com/cardog-ai/corgi/releases/latest/download/vpic.lite.db.gz";
let downloadInProgress: Promise<void> | null = null;

/**
 * Get potential paths for the compressed database in order of preference
 */
function getCompressedDbPaths(): string[] {
  const paths: string[] = [];

  // In development: packages/corgi/lib/db -> packages/corgi/dist/db/vpic.lite.db.gz
  paths.push(join(DIRNAME, "..", "..", "dist", "db", "vpic.lite.db.gz"));

  // In built package: dist/db -> dist/db/vpic.lite.db.gz (same directory)
  paths.push(join(DIRNAME, "vpic.lite.db.gz"));

  // In built package: dist/* -> dist/db/vpic.lite.db.gz (sibling directory)
  paths.push(join(DIRNAME, "..", "db", "vpic.lite.db.gz"));

  // In installed package: node_modules/@cardog/corgi/dist/db/vpic.lite.db.gz
  paths.push(join(DIRNAME, "db", "vpic.lite.db.gz"));

  // Alternative: if DIRNAME is the package root
  paths.push(join(DIRNAME, "dist", "db", "vpic.lite.db.gz"));

  return paths;
}

/**
 * Get potential paths for uncompressed databases in order of preference
 */
function getUncompressedDbPaths(): string[] {
  const paths: string[] = [];

  // For local dev: packages/corgi/db/vpic.lite.db
  paths.push(join(DIRNAME, "..", "..", "db", "vpic.lite.db"));

  // Alternative dev path
  paths.push(join(DIRNAME, "..", "db", "vpic.lite.db"));

  // Current working directory
  paths.push(join(process.cwd(), "db", "vpic.lite.db"));

  return paths;
}

/**
 * Gets the path to the database, handling decompression if needed
 *
 * @param options - Optional configuration
 * @returns Path to usable database file
 */
export async function getDatabasePath(
  options: {
    forceFresh?: boolean;
    databasePath?: string;
  } = {}
): Promise<string> {
  // If explicit path is provided, use it
  if (options.databasePath) {
    logger.debug(
      { path: options.databasePath },
      "Using explicitly provided database path"
    );
    return options.databasePath;
  }

  try {
    const compressedPaths = getCompressedDbPaths();
    const uncompressedPaths = getUncompressedDbPaths();

    logger.debug(
      {
        CACHE_DIR,
        CACHE_DB_PATH,
      },
      "Database paths being checked"
    );

    // Check if we already have a cached decompressed version
    if (!options.forceFresh && existsSync(CACHE_DB_PATH)) {
      logger.debug({ path: CACHE_DB_PATH }, "Using cached database");
      return CACHE_DB_PATH;
    }

    // Ensure cache directory exists
    if (!existsSync(CACHE_DIR)) {
      logger.debug({ dir: CACHE_DIR }, "Creating cache directory");
      mkdirSync(CACHE_DIR, { recursive: true });
    }

    // First check if we have an uncompressed version to copy
    logger.debug("Checking for uncompressed database files...");
    for (const dbPath of uncompressedPaths) {
      if (existsSync(dbPath)) {
        logger.debug(
          { from: dbPath, to: CACHE_DB_PATH },
          "Copying uncompressed database to cache"
        );
        await copyFile(dbPath, CACHE_DB_PATH);
        return CACHE_DB_PATH;
      }
    }

    // Check if we have a compressed version
    logger.debug("Checking for compressed database files...");
    for (const compressedPath of compressedPaths) {
      if (existsSync(compressedPath)) {
        logger.debug(
          { from: compressedPath, to: CACHE_DB_PATH },
          "Decompressing database to cache"
        );
        await decompressDatabase(compressedPath, CACHE_DB_PATH);
        return CACHE_DB_PATH;
      }
    }

    // If we get here, we couldn't find any database file - attempt download
    const downloadUrl =
      process.env.CORGI_DB_URL ??
      process.env.CORGI_DATABASE_URL ??
      DEFAULT_DB_DOWNLOAD_URL;

    if (process.env.CORGI_DISABLE_DB_DOWNLOAD === "1") {
      logger.error(
        "No database files found and automatic download disabled via CORGI_DISABLE_DB_DOWNLOAD"
      );
      throw new Error(
        "Database file not found and automatic download is disabled. Provide a databasePath option when creating the decoder."
      );
    }

    logger.warn(
      { downloadUrl },
      "No database files found locally. Attempting download"
    );

    try {
      downloadInProgress ??= downloadAndPrepareDatabase(
        downloadUrl,
        CACHE_DB_PATH
      ).finally(() => {
        downloadInProgress = null;
      });

      await downloadInProgress;
      return CACHE_DB_PATH;
    } catch (error: any) {
      logger.error(
        { error, downloadUrl },
        "Database download failed"
      );
      throw new Error(
        `Failed to download database automatically from ${downloadUrl}. Provide a databasePath option or set CORGI_DB_URL to a reachable file.`
      );
    }
  } catch (error: any) {
    logger.error({ error }, "Failed to prepare database");
    throw new Error(`Failed to prepare database: ${error.message}`);
  }
}

/**
 * Decompress gzipped database file
 *
 * @param sourcePath - Path to compressed database
 * @param destPath - Destination path for decompressed database
 */
async function decompressDatabase(
  sourcePath: string,
  destPath: string
): Promise<void> {
  const gunzip = createGunzip();
  const source = createReadStream(sourcePath);
  const destination = createWriteStream(destPath);

  try {
    await pipeline(source, gunzip, destination);
    logger.debug("Database decompression complete");
  } catch (error) {
    logger.error({ error }, "Database decompression failed");
    throw error;
  }
}

/**
 * Copy a file from source to destination
 *
 * @param sourcePath - Source file path
 * @param destPath - Destination file path
 */
async function copyFile(sourcePath: string, destPath: string): Promise<void> {
  const source = createReadStream(sourcePath);
  const destination = createWriteStream(destPath);

  try {
    await pipeline(source, destination);
    logger.debug("File copy complete");
  } catch (error) {
    logger.error({ error }, "File copy failed");
    throw error;
  }
}

/**
 * Download the compressed database and prepare it for use
 */
async function downloadAndPrepareDatabase(
  url: string,
  destinationPath: string
): Promise<void> {
  const compressedDestination = `${destinationPath}.gz`;

  await downloadFile(url, compressedDestination);

  try {
    await decompressDatabase(compressedDestination, destinationPath);
  } finally {
    try {
      unlinkSync(compressedDestination);
    } catch (error) {
      logger.warn(
        { error, compressedDestination },
        "Failed to remove temporary compressed database file"
      );
    }
  }
}

/**
 * Download a file from a URL with redirect support
 */
function downloadFile(url: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destination);

    const cleanupAndReject = (error: Error) => {
      try {
        file.close();
      } catch {}
      try {
        unlinkSync(destination);
      } catch {}
      reject(error);
    };

    const doRequest = (currentUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        cleanupAndReject(
          new Error("Too many redirects while downloading database")
        );
        return;
      }

      const req = request(currentUrl, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          const redirectUrl = new URL(res.headers.location, currentUrl).toString();
          res.resume();
          doRequest(redirectUrl, redirectCount + 1);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          cleanupAndReject(
            new Error(
              `Failed to download database. HTTP status: ${res.statusCode}`
            )
          );
          return;
        }

        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      });

      req.on("error", (error) => {
        cleanupAndReject(error);
      });

      req.end();
    };

    file.on("error", (error) => {
      cleanupAndReject(error);
    });

    doRequest(url);
  });
}
