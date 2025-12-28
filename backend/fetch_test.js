// Native fetch used
// Actually node 18+ has native fetch. Let's try native fetch.

const testApi = async () => {
    try {
        console.log('Testing API...');
        const res = await fetch('http://localhost:5000/api/products');
        if (res.ok) {
            const data = await res.json();
            // Handle both array and paginated object
            const count = Array.isArray(data) ? data.length : (data.products ? data.products.length : 0);
            console.log(`API Success! fetched ${count} products.`);
        } else {
            console.log(`API Error: ${res.status}`);
        }
    } catch (err) {
        console.log(`Fetch failed: ${err.message}`);
    }
};

testApi();
