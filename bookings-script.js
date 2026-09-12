// test-bookings.js
// Run with: node test-bookings.js

const ENDPOINT = "http://localhost:5000/api/v1/bookings";

const BODY = {
  saleId: "a0399729-bddb-4f3f-b051-985ce6b7c6a9",
  quantity: 1,
};

const users = [
  {
    email: "Zack_Hansen5@gmail.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMTI4MjIwOC05NjkwLTQzNmMtOTc3MC1hZjM1NDkzNmRmODgiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMjg4NSwiZXhwIjoxNzg5ODE3Njg1fQ.eW9PXa1rpWq59uUgb379w7ddzc2OCyXY3b-ito2neis",
  },
  {
    email: "Lexus_Gerlach13@yahoo.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwYTcwNDA1ZC1lNzkyLTQ2NGYtOWQ3MS0yNzYxMTc5YTViYzEiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMjk0MSwiZXhwIjoxNzg5ODE3NzQxfQ.Zv6N1tHV5PtbrlHuu-yHMwylAvSNyYIj29xrfrlebuo",
  },
  {
    email: "Salvador.Abshire-Hudson@gmail.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyYmE4N2MwZi05MmMxLTQ4NzYtOTAxOS1lNjAwMjQ4NzUxZTMiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMjk3OCwiZXhwIjoxNzg5ODE3Nzc4fQ.PZ02zWX8VT021UWj1EGiUkD2UG_GOp2hKdWB-Wlmal4",
  },
  {
    email: "Aurelie.Cummings@yahoo.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMjJiODdhNC0xYTA0LTQyYmItOWIzYy1jZmE4ZGYyMWJhNDMiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzAxMywiZXhwIjoxNzg5ODE3ODEzfQ.922aVEXoF_ZLWW46RKnOJ6TQ5UcfJ3UflQvzq7npsEo",
  },
  {
    email: "Meda_Carter2@gmail.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzZjdjZGI5MC02YzEzLTRmYTgtOGQzOS1iYTBiNGMzZWYzMWYiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzAzMiwiZXhwIjoxNzg5ODE3ODMyfQ.w4Z4FmSsKS6yPOeZw80C152pAGSjatLKObmXmNoh9jU",
  },
  {
    email: "Drake_Gleichner@hotmail.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0MWJhYmY1OC1lNGYwLTQ3NGYtODY5Mi1iYjk4MWU1ZjAxNjIiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzE1NiwiZXhwIjoxNzg5ODE3OTU2fQ.MAOhv1d2i_fE1JF9y3kuzZNg5OdSZcy54gQ9kEG_4K8",
  },
  {
    email: "Nadine.Lindgren@gmail.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3MjkxMmY0NC03YTMzLTQ4YzMtODYwNS1lMWU0ZmEwYjMxMTkiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzE4NCwiZXhwIjoxNzg5ODE3OTg0fQ.Ea2V9UFaKfpI-BK6Te4xC9OUAjesaaLKH12ovbmBVgc",
  },
  {
    email: "Janie_Jenkins@hotmail.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYjVkMDRjYS1mZmQyLTRkNjAtYTIwOS1hM2RhZTQ1MGZmNjQiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzIxMSwiZXhwIjoxNzg5ODE4MDExfQ.lzv64MU8OxhFVZ5OI3fYXSdofPlH77hUXTcRPawSNxc",
  },
  {
    email: "Margarette_Padberg8@yahoo.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZWU0MThkYS0xMWUwLTRjZjUtYWY0Yi03MWNiZDRmYmFkMDAiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzI1OSwiZXhwIjoxNzg5ODE4MDU5fQ.YUhmErFlt7RQ9R_fxrNT7TLAJFfbBRi9DoALCYr1IzY",
  },
  {
    email: "Immanuel.Brakus82@yahoo.com",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJkYmI0MTc2OS0yN2ZjLTRhOTUtYWIwMy0xNzZhN2Q3MTEwYzMiLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc4OTIxMzI4NSwiZXhwIjoxNzg5ODE4MDg1fQ.KTH_IOcIbH3v6HVsmqef9dVi8_qmW_CxrnH08AYwOho",
  },
];

// ANSI colors so success/error pop out
const c = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
};

async function fireRequest(user, index) {
  const label = `[#${String(index + 1).padStart(2, "0")}] ${user.email}`;
  const started = Date.now();

  try {
    const start = performance.now();

    console.log(`START #${index + 1}`);

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify(BODY),
    });

    console.log(
      `END #${index + 1} ${(performance.now() - start).toFixed(0)}ms`,
    );

    const ms = Date.now() - started;
    let payload;
    const text = await res.text();
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }

    if (res.ok) {
      console.log(
        `${c.green}${c.bold}✔ SUCCESS${c.reset} ${c.cyan}${label}${c.reset} ` +
          `${c.gray}(${res.status} in ${ms}ms)${c.reset}`,
      );
      console.log(`${c.gray}   → ${JSON.stringify(payload)}${c.reset}`);
    } else {
      console.log(
        `${c.red}${c.bold}✘ FAILED ${c.reset} ${c.cyan}${label}${c.reset} ` +
          `${c.gray}(${res.status} in ${ms}ms)${c.reset}`,
      );
      console.log(`${c.gray}   → ${JSON.stringify(payload)}${c.reset}`);
    }

    return { user: user.email, ok: res.ok, status: res.status, ms, payload };
  } catch (err) {
    const ms = Date.now() - started;
    console.log(
      `${c.red}${c.bold}✘ ERROR  ${c.reset} ${c.cyan}${label}${c.reset} ` +
        `${c.gray}(${ms}ms)${c.reset}`,
    );
    console.log(`${c.gray}   → ${err.message}${c.reset}`);
    return {
      user: user.email,
      ok: false,
      status: "NETWORK_ERROR",
      ms,
      error: err.message,
    };
  }
}

async function main() {
  console.log(
    `${c.bold}🚀 Firing ${users.length} parallel POST requests to ${ENDPOINT}${c.reset}\n`,
  );

  const t0 = Date.now();

  // Fire all at once
  const results = await Promise.all(users.map((u, i) => fireRequest(u, i)));

  const totalMs = Date.now() - t0;

  // Summary
  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;

  console.log(`\n${c.bold}${"─".repeat(60)}${c.reset}`);
  console.log(
    `${c.bold}Summary:${c.reset} ` +
      `${c.green}${success} succeeded${c.reset}, ` +
      `${c.red}${failed} failed${c.reset} ` +
      `${c.gray}(total wall time: ${totalMs}ms)${c.reset}`,
  );

  // Per-status breakdown
  const byStatus = {};
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  console.log(`${c.bold}Status codes:${c.reset}`, byStatus);
  console.log(`${c.bold}${"─".repeat(60)}${c.reset}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
