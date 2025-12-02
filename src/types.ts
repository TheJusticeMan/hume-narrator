/**
 * Plugin settings interface
 */
export interface EmpathicNarratorSettings {
    humeApiKey: string;
}

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: EmpathicNarratorSettings = {
    humeApiKey: ''
};
