async function test() {
  try {
    // 1. Simulate login to get token
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: 'superadmin@sistema.com', // Attempt standard credentials
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.accessToken;
    if (!token) throw new Error("Could not get token. " + JSON.stringify(loginData));

    // 2. Try to create discount
    console.log("Creating discount...");
    const createRes = await fetch('http://localhost:5001/api/discounts', {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        tenantId: 1,
        branchId: 1,
        name: "Test Multi Resource",
        type: "PERCENTAGE",
        value: 10,
        conditionType: "PROMO_CODE",
        code: "TESTMULTI",
        resourceIds: [1, 2]
      })
    });
    const createData = await createRes.json();
    console.log("Success!", createData);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
