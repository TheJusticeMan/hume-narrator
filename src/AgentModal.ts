import { App, Modal, Notice } from 'obsidian';
import { Hume, HumeClient } from 'hume';
import type { EmpathicNarratorSettings } from './types';

/**
 * Modal for the Empathic Voice Interface (EVI).
 * Handles voice input via microphone and displays AI responses.
 */
export class AgentModal extends Modal {
    private settings: EmpathicNarratorSettings;
    private mediaStream: MediaStream | null = null;
    private socket: Hume.empathicVoice.chat.ChatSocket | null = null;
    private isListening = false;
    private mediaRecorder: MediaRecorder | null = null;
    
    // UI elements
    private statusEl: HTMLElement | null = null;
    private transcriptionEl: HTMLElement | null = null;
    private responseEl: HTMLElement | null = null;
    private startButton: HTMLButtonElement | null = null;

    constructor(app: App, settings: EmpathicNarratorSettings) {
        super(app);
        this.settings = settings;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('empathic-narrator-modal');

        // Header
        contentEl.createEl('h2', { text: 'Voice Brainstorm' });

        // Status indicator
        this.statusEl = contentEl.createDiv({ cls: 'evi-status' });
        this.statusEl.setText('Ready to start');

        // Start/Stop button
        const buttonContainer = contentEl.createDiv({ cls: 'evi-button-container' });
        this.startButton = buttonContainer.createEl('button', {
            text: 'Start Listening',
            cls: 'mod-cta'
        });
        this.startButton.addEventListener('click', () => this.toggleListening());

        // Transcription display
        contentEl.createEl('h3', { text: 'Your Input:' });
        this.transcriptionEl = contentEl.createDiv({ cls: 'evi-transcription' });
        this.transcriptionEl.setText('Waiting for input...');

        // AI Response display
        contentEl.createEl('h3', { text: 'AI Response:' });
        this.responseEl = contentEl.createDiv({ cls: 'evi-response' });
        this.responseEl.setText('Waiting for response...');
    }

    onClose(): void {
        this.stopListening();
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Toggles the listening state
     */
    private async toggleListening(): Promise<void> {
        if (this.isListening) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }

    /**
     * Starts the voice listening session
     */
    private async startListening(): Promise<void> {
        if (!this.settings.humeApiKey) {
            new Notice('Please configure your Hume API key in settings.');
            return;
        }

        try {
            this.updateStatus('Requesting microphone access...');

            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            this.updateStatus('Connecting to Hume EVI...');

            // Create Hume client
            const client = new HumeClient({
                apiKey: this.settings.humeApiKey,
            });

            // Connect to EVI WebSocket
            this.socket = client.empathicVoice.chat.connect({});

            // Set up socket event handlers
            this.setupSocketHandlers();

            // Connect and wait for open
            this.socket.connect();
            await this.socket.waitForOpen();

            // Start audio recording and streaming
            await this.startAudioStreaming();

            this.isListening = true;
            this.updateStatus('Listening...');
            if (this.startButton) {
                this.startButton.setText('Stop Listening');
                this.startButton.removeClass('mod-cta');
                this.startButton.addClass('mod-warning');
            }

        } catch (error) {
            console.error('Error starting voice session:', error);
            const message = error instanceof Error ? error.message : 'Unknown error';
            new Notice(`Failed to start voice session: ${message}`);
            this.updateStatus('Error: ' + message);
            this.stopListening();
        }
    }

    /**
     * Stops the voice listening session
     */
    private stopListening(): void {
        // Stop media recorder
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;

        // Stop media stream
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Close WebSocket
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.isListening = false;
        this.updateStatus('Stopped');
        if (this.startButton) {
            this.startButton.setText('Start Listening');
            this.startButton.addClass('mod-cta');
            this.startButton.removeClass('mod-warning');
        }
    }

    /**
     * Sets up WebSocket event handlers for the EVI connection
     */
    private setupSocketHandlers(): void {
        if (!this.socket) return;

        this.socket.on('open', () => {
            console.log('EVI WebSocket connected');
            this.updateStatus('Connected to EVI');
        });

        this.socket.on('message', (message) => {
            this.handleSocketMessage(message);
        });

        this.socket.on('error', (error) => {
            console.error('EVI WebSocket error:', error);
            new Notice('Connection error occurred');
            this.updateStatus('Connection error');
        });

        this.socket.on('close', () => {
            console.log('EVI WebSocket closed');
            if (this.isListening) {
                this.stopListening();
            }
        });
    }

    /**
     * Handles incoming WebSocket messages from EVI
     */
    private handleSocketMessage(message: Hume.empathicVoice.SubscribeEvent): void {
        switch (message.type) {
            case 'user_message':
                // Display user transcription
                if (message.message?.content) {
                    if (this.transcriptionEl) {
                        this.transcriptionEl.setText(message.message.content);
                    }
                }
                break;

            case 'assistant_message':
                // Display AI response text
                if (message.message?.content) {
                    if (this.responseEl) {
                        this.responseEl.setText(message.message.content);
                    }
                }
                break;

            case 'audio_output':
                // Play AI audio response
                if (message.data) {
                    this.playAudioResponse(message.data);
                }
                break;

            case 'user_interruption':
                this.updateStatus('Interrupted - listening...');
                break;

            case 'error':
                console.error('EVI error:', message);
                new Notice('EVI error occurred');
                break;
        }
    }

    /**
     * Starts streaming audio from the microphone to EVI
     */
    private async startAudioStreaming(): Promise<void> {
        if (!this.mediaStream || !this.socket) return;

        // Determine supported MIME type for broader platform compatibility
        const mimeType = this.getSupportedMimeType();

        // Create MediaRecorder for audio capture
        const options: MediaRecorderOptions = {};
        if (mimeType) {
            options.mimeType = mimeType;
        }
        this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && this.socket) {
                // Store socket reference to avoid race condition
                const socket = this.socket;
                
                // Convert blob to base64 and send
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64 = reader.result as string;
                    const base64Data = base64.split(',')[1];
                    // Check socket is still available before sending
                    if (base64Data && socket && socket.readyState === 1) {
                        socket.sendAudioInput({ data: base64Data });
                    }
                };
                reader.onerror = () => {
                    console.error('Error reading audio data');
                };
                reader.readAsDataURL(event.data);
            }
        };

        // Start recording with a timeslice for streaming (250ms for better mobile performance)
        this.mediaRecorder.start(250);
    }

    /**
     * Gets a supported MIME type for MediaRecorder
     * Checks for platform compatibility and falls back to defaults
     */
    private getSupportedMimeType(): string | undefined {
        const mimeTypes = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/ogg;codecs=opus',
            ''  // Empty string lets browser choose default
        ];

        for (const mimeType of mimeTypes) {
            if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
                return mimeType || undefined;
            }
        }
        return undefined;
    }

    /**
     * Plays audio response from EVI
     */
    private playAudioResponse(base64Audio: string): void {
        try {
            // Decode base64 audio
            const binaryString = atob(base64Audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Create blob and play
            const audioBlob = new Blob([bytes], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
            
            audio.play().catch(error => {
                console.error('Error playing audio:', error);
            });
        } catch (error) {
            console.error('Error playing audio response:', error);
        }
    }

    /**
     * Updates the status display
     */
    private updateStatus(status: string): void {
        if (this.statusEl) {
            this.statusEl.setText(status);
        }
    }
}
