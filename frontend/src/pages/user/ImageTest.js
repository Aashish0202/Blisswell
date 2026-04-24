import React, { useState } from 'react';

/**
 * Simple test page to verify Canvas API image conversion
 * Visit: http://localhost:3000/image-test
 */
const ImageTest = () => {
  const [results, setResults] = useState([]);
  const [testing, setTesting] = useState(false);

  // Test function to convert image to base64
  const testImageConversion = async (imageUrl, name) => {
    const startTime = Date.now();

    try {
      // Method 1: Direct fetch
      console.log(`Testing: ${name}`);
      console.log(`URL: ${imageUrl}`);

      const response = await fetch(imageUrl, { mode: 'cors' });
      console.log(`Fetch status: ${response.status}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`Blob size: ${blob.size} bytes, type: ${blob.type}`);

      // Convert blob to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const endTime = Date.now();

      return {
        name,
        url: imageUrl,
        success: true,
        base64: base64,
        base64Length: base64.length,
        time: `${endTime - startTime}ms`,
        preview: base64.substring(0, 50) + '...'
      };
    } catch (error) {
      return {
        name,
        url: imageUrl,
        success: false,
        error: error.message,
        time: `${Date.now() - startTime}ms`
      };
    }
  };

  // Run all tests
  const runTests = async () => {
    setTesting(true);
    setResults([]);

    const tests = [
      // Test 1: Local backend logo
      {
        url: 'http://localhost:5000/uploads/logos/logo-1772515489082-520246214.png',
        name: 'Logo from local backend'
      },
      // Test 2: Local profile image
      {
        url: 'http://localhost:5000/uploads/profiles/profile-1776430080607-137425076.jpg',
        name: 'Profile image from local backend'
      },
      // Test 3: QR code from external API
      {
        url: 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=test',
        name: 'QR Code (external API)'
      }
    ];

    const testResults = [];
    for (const test of tests) {
      const result = await testImageConversion(test.url, test.name);
      testResults.push(result);
      setResults([...testResults]);
    }

    setTesting(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Canvas API Image Test</h1>
      <p>This tests if images can be converted to base64 for the ID card PDF.</p>

      <button
        onClick={runTests}
        disabled={testing}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          cursor: testing ? 'not-allowed' : 'pointer',
          background: testing ? '#ccc' : '#1F4D4A',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        {testing ? 'Testing...' : 'Run Tests'}
      </button>

      <div style={{ marginTop: '20px' }}>
        {results.map((result, index) => (
          <div
            key={index}
            style={{
              border: `2px solid ${result.success ? 'green' : 'red'}`,
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '8px',
              background: result.success ? '#f0fff0' : '#fff0f0'
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>
              {result.success ? '✅' : '❌'} {result.name}
            </h3>
            <p style={{ margin: '5px 0' }}><strong>URL:</strong> {result.url}</p>
            <p style={{ margin: '5px 0' }}><strong>Time:</strong> {result.time}</p>

            {result.success ? (
              <>
                <p style={{ margin: '5px 0' }}><strong>Base64 Length:</strong> {result.base64Length} chars</p>
                <p style={{ margin: '5px 0' }}><strong>Preview:</strong> {result.preview}</p>

                {/* Show the actual image */}
                <div style={{ marginTop: '10px' }}>
                  <strong>Image Preview:</strong>
                  <div style={{
                    width: '100px',
                    height: '100px',
                    border: '1px solid #ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '5px',
                    background: '#f5f5f5'
                  }}>
                    <img
                      src={result.base64}
                      alt="Converted"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p style={{ margin: '5px 0', color: 'red' }}><strong>Error:</strong> {result.error}</p>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '30px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Make sure your backend is running on <code>localhost:5000</code></li>
          <li>Click "Run Tests" above</li>
          <li>Check if images are successfully converted</li>
        </ol>

        <h4>Common Issues:</h4>
        <ul>
          <li><strong>Failed to fetch:</strong> Backend not running or CORS issue</li>
          <li><strong>404 Not Found:</strong> Image file doesn't exist</li>
          <li><strong>Network error:</strong> Backend not accessible</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageTest;