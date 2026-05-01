// Shared type definitions — no runtime code

/**
 * @typedef {Object} Options
 * @property {DateFormatCode} dateFormat
 * @property {FormattingStyle} formattingStyle
 * @property {boolean} omitEmptyFields
 * @property {boolean} includeAccessDate
 * @property {boolean} noInferAuthor
 * @property {boolean} noInferDate
 * @property {boolean} enableAI
 */

/**
 * @typedef {Object} MetadataMessage
 * @property {"metadata"} type
 * @property {string} requestId
 * @property {string} title
 * @property {string} url
 * @property {string | null} author
 * @property {string | null} date
 */

/**
 * @typedef {Object} MetadataAIMessage
 * @property {"metadata-ai"} type
 * @property {string} requestId
 * @property {string} title
 * @property {string} url
 * @property {string} author
 * @property {string} date
 * @property {PublicationType | null} publicationType
 * @property {string | null} abstract
 * @property {string | null} citationKey
 */

/**
 * @typedef {Object} ClipboardMessage
 * @property {"copy-data-to-clipboard"} type
 * @property {"offscreen-doc"} target
 * @property {string} data
 */

/**
 * @typedef {Object} LegacyOptionsRequest
 * @property {"get-legacy-options"} type
 * @property {"offscreen-doc"} target
 */

/**
 * @typedef {Object} CloseOffscreenRequest
 * @property {"close-offscreen"} type
 * @property {"offscreen-doc"} target
 */

/**
 * @typedef {Object} LegacyOptionsResponse
 * @property {Options | null} legacyOptions
 */

/**
 * @typedef {Object} AIResult
 * @property {string} [author]
 * @property {string} [date]
 * @property {PublicationType} [publicationType]
 * @property {string} [abstract]
 * @property {string} [citationKey]
 */

/**
 * @typedef {Object} HeuristicMeta
 * @property {string} title
 * @property {string | null} author
 * @property {string | null} date
 */

/**
 * @typedef {Object} AIFields
 * @property {PublicationType | null} [publicationType]
 * @property {string | null} [abstract]
 * @property {string | null} [citationKey]
 */

/** @typedef {"wikipedia" | "misc" | "online"} FormattingStyle */

/** @typedef {"M-1"|"M-2"|"M-3"|"L-1"|"L-2"|"L-3"|"B-1"|"B-2"|"B-3"|"O-1"} DateFormatCode */

/** @typedef {"article"|"blogpost"|"report"|"documentation"|"news"|"book"|"other"} PublicationType */

/**
 * @typedef {Object} StorageLike
 * @property {(key: string) => string | null} getItem
 */

/**
 * @typedef {Object} BibtexCoreAPI
 * @property {Options} defaultOptions
 * @property {DateFormatCode[]} validDateFormats
 * @property {FormattingStyle[]} validFormattingStyles
 * @property {(rawOptions: Partial<Options> | undefined) => Options} normalizeOptions
 * @property {(storage: StorageLike) => Options | null} parseLegacyOptions
 * @property {(d: Date, format: DateFormatCode) => string} formatDate
 * @property {(str: string) => string} bescape
 * @property {(str: string) => string} lescape
 * @property {(key: string) => string} sanitizeCitationKey
 * @property {(doc: Pick<Document, "title" | "querySelector">, pageUrl: string) => HeuristicMeta & { url: string }} extractHeuristicMetadata
 * @property {(tabTitle: string, tabUrl: string, author: string, date: string, formattingStyle: FormattingStyle, dateFormat: DateFormatCode, omitEmpty: boolean, includeAccessed: boolean, aiFields?: AIFields) => string} generateBibTeXEntry
 */
