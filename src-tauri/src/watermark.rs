use serde::{Deserialize, Serialize};
use image::{DynamicImage, Rgba};
use imageproc::drawing::{draw_text_mut, text_size};
use ab_glyph::{FontVec, PxScale};
use anyhow::Result;


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkSettings {
    pub enabled: bool,
    pub watermark_type: WatermarkType,
    pub position: WatermarkPosition,
    pub scale: f32, // 0.1 to 2.0
    pub opacity: f32, // 0.0 to 1.0
    pub text_settings: Option<TextWatermarkSettings>,
    pub image_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WatermarkType {
    Text,
    Image,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WatermarkPosition {
    pub horizontal: HorizontalAlignment,
    pub vertical: VerticalAlignment,
    pub margin_x: i32, // pixels from edge
    pub margin_y: i32, // pixels from edge
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HorizontalAlignment {
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VerticalAlignment {
    Top,
    Center,
    Bottom,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TextWatermarkSettings {
    pub text: String,
    pub font_size: f32,
    pub color: [u8; 4], // RGBA
    pub font_family: String,
    pub bold: bool,
    pub italic: bool,
    pub shadow: bool,
    pub shadow_color: [u8; 4], // RGBA
    pub shadow_offset_x: i32,
    pub shadow_offset_y: i32,
}

impl Default for WatermarkSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            watermark_type: WatermarkType::Text,
            position: WatermarkPosition {
                horizontal: HorizontalAlignment::Right,
                vertical: VerticalAlignment::Bottom,
                margin_x: 50,
                margin_y: 50,
            },
            scale: 1.0,
            opacity: 0.8,
            text_settings: Some(TextWatermarkSettings {
                text: "© {photographer} - {camera_make} {camera_model} - {focal_length}mm f/{aperture} {shutter_speed}s ISO{iso}".to_string(),
                font_size: 24.0,
                color: [255, 255, 255, 255],
                font_family: "Arial".to_string(),
                bold: false,
                italic: false,
                shadow: true,
                shadow_color: [0, 0, 0, 128],
                shadow_offset_x: 1,
                shadow_offset_y: 1,
            }),
            image_path: None,
        }
    }
}

// Metadata placeholders for text watermarks
pub fn replace_metadata_placeholders(
    text: &str,
    metadata: &crate::image_processing::ImageMetadata,
    filename: &str,
) -> String {
    let mut result = text.to_string();
    
    if let Some(exif) = metadata.adjustments.get("exif") {
        // Camera info
        if let Some(make) = exif.get("Make").and_then(|v| v.as_str()) {
            result = result.replace("{camera_make}", make);
        }
        if let Some(model) = exif.get("Model").and_then(|v| v.as_str()) {
            result = result.replace("{camera_model}", model);
        }
        
        // Lens info
        if let Some(lens) = exif.get("LensModel").and_then(|v| v.as_str()) {
            result = result.replace("{lens_model}", lens);
        }
        
        // Exposure settings
        if let Some(aperture) = exif.get("FNumber").and_then(|v| v.as_f64()) {
            result = result.replace("{aperture}", &format!("{:.1}", aperture));
        }
        if let Some(shutter) = exif.get("ExposureTime").and_then(|v| v.as_f64()) {
            if shutter >= 1.0 {
                result = result.replace("{shutter_speed}", &format!("{:.1}", shutter));
            } else {
                result = result.replace("{shutter_speed}", &format!("1/{}", (1.0 / shutter).round() as i32));
            }
        }
        if let Some(iso) = exif.get("PhotographicSensitivity").and_then(|v| v.as_i64()) {
            result = result.replace("{iso}", &iso.to_string());
        }
        if let Some(focal) = exif.get("FocalLength").and_then(|v| v.as_f64()) {
            result = result.replace("{focal_length}", &format!("{:.0}", focal));
        }
        
        // Date/time
        if let Some(datetime) = exif.get("DateTime").and_then(|v| v.as_str()) {
            result = result.replace("{date_time}", datetime);
        }
        
        // Photographer
        if let Some(artist) = exif.get("Artist").and_then(|v| v.as_str()) {
            result = result.replace("{photographer}", artist);
        }
    }
    // File info
    result = result.replace("{filename}", filename);
    
    // Remove any unresolved placeholders
    result = result.replace("{camera_make}", "");
    result = result.replace("{camera_model}", "");
    result = result.replace("{lens_model}", "");
    result = result.replace("{aperture}", "");
    result = result.replace("{shutter_speed}", "");
    result = result.replace("{iso}", "");
    result = result.replace("{focal_length}", "");
    result = result.replace("{date_time}", "");
    result = result.replace("{photographer}", "");
    
    result
}

// Rendering

pub struct WatermarkRenderer {
    fonts: std::collections::HashMap<String, FontVec>,
}

impl WatermarkRenderer {
    pub fn new() -> Result<Self> {
        let mut fonts = std::collections::HashMap::new();
        
        // Try to load system fonts, but don't fail if none are found for now
        if let Err(e) = Self::try_load_system_fonts(&mut fonts) {
            println!("Warning: Failed to load system fonts: {}", e);
            // Create an empty renderer for now - we can handle this better later
        }
        
        Ok(Self { fonts })
    }

        fn try_load_system_fonts(fonts: &mut std::collections::HashMap<String, FontVec>) -> Result<()> {
        // Try to load common system fonts
        let font_paths = Self::get_system_font_paths();
        
        for (name, paths) in font_paths {
            for path in paths {
                if let Ok(font_data) = std::fs::read(&path) {
                    if let Ok(font) = FontVec::try_from_vec(font_data) {
                        fonts.insert(name.clone(), font);
                        break;
                    }
                }
            }
        }
        
        // If no system fonts found, create a minimal fallback
        if fonts.is_empty() {
            // Use a very basic built-in font approach or return an error
            return Err(anyhow::anyhow!("No suitable fonts found on system"));
        }
        
        Ok(())
    }
    
    fn get_system_font_paths() -> Vec<(String, Vec<String>)> {
        let mut paths = Vec::new();
        
        #[cfg(target_os = "windows")]
        {
            paths.push(("Arial".to_string(), vec![
                "C:/Windows/Fonts/arial.ttf".to_string(),
                "C:/Windows/Fonts/Arial.ttf".to_string(),
            ]));
            paths.push(("Default".to_string(), vec![
                "C:/Windows/Fonts/calibri.ttf".to_string(),
                "C:/Windows/Fonts/tahoma.ttf".to_string(),
            ]));
        }
        
        #[cfg(target_os = "macos")]
        {
            paths.push(("Arial".to_string(), vec![
                "/System/Library/Fonts/Arial.ttf".to_string(),
                "/Library/Fonts/Arial.ttf".to_string(),
            ]));
            paths.push(("Default".to_string(), vec![
                "/System/Library/Fonts/Helvetica.ttc".to_string(),
                "/System/Library/Fonts/Geneva.ttf".to_string(),
            ]));
        }
        
        #[cfg(target_os = "linux")]
        {
            paths.push(("Arial".to_string(), vec![
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf".to_string(),
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf".to_string(),
            ]));
            paths.push(("Default".to_string(), vec![
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf".to_string(),
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf".to_string(),
            ]));
        }
        
        paths
    }
    
    pub fn apply_watermark(
        &self,
        mut image: DynamicImage,
        settings: &WatermarkSettings,
        metadata: &crate::image_processing::ImageMetadata,
        filename: &str,
    ) -> Result<DynamicImage> {
        if !settings.enabled {
            return Ok(image);
        }
        
        println!("Applying watermark - Type: {:?}, Enabled: {}", settings.watermark_type, settings.enabled);
        
        match settings.watermark_type {
            WatermarkType::Text => {
                if let Some(text_settings) = &settings.text_settings {
                    println!("Applying text watermark with text: '{}'", text_settings.text);
                    // Skip text watermarks if no fonts are loaded
                    if self.fonts.is_empty() {
                        println!("Warning: No fonts loaded, skipping text watermark");
                        return Ok(image);
                    }
                    self.apply_text_watermark(&mut image, settings, text_settings, metadata, filename)?;
                } else {
                    println!("Warning: Text watermark enabled but no text settings provided");
                }
            }
            WatermarkType::Image => {
                if let Some(watermark_path) = &settings.image_path {
                    println!("Applying image watermark from: {}", watermark_path);
                    self.apply_image_watermark(&mut image, settings, watermark_path)?;
                } else {
                    println!("Warning: Image watermark enabled but no image path provided");
                }
            }
        }
        
        Ok(image)
    }
    
    fn apply_text_watermark(
        &self,
        image: &mut DynamicImage,
        settings: &WatermarkSettings,
        text_settings: &TextWatermarkSettings,
        metadata: &crate::image_processing::ImageMetadata,
        filename: &str,
    ) -> Result<()> {
        let text = replace_metadata_placeholders(&text_settings.text, metadata, filename);
        if text.trim().is_empty() {
            return Ok(());
        }
        
        let font = self.fonts.get(&text_settings.font_family)
            .or_else(|| self.fonts.get("Arial"))
            .ok_or_else(|| anyhow::anyhow!("No suitable font found"))?;
        
        let scale = PxScale::from(text_settings.font_size * settings.scale);
        let color = Rgba([
            text_settings.color[0],
            text_settings.color[1], 
            text_settings.color[2],
            (text_settings.color[3] as f32 * settings.opacity) as u8,
        ]);
        
        // Calculate text dimensions
        let (text_width, text_height) = text_size(scale, font, &text);
        
        // Calculate position
        let (x, y) = self.calculate_text_position(
            image.width() as i32,
            image.height() as i32,
            text_width as i32,
            text_height as i32,
            &settings.position,
        );
        
        // Draw shadow if enabled
        if text_settings.shadow {
            let shadow_color = Rgba([
                text_settings.shadow_color[0],
                text_settings.shadow_color[1],
                text_settings.shadow_color[2],
                (text_settings.shadow_color[3] as f32 * settings.opacity) as u8,
            ]);
            
            draw_text_mut(
                image,
                shadow_color,
                x + text_settings.shadow_offset_x,
                y + text_settings.shadow_offset_y,
                scale,
                font,
                &text,
            );
        }
        
        // Draw main text
        draw_text_mut(image, color, x, y, scale, font, &text);
        
        Ok(())
    }
    
    fn apply_image_watermark(
        &self,
        image: &mut DynamicImage,
        settings: &WatermarkSettings,
        watermark_path: &str,
    ) -> Result<()> {
        let watermark = image::open(watermark_path)?;
        
        // Scale watermark
        let scaled_width = (watermark.width() as f32 * settings.scale) as u32;
        let scaled_height = (watermark.height() as f32 * settings.scale) as u32;
        let scaled_watermark = watermark.resize(scaled_width, scaled_height, image::imageops::FilterType::Lanczos3);
        
        // Calculate position
        let (x, y) = self.calculate_image_position(
            image.width() as i32,
            image.height() as i32,
            scaled_width as i32,
            scaled_height as i32,
            &settings.position,
        );
        
        // Apply opacity and blend
        let mut watermark_rgba = scaled_watermark.to_rgba8();
        for pixel in watermark_rgba.pixels_mut() {
            pixel[3] = (pixel[3] as f32 * settings.opacity) as u8;
        }
        
        image::imageops::overlay(image, &watermark_rgba, x as i64, y as i64);
        
        Ok(())
    }
    
    fn calculate_text_position(
        &self,
        img_width: i32,
        img_height: i32,
        text_width: i32,
        text_height: i32,
        position: &WatermarkPosition,
    ) -> (i32, i32) {
        let x = match position.horizontal {
            HorizontalAlignment::Left => position.margin_x,
            HorizontalAlignment::Center => (img_width - text_width) / 2,
            HorizontalAlignment::Right => img_width - text_width - position.margin_x,
        };
        
        let y = match position.vertical {
            VerticalAlignment::Top => position.margin_y,
            VerticalAlignment::Center => (img_height - text_height) / 2,
            VerticalAlignment::Bottom => img_height - text_height - position.margin_y,
        };
        
        (x.max(0), y.max(0))
    }
    
    fn calculate_image_position(
        &self,
        img_width: i32,
        img_height: i32,
        watermark_width: i32,
        watermark_height: i32,
        position: &WatermarkPosition,
    ) -> (i32, i32) {
        let x = match position.horizontal {
            HorizontalAlignment::Left => position.margin_x,
            HorizontalAlignment::Center => (img_width - watermark_width) / 2,
            HorizontalAlignment::Right => img_width - watermark_width - position.margin_x,
        };
        
        let y = match position.vertical {
            VerticalAlignment::Top => position.margin_y,
            VerticalAlignment::Center => (img_height - watermark_height) / 2,
            VerticalAlignment::Bottom => img_height - watermark_height - position.margin_y,
        };
        
        (x.max(0), y.max(0))
    }
}