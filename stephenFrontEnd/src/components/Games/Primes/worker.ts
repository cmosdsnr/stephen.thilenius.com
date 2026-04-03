import { scanRange } from "./evaluate";

self.addEventListener(
  "message",
  function (e) {
    const results = scanRange(e.data[0], e.data[1], e.data[2]);
    self.postMessage({ type: "complete", results });
    self.close();
  },
  false
);
