import { createGunzip } from "zlib";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import { createLogger } from "../logger";

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
const PACKAGE_DIR = DIRNAME; // Effectively packages/corgi/lib/db
const COMPRESSED_DB_PATH = join(DIRNAME, "..", "..", "dist", "db", "vpic.lite.db.gz");
const UNCOMPRESSED_DB_PATHS = [
  join(DIRNAME, "..", "..", "db", "vpic.lite.db"), // For local dev: packages/corgi/db/vpic.lite.db
];

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
    logger.debug(
      {
        CACHE_DIR,
        CACHE_DB_PATH,
        PACKAGE_DIR,
        UNCOMPRESSED_DB_PATHS,
        COMPRESSED_DB_PATH,
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
    for (const dbPath of UNCOMPRESSED_DB_PATHS) {
      logger.debug({ dbPath, exists: existsSync(dbPath) }, "Checking path");
      if (existsSync(dbPath)) {
        logger.debug(
          { from: dbPath, to: CACHE_DB_PATH },
          "Copying uncompressed database to cache"
        );
        await copyFile(dbPath, CACHE_DB_PATH);
        return CACHE_DB_PATH;
      }
    }

    // Log current working directory
    logger.debug({ cwd: process.cwd() }, "Current working directory");
    // ls current directory
    logger.debug(
      { files: readdirSync(process.cwd()) },
      "Current directory files"
    );

    // Check if we have a compressed version
    logger.debug(
      { path: COMPRESSED_DB_PATH, exists: existsSync(COMPRESSED_DB_PATH) },
      "Checking compressed database"
    );
    if (existsSync(COMPRESSED_DB_PATH)) {
      logger.debug(
        { from: COMPRESSED_DB_PATH, to: CACHE_DB_PATH },
        "Decompressing database to cache"
      );
      await decompressDatabase(COMPRESSED_DB_PATH, CACHE_DB_PATH);
      return CACHE_DB_PATH;
    }

    // Last resort - try database in the current directory
    const cwdDbPath = join(process.cwd(), "db", "vpic.lite.db");
    logger.debug(
      { path: cwdDbPath, exists: existsSync(cwdDbPath) },
      "Checking database in current directory"
    );
    if (existsSync(cwdDbPath)) {
      logger.debug(
        { from: cwdDbPath, to: CACHE_DB_PATH },
        "Copying database from current directory"
      );
      await copyFile(cwdDbPath, CACHE_DB_PATH);
      return CACHE_DB_PATH;
    }

    // If we get here, we couldn't find any database file
    logger.error("No database files found at any of the expected locations");
    throw new Error(
      "Database file not found. Please specify a database path explicitly when creating the decoder."
    );
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
