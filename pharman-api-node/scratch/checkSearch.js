async function testAPI() {
    try {
        const res = await fetch('http://localhost:8000/api/search?critere=Code Produit&valeur=300222');
        const data = await res.json();
        console.log('Search API:', JSON.stringify(data[0], null, 2));
    } catch (err) {
        console.error(err);
    }
}

testAPI();
