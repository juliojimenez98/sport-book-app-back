async function test() {
  try {
    const res = await fetch('http://localhost:5001/api/public/discounts/calculate', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: 2,
        branchId: 1,
        resourceId: 1, 
        startAt: "2026-02-24T18:00:00",
        endAt: "2026-02-24T19:00:00"
      })
    });
    const logData = await res.json();
    console.log(JSON.stringify(logData, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
