async function testAPI() {
    try {
        const res1 = await fetch('http://localhost:8000/api/stock-summary-besoin/2-5243');
        const summary = await res1.json();
        console.log('Stock Summary API:', JSON.stringify(summary, null, 2));

        const res2 = await fetch('http://localhost:8000/api/stats-besoin/2-5243');
        const stats = await res2.json();
        console.log('Stats API:', JSON.stringify(stats, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testAPI();
