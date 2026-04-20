// Shared type definitions — no runtime code

/**
 * @typedef {Object} Options
 * @property {string} dateFormat
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
 * @property {string} title
 * @property {string} url
 * @property {string | null} author
 * @property {string | null} date
 */

/**
 * @typedef {Object} MetadataAIMessage
 * @property {"metadata-ai"} type
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
