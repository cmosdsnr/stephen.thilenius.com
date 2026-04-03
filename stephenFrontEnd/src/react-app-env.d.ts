declare module "*.mp3";
declare module "*.png" {
  const value: any;
  export default value;
}
declare module "*.jpg" {
  const value: any;
  export default value;
}

// declare module "react-charts" {
//   export const Chart: any;
//   export type AxisOptions<BinType> = any;
// }

type BinType = [number, number];

type Series = {
  label: string;
  data: BinType[];
};

type ESPlist = {
  [name: string]: {
    elapsed?: string;
    date: Date;
    ip: string;
  };
};

type SprinklerMessage = {
  command: string;
  code: number;
  channel: number;
  day: number;
  item: number;
  status: number;
  start: number;
  watering: number;
  index: number;
  value: string;
  variable: number;
  event: string;
};
