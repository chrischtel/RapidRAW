import { useState, useCallback } from 'react';
import { Type, Image, Upload, Eye, EyeOff } from 'lucide-react';
import Button from '../../ui/Button';
import Switch from '../../ui/Switch';
import Slider from '../../ui/Slider';
import Input from '../../ui/Input';
import Dropdown from '../../ui/Dropdown';
import CollapsibleSection from '../../ui/CollapsibleSection';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  WATERMARK_METADATA_PLACEHOLDERS, 
  WATERMARK_FONT_FAMILIES, 
  WATERMARK_ALIGNMENTS 
} from '../../../utils/watermark';

export default function WatermarkPanel({ 
  watermarkSettings, 
  onSettingsChange
}) {
  const [previewVisible, setPreviewVisible] = useState(false);

  const updateSettings = useCallback((updates) => {
    onSettingsChange({ ...watermarkSettings, ...updates });
  }, [watermarkSettings, onSettingsChange]);

  const updateTextSettings = useCallback((updates) => {
    const newTextSettings = { ...watermarkSettings.textSettings, ...updates };
    updateSettings({ textSettings: newTextSettings });
  }, [watermarkSettings.textSettings, updateSettings]);

  const updatePosition = useCallback((updates) => {
    const newPosition = { ...watermarkSettings.position, ...updates };
    updateSettings({ position: newPosition });
  }, [watermarkSettings.position, updateSettings]);

  const handleSelectWatermarkImage = async () => {
    try {
      const selected = await open({
        title: 'Select Watermark Image',
        filters: [
          { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'gif'] }
        ]
      });
      
      if (selected) {
        updateSettings({ imagePath: selected, watermarkType: 'Image' });
      }
    } catch (error) {
      console.error('Failed to select watermark image:', error);
    }
  };

  const insertPlaceholder = (placeholder) => {
    const currentText = watermarkSettings.textSettings?.text || '';
    const newText = currentText + placeholder;
    updateTextSettings({ text: newText });
  };

  const ColorPicker = ({ color, onChange, label }) => (
    <div className="flex items-center gap-2">
      <label className="text-sm text-text-secondary w-16">{label}</label>
      <input
        type="color"
        value={`#${color.slice(0, 3).map(c => c.toString(16).padStart(2, '0')).join('')}`}
        onChange={(e) => {
          const hex = e.target.value.slice(1);
          const r = parseInt(hex.slice(0, 2), 16);
          const g = parseInt(hex.slice(2, 4), 16);
          const b = parseInt(hex.slice(4, 6), 16);
          onChange([r, g, b, color[3]]);
        }}
        className="w-8 h-8 rounded border border-surface cursor-pointer"
      />
      <Slider
        min={0}
        max={255}
        value={color[3]}
        onChange={(alpha) => onChange([...color.slice(0, 3), alpha])}
        className="flex-1"
      />
      <span className="text-xs text-text-secondary w-8">{Math.round(color[3] / 255 * 100)}%</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-surface">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Watermark</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewVisible(!previewVisible)}
              className="p-1.5 rounded-md text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
              title={previewVisible ? "Hide Preview" : "Show Preview"}
            >
              {previewVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <Switch
              checked={watermarkSettings.enabled}
              onChange={(enabled) => updateSettings({ enabled })}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Watermark Type */}
        <CollapsibleSection title="Type" defaultOpen>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateSettings({ watermarkType: 'Text' })}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
                watermarkSettings.watermarkType === 'Text'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-surface bg-surface hover:bg-card-active text-text-secondary'
              }`}
            >
              <Type size={20} />
              <span className="text-sm">Text</span>
            </button>
            
            <button
              onClick={() => updateSettings({ watermarkType: 'Image' })}
              className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-colors ${
                watermarkSettings.watermarkType === 'Image'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-surface bg-surface hover:bg-card-active text-text-secondary'
              }`}
            >
              <Image size={20} />
              <span className="text-sm">Image</span>
            </button>
          </div>
        </CollapsibleSection>

        {/* Text Watermark Settings */}
        {watermarkSettings.watermarkType === 'Text' && (
          <CollapsibleSection title="Text Settings" defaultOpen>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Text Content</label>
                <textarea
                  value={watermarkSettings.textSettings?.text || ''}
                  onChange={(e) => updateTextSettings({ text: e.target.value })}
                  placeholder="Enter watermark text..."
                  className="w-full h-20 bg-bg-primary border border-surface rounded-md p-2 text-sm text-text-primary resize-none focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Metadata Placeholders</label>
                <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                  {WATERMARK_METADATA_PLACEHOLDERS.map(({ placeholder, description }) => (
                    <button
                      key={placeholder}
                      onClick={() => insertPlaceholder(placeholder)}
                      className="text-left p-1 text-xs bg-surface hover:bg-card-active rounded text-text-secondary hover:text-text-primary transition-colors"
                      title={description}
                    >
                      {placeholder}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Font Family</label>
                  <Dropdown
                    value={watermarkSettings.textSettings?.fontFamily || 'Arial'}
                    onChange={(fontFamily) => updateTextSettings({ fontFamily })}
                    options={WATERMARK_FONT_FAMILIES.map(font => ({ value: font, label: font }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-text-secondary mb-1">Font Size</label>
                  <Slider
                    min={8}
                    max={72}
                    value={watermarkSettings.textSettings?.fontSize || 24}
                    onChange={(fontSize) => updateTextSettings({ fontSize })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <ColorPicker
                  color={watermarkSettings.textSettings?.color || [255, 255, 255, 255]}
                  onChange={(color) => updateTextSettings({ color })}
                  label="Color"
                />
              </div>

              <div className="flex items-center gap-4">
                <Switch
                  label="Bold"
                  checked={watermarkSettings.textSettings?.bold || false}
                  onChange={(bold) => updateTextSettings({ bold })}
                />
                <Switch
                  label="Italic"
                  checked={watermarkSettings.textSettings?.italic || false}
                  onChange={(italic) => updateTextSettings({ italic })}
                />
              </div>

              <div className="space-y-2">
                <Switch
                  label="Shadow"
                  checked={watermarkSettings.textSettings?.shadow || false}
                  onChange={(shadow) => updateTextSettings({ shadow })}
                />
                
                {watermarkSettings.textSettings?.shadow && (
                  <div className="ml-4 space-y-2">
                    <ColorPicker
                      color={watermarkSettings.textSettings?.shadowColor || [0, 0, 0, 128]}
                      onChange={(shadowColor) => updateTextSettings({ shadowColor })}
                      label="Shadow"
                    />
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Offset X</label>
                        <Slider
                          min={-10}
                          max={10}
                          value={watermarkSettings.textSettings?.shadowOffsetX || 1}
                          onChange={(shadowOffsetX) => updateTextSettings({ shadowOffsetX })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">Offset Y</label>
                        <Slider
                          min={-10}
                          max={10}
                          value={watermarkSettings.textSettings?.shadowOffsetY || 1}
                          onChange={(shadowOffsetY) => updateTextSettings({ shadowOffsetY })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Image Watermark Settings */}
        {watermarkSettings.watermarkType === 'Image' && (
          <CollapsibleSection title="Image Settings" defaultOpen>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Watermark Image</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={watermarkSettings.imagePath || ''}
                    onChange={(e) => updateSettings({ imagePath: e.target.value })}
                    placeholder="Select watermark image..."
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={handleSelectWatermarkImage} variant="secondary">
                    <Upload size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Position Settings */}
        <CollapsibleSection title="Position & Size" defaultOpen>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Horizontal</label>
                <Dropdown
                  value={watermarkSettings.position?.horizontal || 'Right'}
                  onChange={(horizontal) => updatePosition({ horizontal })}
                  options={WATERMARK_ALIGNMENTS.horizontal}
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-secondary mb-1">Vertical</label>
                <Dropdown
                  value={watermarkSettings.position?.vertical || 'Bottom'}
                  onChange={(vertical) => updatePosition({ vertical })}
                  options={WATERMARK_ALIGNMENTS.vertical}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Margin X</label>
                <Slider
                  min={0}
                  max={200}
                  value={watermarkSettings.position?.marginX || 50}
                  onChange={(marginX) => updatePosition({ marginX })}
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-secondary mb-1">Margin Y</label>
                <Slider
                  min={0}
                  max={200}
                  value={watermarkSettings.position?.marginY || 50}
                  onChange={(marginY) => updatePosition({ marginY })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Scale</label>
                <Slider
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={watermarkSettings.scale || 1.0}
                  onChange={(scale) => updateSettings({ scale })}
                />
              </div>
              
              <div>
                <label className="block text-sm text-text-secondary mb-1">Opacity</label>
                <Slider
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={watermarkSettings.opacity || 0.8}
                  onChange={(opacity) => updateSettings({ opacity })}
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
