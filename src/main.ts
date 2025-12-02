import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { EmpathicNarratorSettings, DEFAULT_SETTINGS } from './types';
import { EmpathicNarratorSettingTab } from './SettingsTab';
import { HumeService } from './HumeService';
import { AgentModal } from './AgentModal';

/**
 * Empathic Narrator Plugin
 * 
 * An Obsidian plugin that uses Hume AI to provide empathic text-to-speech
 * and voice interaction capabilities.
 * 
 * Mobile-safe: Designed to work on both Desktop and Mobile (Android/iOS)
 * without Node.js runtime dependencies.
 */
export default class EmpathicNarratorPlugin extends Plugin {
    settings: EmpathicNarratorSettings;
    humeService: HumeService;

    async onload(): Promise<void> {
        await this.loadSettings();

        // Initialize Hume service
        this.humeService = new HumeService(this.settings);

        // Add ribbon icon for Voice Brainstorm
        const ribbonIconEl = this.addRibbonIcon(
            'microphone',
            'Voice Brainstorm',
            (_evt: MouseEvent) => {
                if (!this.humeService.hasCredentials()) {
                    new Notice('Please configure your Hume API credentials in settings.');
                    return;
                }
                new AgentModal(this.app, this.settings).open();
            }
        );
        ribbonIconEl.addClass('empathic-narrator-ribbon');

        // Add command: Read Selection with Emotion
        this.addCommand({
            id: 'read-selection-with-emotion',
            name: 'Read Selection with Emotion',
            editorCallback: async (editor: Editor, _view: MarkdownView) => {
                const selection = editor.getSelection();
                
                if (!selection || selection.trim() === '') {
                    new Notice('Please select some text to read.');
                    return;
                }

                if (!this.humeService.hasCredentials()) {
                    new Notice('Please configure your Hume API credentials in settings.');
                    return;
                }

                try {
                    await this.humeService.streamTextToSpeech(selection);
                } catch (error) {
                    // Error already handled in HumeService
                    console.error('Read selection error:', error);
                }
            }
        });

        // Add command: Open Voice Brainstorm
        this.addCommand({
            id: 'open-voice-brainstorm',
            name: 'Open Voice Brainstorm',
            callback: () => {
                if (!this.humeService.hasCredentials()) {
                    new Notice('Please configure your Hume API credentials in settings.');
                    return;
                }
                new AgentModal(this.app, this.settings).open();
            }
        });

        // Add settings tab
        this.addSettingTab(new EmpathicNarratorSettingTab(this.app, this));
    }

    onunload(): void {
        // Stop any playing audio when plugin is disabled
        if (this.humeService) {
            this.humeService.stopCurrentAudio();
        }
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
        // Update the HumeService with new settings
        if (this.humeService) {
            this.humeService.updateSettings(this.settings);
        }
    }
}
