import { App, PluginSettingTab, Setting } from 'obsidian';
import type EmpathicNarratorPlugin from './main';

/**
 * Settings tab for the Empathic Narrator plugin.
 * Allows users to input their Hume API Key.
 */
export class EmpathicNarratorSettingTab extends PluginSettingTab {
    plugin: EmpathicNarratorPlugin;

    constructor(app: App, plugin: EmpathicNarratorPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Empathic Narrator Settings' });

        containerEl.createEl('p', { 
            text: 'Enter your Hume AI API key below. You can obtain this from your Hume AI dashboard.',
            cls: 'setting-item-description'
        });

        new Setting(containerEl)
            .setName('Hume API Key')
            .setDesc('Your Hume AI API key')
            .addText(text => {
                text.inputEl.type = 'password';
                return text
                    .setPlaceholder('Enter your API key')
                    .setValue(this.plugin.settings.humeApiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.humeApiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        containerEl.createEl('p', {
            text: 'Note: Your API key is stored locally and is only used to authenticate with Hume AI services.',
            cls: 'setting-item-description mod-warning'
        });
    }
}
