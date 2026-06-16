export interface GarmentTemplate {
  type: string;
  fields: string[];
}

export const DEFAULT_GARMENTS: GarmentTemplate[] = [
  {
    type: 'Dress',
    fields: [
      'Upper Chest', 'Chest', 'Waist', 'Hip', 'Slit', 'Length',
      'Harmol', 'Sleeve Length', 'Sleeve Open', 'Shoulder', 'Front', 'Back',
    ],
  },
  {
    type: 'Pant',
    fields: ['Length', 'Bottom Open', 'Waist', 'Hip', 'Thighs'],
  },
  {
    type: 'Blouse',
    fields: [
      'Length', 'Back Open', 'Front Open', 'Shoulder', 'Harmol',
      'Sleeve Length', 'Sleeve Open', 'Nipple Point', 'Cup Size', 'Waist',
    ],
  },
  {
    type: 'Frock',
    fields: [
      'Full Length', 'Middle Length', 'Front', 'Back',
      'Harmol', 'Sleeve Length', 'Sleeve Open', 'Nipple Point',
    ],
  },
  {
    type: 'Lehenga',
    fields: ['Waist', 'Length'],
  },
];

export type MeasurementUnit = 'in' | 'cm';
export const UNIT_LABELS: Record<MeasurementUnit, string> = {
  in: 'inches',
  cm: 'cm',
};
