import { serverURL } from './constants'

/**
 * Constructs an absolute URL by resolving the given path against the configured server base URL.
 * @param path - The API path (e.g. `/api/foo`)
 * @returns Absolute URL string
 */
const url = (path: string) => new URL(path, serverURL).toString()

/**
 * Centralised API endpoint factory for the Stephen frontend.
 *
 * Every property is a function that returns a fully-qualified URL string ready
 * to pass to `fetch` or an `<a href>`. All paths are resolved against
 * {@link serverURL} so the correct host is used in every environment.
 *
 * @example
 * ```ts
 * const data = await fetch(API.powerMeterDetails()).then(r => r.json())
 * ```
 */
export const API = {

    // -------------------------------------------------------------------------
    // ESP Devices
    // -------------------------------------------------------------------------

    /**
     * Returns the list of registered ESP32 devices.
     *
     * `GET /api/ESPlist`
     */
    ESPlist: () => url('/api/ESPlist'),

    /**
     * Triggers a refresh/update of the ESP32 device registry.
     *
     * `GET /api/ESPupdate`
     */
    ESPupdate: () => url('/api/ESPupdate'),

    // -------------------------------------------------------------------------
    // Power Meter
    // -------------------------------------------------------------------------

    /**
     * Returns power meter readings aggregated over the given number of hours.
     *
     * `GET /api/powerMeter/Hours?hours=<hours>`
     * @param hours - How many hours of history to fetch
     */
    powerMeterHours: (hours: number) => url(`/api/powerMeter/Hours?hours=${hours}`),

    /**
     * Returns static details about the power meter device (model, firmware, etc.).
     *
     * `GET /api/powerMeter/details`
     */
    powerMeterDetails: () => url('/api/powerMeter/details'),

    /**
     * Returns the raw, unprocessed power meter data stream.
     *
     * `GET /api/powerMeter/rawData`
     */
    powerMeterRawData: () => url('/api/powerMeter/rawData'),

    /**
     * Runs a diagnostic scan on the selected power meter channel.
     *
     * `GET /api/powerMeter/runScan?sel=<sel>`
     * @param sel - Channel/selector identifier to scan
     */
    powerMeterRunScan: (sel: string) => url(`/api/powerMeter/runScan?sel=${sel}`),

    /**
     * Writes the sampling frequency setting to the power meter.
     *
     * `POST /api/powerMeter/writeFreq`
     */
    powerMeterWriteFreq: () => url('/api/powerMeter/writeFreq'),

    // -------------------------------------------------------------------------
    // Solar Edge
    // -------------------------------------------------------------------------

    /**
     * Returns SolarEdge inverter production data for the given date/time range.
     *
     * `GET /api/solarEdge/Range?from=<ISO>&to=<ISO>`
     * @param from - Start of the range (inclusive)
     * @param to   - End of the range (inclusive)
     */
    solarEdgeRange: (from: Date, to: Date) => url(`/api/solarEdge/Range?from=${from.toISOString()}&to=${to.toISOString()}`),

    /**
     * Returns unit/device information for the SolarEdge inverter.
     *
     * `GET /api/solarEdge/UnitInfo`
     */
    solarEdgeUnitInfo: () => url('/api/solarEdge/UnitInfo'),

    // -------------------------------------------------------------------------
    // Ultimeter Weather Station
    // -------------------------------------------------------------------------

    /**
     * Returns Ultimeter weather station readings for the given date/time range.
     *
     * `GET /api/ultimeterRange?from=<ISO>&to=<ISO>`
     * @param from - Start of the range (inclusive)
     * @param to   - End of the range (inclusive)
     */
    ultimeterRange: (from: Date, to: Date) => url(`/api/ultimeterRange?from=${from.toISOString()}&to=${to.toISOString()}`),

    // -------------------------------------------------------------------------
    // Sprinkler
    // -------------------------------------------------------------------------

    /**
     * Checks whether the sprinkler controller is currently reachable.
     *
     * `GET /api/sprinkler/isConnected`
     */
    sprinklerIsConnected: () => url('/api/sprinkler/isConnected'),

    /**
     * Returns the list of sprinkler zones/stations found on the controller.
     *
     * `GET /api/sprinkler/found`
     */
    sprinklerFound: () => url('/api/sprinkler/found'),

    /**
     * Loads the current sprinkler schedule from the controller.
     *
     * `GET /api/sprinkler/load`
     */
    sprinklerLoad: () => url('/api/sprinkler/load'),

    // -------------------------------------------------------------------------
    // Gallery
    // -------------------------------------------------------------------------

    /**
     * Lists available photo directories filtered by mode.
     *
     * `GET /api/readDirectories/<mode>`
     * @param mode - Directory filter mode (e.g. `"album"`, `"all"`)
     */
    readDirectories: (mode: string) => url(`/api/readDirectories/${mode}`),

    /**
     * Returns the image list for a named album/directory.
     *
     * `GET /api/readImages/<name>/<type>`
     * @param name - Album or directory name (URL-encoded)
     * @param type - Image type/size variant (e.g. `"thumb"`, `"full"`)
     */
    readImages: (name: string, type: string) => url(`/api/readImages/${encodeURIComponent(name)}/${type}`),

    /**
     * Returns or sets the rotation metadata for an image.
     *
     * `GET /api/rotation/<name>/<type>`
     * @param name - Image name (URL-encoded)
     * @param type - Image type/size variant
     */
    rotation: (name: string, type: string) => url(`/api/rotation/${encodeURIComponent(name)}/${type}`),

    // -------------------------------------------------------------------------
    // File Share
    // -------------------------------------------------------------------------

    /**
     * Returns the list of files available for download from the file share.
     *
     * `GET /api/getAvailableFiles`
     */
    getAvailableFiles: () => url('/api/getAvailableFiles'),

    /**
     * Returns a download URL for the specified shared file.
     *
     * `GET /api/file?file=<file>`
     * @param file - File path/name (URL-encoded)
     */
    fileDownload: (file: string) => url(`/api/file?file=${encodeURIComponent(file)}`),

    /**
     * Deletes the specified file from the file share.
     *
     * `GET /api/delete?file=<file>`
     * @param file - File path/name (URL-encoded)
     */
    fileDelete: (file: string) => url(`/api/delete?file=${encodeURIComponent(file)}`),

    /**
     * Upload endpoint for one or more files to the file share.
     *
     * `POST /api/upload_files`
     */
    uploadFiles: () => url('/api/upload_files'),

    // -------------------------------------------------------------------------
    // Games
    // -------------------------------------------------------------------------

    /**
     * Returns the word list used by word-game features.
     *
     * `GET /api/getWordList`
     */
    getWordList: () => url('/api/getWordList'),
}
