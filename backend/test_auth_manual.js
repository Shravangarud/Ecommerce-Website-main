// Native fetch used

const login = async (email, password) => {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        console.log(`Login Status: ${response.status}`);
        if (response.ok) {
            console.log('Login Successful:', data.token ? 'Token received' : 'No token');
        } else {
            console.log('Login Failed:', data.message);
        }
    } catch (error) {
        console.error('Fetch Error:', error.message);
    }
};

login('test@example.com', 'test123'); // From seed.js
