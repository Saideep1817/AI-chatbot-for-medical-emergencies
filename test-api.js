// Simple API test script
const testAPI = async () => {
  try {
    console.log('Testing chat API...');
    
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Hello, what is diabetes?',
        messages: []
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok && data.message) {
      console.log('\n✅ SUCCESS! API is working correctly!');
      console.log('AI Response:', data.message.substring(0, 200) + '...');
    } else {
      console.log('\n❌ ERROR! API returned an error');
      console.log('Error:', data.error || data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAPI();
