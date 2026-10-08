import http from "k6/http";
import { Counter } from "k6/metrics";
import exec from "k6/execution";

const successCount = new Counter("reserve_success");
const soldoutCount = new Counter("reserve_soldout");
const otherCount = new Counter("reserve_other");
const serverErrCount = new Counter("reserve_server_error");

export const options = {
  scenarios: {
    reserve: {
      executor: "shared-iterations",
      vus: 500,
      iterations: 10000,
      maxDuration: "3m",
    },
  },
  thresholds: {
    reserve_success: ["count==100"],
    reserve_soldout: ["count==9900"],
    reserve_other: ["count==0"],
  },
};

const fixtures = JSON.parse(open("./fixtures.json"));

export default function () {
  // __ITER is 0..9999 globally unique across all VUs
  const entry = fixtures.users[exec.scenario.iterationInTest];

  const body = JSON.stringify({
    saleId: fixtures.saleId,
    quantity: 1,
    idempotencyId: entry.idempotencyId,
  });

  const res = http.post("http://localhost:5000/api/v1/reserve", body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${entry.token}`,
    },
  });

  if (res.status >= 200 && res.status < 300) successCount.add(1);
  else if (res.status === 409 || res.status === 410) {
    soldoutCount.add(1);
    // Print the first 5 rejection bodies so we can see the actual error code
    if (soldoutCount.count <= 5) {
      console.log(`REJECT ${res.status}: ${res.body.slice(0, 300)}`);
    }
  } else {
    otherCount.add(1);
    serverErrCount.add(1);
    console.error(`UNEXPECTED ${res.status}: ${res.body.slice(0, 300)}`);
  }
}
