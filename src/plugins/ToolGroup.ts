import { ChartContext, Plugin, PluginConfig } from '../types';
import { AbstractPlugin } from '../components/AbstractPlugin';

export interface ToolGroupConfig extends Omit<PluginConfig, 'id'> {
    id?: string;
    name: string;
    icon?: string;
}

export class ToolGroup extends AbstractPlugin {
    private plugins: Plugin[] = [];
    private activeSubPlugin: Plugin | null = null;
    private menuElement: HTMLElement | null = null;
    private buttonElement: HTMLElement | null = null;
    private originalIcon: string = '';
    private arrowSvg: string = '';

    constructor(config: ToolGroupConfig) {
        // Create a small right-facing chevron arrow to indicate a dropdown menu
        const arrowSvg = `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; right: -4px; top: 50%; transform: translateY(-50%); opacity: 0.6;"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
        
        let enhancedIcon = '';
        if (config.icon) {
            enhancedIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    ${config.icon}
                </div>
                ${arrowSvg}
            </div>`;
        } else {
            enhancedIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                <span>${config.name.substring(0, 2).toUpperCase()}</span>
                ${arrowSvg}
            </div>`;
        }

        super({
            id: config.id || `group-${config.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: config.name,
            icon: enhancedIcon
        });
        
        this.originalIcon = enhancedIcon;
        this.arrowSvg = arrowSvg;
    }

    public add(plugin: Plugin): void {
        this.plugins.push(plugin);
    }

    protected onInit(): void {
        this.plugins.forEach(p => p.init(this.context));
    }

    protected onActivate(): void {
        this.showMenu();
    }

    protected onDeactivate(): void {
        this.hideMenu();
        if (this.activeSubPlugin) {
            this.activeSubPlugin.deactivate?.();
            this.activeSubPlugin = null;
        }
        
        // Restore original icon
        if (this.buttonElement) {
            this.buttonElement.innerHTML = this.originalIcon;
        }
    }

    protected onDestroy(): void {
        this.hideMenu();
        this.plugins.forEach(p => p.destroy?.());
    }

    private showMenu(): void {
        this.buttonElement = document.getElementById(`qfchart-plugin-btn-${this.id}`);
        if (!this.buttonElement) return;

        if (this.menuElement) {
            this.hideMenu();
        }

        this.menuElement = document.createElement('div');
        Object.assign(this.menuElement.style, {
            position: 'fixed',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            zIndex: '10000',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            minWidth: '150px'
        });

        this.plugins.forEach(plugin => {
            const item = document.createElement('div');
            Object.assign(item.style, {
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#cbd5e1',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: this.context.getOptions().fontFamily || 'sans-serif',
                transition: 'background-color 0.2s'
            });

            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            });
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'transparent';
            });

            if (plugin.icon) {
                const iconContainer = document.createElement('div');
                iconContainer.innerHTML = plugin.icon;
                Object.assign(iconContainer.style, {
                    width: '20px',
                    height: '20px',
                    marginRight: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                });
                const svg = iconContainer.querySelector('svg');
                if (svg) {
                    svg.style.width = '100%';
                    svg.style.height = '100%';
                }
                item.appendChild(iconContainer);
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = plugin.name || plugin.id;
            item.appendChild(nameSpan);

            item.addEventListener('click', (e) => {
                e.stopPropagation();
                this.activateSubPlugin(plugin);
            });

            this.menuElement!.appendChild(item);
        });

        document.body.appendChild(this.menuElement);

        const rect = this.buttonElement.getBoundingClientRect();
        this.menuElement.style.top = `${rect.top}px`;
        this.menuElement.style.left = `${rect.right + 5}px`;

        // Delay attaching the outside click listener so it doesn't fire on the current click
        setTimeout(() => {
            document.addEventListener('click', this.handleOutsideClick);
        }, 0);
    }

    private hideMenu(): void {
        if (this.menuElement && this.menuElement.parentNode) {
            this.menuElement.parentNode.removeChild(this.menuElement);
        }
        this.menuElement = null;
        document.removeEventListener('click', this.handleOutsideClick);
    }

    private handleOutsideClick = (e: MouseEvent): void => {
        if (this.menuElement && !this.menuElement.contains(e.target as Node)) {
            this.hideMenu();
            if (!this.activeSubPlugin) {
                // If clicked outside and no sub-plugin is active, deactivate the group
                this.buttonElement?.click();
            }
        }
    };

    private activateSubPlugin(plugin: Plugin): void {
        this.hideMenu();
        
        if (this.activeSubPlugin) {
            this.activeSubPlugin.deactivate?.();
        }

        this.activeSubPlugin = plugin;
        this.activeSubPlugin.activate?.();

        // Update the group's button icon to match the active plugin
        if (this.buttonElement) {
            let subIcon = '';
            if (plugin.icon) {
                subIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                        ${plugin.icon}
                    </div>
                    ${this.arrowSvg}
                </div>`;
            } else {
                subIcon = `<div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
                    <span>${(plugin.name || plugin.id).substring(0, 2).toUpperCase()}</span>
                    ${this.arrowSvg}
                </div>`;
            }
            this.buttonElement.innerHTML = subIcon;
        }
    }
}
