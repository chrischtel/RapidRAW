export const getDefaultWatermarkSettings = () => ({
  enabled: false,
  watermarkType: 'text',
  position: {
    horizontal: 'Right',
    vertical: 'Bottom',
    marginX: 50,
    marginY: 50,
  },
  scale: 1.0,
  opacity: 0.8,
  textSettings: {
    text: '© {photographer} - {camera_make} {camera_model} - {focal_length}mm f/{aperture} {shutter_speed}s ISO{iso}',
    fontSize: 24.0,
    color: [255, 255, 255, 255],
    fontFamily: 'Arial',
    bold: false,
    italic: false,
    shadow: true,
    shadowColor: [0, 0, 0, 128],
    shadowOffsetX: 1,
    shadowOffsetY: 1,
  },
  imagePath: null,
});

export const WATERMARK_METADATA_PLACEHOLDERS = [
  { placeholder: '{photographer}', description: 'Photographer name' },
  { placeholder: '{camera_make}', description: 'Camera make' },
  { placeholder: '{camera_model}', description: 'Camera model' },
  { placeholder: '{lens_model}', description: 'Lens model' },
  { placeholder: '{aperture}', description: 'Aperture (f-stop)' },
  { placeholder: '{shutter_speed}', description: 'Shutter speed' },
  { placeholder: '{iso}', description: 'ISO sensitivity' },
  { placeholder: '{focal_length}', description: 'Focal length (mm)' },
  { placeholder: '{date_time}', description: 'Date and time' },
  { placeholder: '{filename}', description: 'File name' },
];

export const WATERMARK_FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'
];

export const WATERMARK_ALIGNMENTS = {
  horizontal: [
    { value: 'Left', label: 'Left' },
    { value: 'Center', label: 'Center' },
    { value: 'Right', label: 'Right' },
  ],
  vertical: [
    { value: 'Top', label: 'Top' },
    { value: 'Center', label: 'Center' },
    { value: 'Bottom', label: 'Bottom' },
  ],
};
