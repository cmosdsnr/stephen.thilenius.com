declare module "*.jpeg";

type UpdateSolarPair = [number, number]; // power, timestamp from server
type UpdateDataPair = [number, number, number]; // speed, duration, timestamp from server
type DataPair = [number, number]; // speed, duration from server
type UData = DataPair[]; // array from server

type WindPoint = {
  timestamp: number;
  speed: number;
  direction: number;
};

type SolarPoint = {
  timestamp: number;
  power: number;
};

type SocketContextType = {
  isReady: boolean;
  readyState: number;
  ESPlist: ESPlist;
  sendMessage: (message: string) => void;
  sendJsonMessage: (data: any) => void;
  subscribe: (topic: Topic) => void;
  unsubscribe: (topic: Topic) => void;
  solarEdgeUpdate: UpdateSolarPair | null;
  ultimeterUpdate: UpdateDataPair | null;
  ultimeterLastUpdate: number;
  sprinklerMessages: any[];
  popSprinklerMessage: () => void;
};

type Topic = "ESPlist" | "sprinkler" | "pong" | "solar" | "powerMeter" | "davis" | "ultimeter";
