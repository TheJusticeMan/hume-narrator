import { HumeClient } from 'hume';
import { Buffer } from 'buffer';
import { Notice } from 'obsidian';
import type { EmpathicNarratorSettings } from './types';

/**
 * Service class to handle Hume AI API calls.
 * Designed to be mobile-safe by avoiding Node.js-specific modules.
 */
export class HumeService {
    private settings: EmpathicNarratorSettings;
    private client: HumeClient | null = null;
    private currentAudio: HTMLAudioElement | null = null;

    constructor(settings: EmpathicNarratorSettings) {
        this.settings = settings;
    }

    /**
     * Updates the settings reference (called when settings change)
     */
    updateSettings(settings: EmpathicNarratorSettings): void {
        this.settings = settings;
        this.client = null; // Reset client when settings change
    }

    /**
     * Gets or creates a Hume client instance
     */
    private getClient(): HumeClient {
        if (!this.settings.humeApiKey) {
            throw new Error('Hume API key is not configured. Please set it in the plugin settings.');
        }

        if (!this.client) {
            this.client = new HumeClient({
                apiKey: this.settings.humeApiKey,
            });
        }

        return this.client;
    }

    /**
     * Streams text to speech using Hume AI TTS API.
     * Mobile-safe: Uses Blob objects and HTML5 Audio instead of fs.
     * 
     * @param text - The text to synthesize
     * @param description - Optional voice description for the TTS
     */
    async streamTextToSpeech(text: string, description?: string): Promise<void> {
        if (!text || text.trim() === '') {
            throw new Error('Text cannot be empty');
        }

        try {
            const client = this.getClient();

            // Stop any currently playing audio
            this.stopCurrentAudio();

            new Notice('Synthesizing speech...');

            // Call the Hume TTS API using utterances format
            const response = await client.tts.synthesizeJson({
                utterances: [{
                    text: text,
                    description: description
                }]
            });

            // Check if we have audio data
            if (!response.generations || response.generations.length === 0) {
                throw new Error('No audio was generated');
            }

            const generation = response.generations[0];
            
            // The generation has a top-level audio field with the complete audio
            if (generation.audio) {
                // Decode base64 audio using the buffer polyfill (mobile-safe)
                const audioBuffer = Buffer.from(generation.audio, 'base64');
                const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

                // Create object URL for playback
                const audioUrl = URL.createObjectURL(audioBlob);

                // Play audio using HTML5 Audio (mobile-compatible)
                await this.playAudio(audioUrl);
            } else {
                throw new Error('No audio data in response');
            }

        } catch (error) {
            console.error('Hume TTS Error:', error);
            const message = error instanceof Error ? error.message : 'Unknown error occurred';
            new Notice(`Error: ${message}`);
            throw error;
        }
    }

    /**
     * Plays audio from a URL using HTML5 Audio
     * @param audioUrl - The URL of the audio to play
     */
    private playAudio(audioUrl: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            this.currentAudio = audio;

            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = () => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                reject(new Error('Failed to play audio'));
            };

            audio.play().catch((error) => {
                URL.revokeObjectURL(audioUrl);
                this.currentAudio = null;
                reject(error);
            });
        });
    }

    /**
     * Stops any currently playing audio
     */
    stopCurrentAudio(): void {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    /**
     * Validates that API credentials are configured
     */
    hasCredentials(): boolean {
        return Boolean(this.settings.humeApiKey);
    }
}
