type PowerRecord = {
  hour: Date;
  power: number[];
  efficiency: number;
  totalEnergy: number;
};

type SolarFileData = {
  hour: number; // hrs since epoch
  power: number[]; //60*4 per hr, 15s
  efficiency: number;
  totalEnergy: number;
};

type MeterFileData = {
  hour: number; // hrs since epoch
  amperages: [number[]]; // [6][60] 1 per min, 6 channels
};

type SolarGraphData = {
  start: number; // seconds since epoch
  power: number[];
};

type MeterGraphData = {
  start: number; // seconds since epoch
  amperage: number[number[]]; // [60][6] 1 per min, 6 channels, transposed
};

type FsType = [stat: fs.stat, file: fs.file];

type Topic = "ESPlist" | "sprinkler" | "pong" | "solar" | "powerMeter" | "davis" | "ultimeter" | "meter";
