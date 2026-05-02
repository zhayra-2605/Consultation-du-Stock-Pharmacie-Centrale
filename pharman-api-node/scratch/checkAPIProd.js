async function testAPI() {
    try {
        const res2 = await fetch('http://localhost:8000/api/stats/300222');
        const stats = await res2.json();
        console.log('Stats API for Prod:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testAPI();
